"""Python server for the Workout Together application."""

from __future__ import annotations

import copy
import json
import os
import random
import threading
import uuid
from pathlib import Path
from typing import Any

from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room, request


ROOT = Path(__file__).resolve().parent
PUBLIC_DIR = ROOT / "public"
DATA_DIR = ROOT / "data"

with (DATA_DIR / "exercise_guide.json").open(encoding="utf-8") as file:
    EXERCISE_GUIDE = json.load(file)

with (DATA_DIR / "workout_templates.json").open(encoding="utf-8") as file:
    WORKOUT_TEMPLATES = json.load(file)

AVATAR_COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
    "#F0B27A", "#82E0AA", "#F1948A", "#AED6F1", "#D7BDE2",
]

app = Flask(__name__, static_folder=None)
socketio = SocketIO(app, async_mode="threading")

# A single Gunicorn worker keeps this in-memory state shared by every socket.
rooms: dict[str, dict[str, Any]] = {}
users: dict[str, dict[str, str]] = {}
state_lock = threading.RLock()


@app.get("/")
def index():
    return send_from_directory(PUBLIC_DIR, "index.html")


@app.get("/<path:filename>")
def public_file(filename: str):
    return send_from_directory(PUBLIC_DIR, filename)


def pick_color() -> str:
    return random.choice(AVATAR_COLORS)


def build_room_summary(room: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": room["id"],
        "name": room["name"],
        "host": room["host"],
        "workout": copy.deepcopy(room["workout"]),
        "participants": [
            {
                "id": participant["id"],
                "name": participant["name"],
                "avatarColor": participant["avatarColor"],
                "ready": participant["ready"],
                "completedExercises": participant["completedExercises"],
            }
            for participant in room["participants"]
        ],
        "state": room["state"],
        "currentExerciseIdx": room["currentExerciseIdx"],
        "timerSeconds": room["timerSeconds"],
        "isRest": room["isRest"],
        "maxParticipants": room["maxParticipants"],
    }


@socketio.on("connect")
def handle_connect():
    emit("templates", WORKOUT_TEMPLATES)
    emit("exercise-guide", EXERCISE_GUIDE)


@socketio.on("list-rooms")
def handle_list_rooms():
    with state_lock:
        available = [
            build_room_summary(room)
            for room in rooms.values()
            if len(room["participants"]) < room["maxParticipants"]
        ]
    emit("room-list", available)


@socketio.on("create-room")
def handle_create_room(data):
    data = data or {}
    sid = request.sid
    room_id = uuid.uuid4().hex[:8]
    color = pick_color()
    participant = {
        "id": sid,
        "name": data.get("userName", ""),
        "avatarColor": color,
        "ready": False,
        "completedExercises": 0,
    }
    room = {
        "id": room_id,
        "name": data.get("roomName", ""),
        "host": sid,
        "workout": data.get("workout") or {},
        "participants": [participant],
        "state": "waiting",
        "currentExerciseIdx": 0,
        "timerSeconds": 0,
        "isRest": False,
        "maxParticipants": data.get("maxParticipants") or 10,
        "timerRunning": False,
    }

    with state_lock:
        rooms[room_id] = room
        users[sid] = {"name": participant["name"], "roomId": room_id, "avatarColor": color}

    join_room(room_id)
    emit("room-joined", build_room_summary(room))
    socketio.emit("rooms-updated")


@socketio.on("join-room")
def handle_join_room(data):
    data = data or {}
    sid = request.sid
    room_id = data.get("roomId", "")
    error = None

    with state_lock:
        room = rooms.get(room_id)
        if room is None:
            error = "Room not found."
        elif len(room["participants"]) >= room["maxParticipants"]:
            error = "Room is full."
        elif room["state"] != "waiting":
            error = "Workout already in progress."
        else:
            color = pick_color()
            participant = {
                "id": sid,
                "name": data.get("userName", ""),
                "avatarColor": color,
                "ready": False,
                "completedExercises": 0,
            }
            room["participants"].append(participant)
            users[sid] = {"name": participant["name"], "roomId": room_id, "avatarColor": color}
            summary = build_room_summary(room)

    if error:
        emit("error-msg", error)
        return

    join_room(room_id)
    emit("room-joined", summary)
    socketio.emit("participant-update", summary, to=room_id)
    socketio.emit("chat-msg", {"system": True, "text": f"{participant['name']} joined the room 💪"}, to=room_id)
    socketio.emit("rooms-updated")


@socketio.on("toggle-ready")
def handle_toggle_ready():
    sid = request.sid
    with state_lock:
        user = users.get(sid)
        room = rooms.get(user["roomId"]) if user else None
        if room is None:
            return
        participant = next((item for item in room["participants"] if item["id"] == sid), None)
        if participant is None:
            return
        participant["ready"] = not participant["ready"]
        summary = build_room_summary(room)
        room_id = room["id"]
    socketio.emit("participant-update", summary, to=room_id)


def run_workout_timer(room_id: str) -> None:
    while True:
        socketio.sleep(1)
        final_summary = None
        finished = False

        with state_lock:
            room = rooms.get(room_id)
            if room is None:
                return
            if room["state"] != "active":
                continue

            room["timerSeconds"] -= 1
            if room["timerSeconds"] <= 0:
                if room["isRest"]:
                    room["currentExerciseIdx"] += 1
                    if room["currentExerciseIdx"] >= len(room["workout"].get("exercises", [])):
                        room["state"] = "finished"
                        room["timerRunning"] = False
                        final_summary = build_room_summary(room)
                        finished = True
                    else:
                        room["isRest"] = False
                        exercise = room["workout"]["exercises"][room["currentExerciseIdx"]]
                        room["timerSeconds"] = exercise["duration"]
                else:
                    room["isRest"] = True
                    exercise = room["workout"]["exercises"][room["currentExerciseIdx"]]
                    room["timerSeconds"] = exercise["rest"]
                    for participant in room["participants"]:
                        participant["completedExercises"] += 1

            if not finished:
                tick = {
                    "timerSeconds": room["timerSeconds"],
                    "currentExerciseIdx": room["currentExerciseIdx"],
                    "isRest": room["isRest"],
                    "state": room["state"],
                    "participants": [
                        {
                            "id": participant["id"],
                            "name": participant["name"],
                            "avatarColor": participant["avatarColor"],
                            "completedExercises": participant["completedExercises"],
                        }
                        for participant in room["participants"]
                    ],
                }

        if finished:
            socketio.emit("workout-state", final_summary, to=room_id)
            socketio.emit(
                "chat-msg",
                {"system": True, "text": "🎉 Workout complete! Great job everyone!"},
                to=room_id,
            )
            return

        socketio.emit("timer-tick", tick, to=room_id)


@socketio.on("start-workout")
def handle_start_workout():
    sid = request.sid
    with state_lock:
        user = users.get(sid)
        room = rooms.get(user["roomId"]) if user else None
        if room is None or room["host"] != sid or room["timerRunning"]:
            return
        exercises = room["workout"].get("exercises", [])
        if not exercises:
            return
        room["state"] = "active"
        room["currentExerciseIdx"] = 0
        room["isRest"] = False
        room["timerSeconds"] = exercises[0]["duration"]
        room["timerRunning"] = True
        room_id = room["id"]
        summary = build_room_summary(room)

    socketio.emit("workout-state", summary, to=room_id)
    socketio.emit("chat-msg", {"system": True, "text": "🏋️ Workout started! Let's go!"}, to=room_id)
    socketio.start_background_task(run_workout_timer, room_id)


@socketio.on("pause-workout")
def handle_pause_workout():
    sid = request.sid
    with state_lock:
        user = users.get(sid)
        room = rooms.get(user["roomId"]) if user else None
        if room is None or room["host"] != sid:
            return
        if room["state"] == "active":
            room["state"] = "paused"
            message = "⏸️ Workout paused"
        elif room["state"] == "paused":
            room["state"] = "active"
            message = "▶️ Workout resumed!"
        else:
            return
        summary = build_room_summary(room)
        room_id = room["id"]

    socketio.emit("workout-state", summary, to=room_id)
    socketio.emit("chat-msg", {"system": True, "text": message}, to=room_id)


@socketio.on("reaction")
def handle_reaction(emoji):
    sid = request.sid
    with state_lock:
        user = users.get(sid)
        if user is None:
            return
        room_id = user["roomId"]
        payload = {"userId": sid, "userName": user["name"], "emoji": emoji}
    socketio.emit("reaction", payload, to=room_id)


@socketio.on("chat-msg")
def handle_chat_message(message):
    sid = request.sid
    with state_lock:
        user = users.get(sid)
        if user is None:
            return
        room_id = user["roomId"]
        payload = {"userName": user["name"], "text": message, "avatarColor": user["avatarColor"]}
    socketio.emit("chat-msg", payload, to=room_id)


def leave_current_room(sid: str) -> None:
    with state_lock:
        user = users.get(sid)
        if user is None:
            return
        room_id = user["roomId"]
        room = rooms.get(room_id)
        if room is None:
            users.pop(sid, None)
            return

        room["participants"] = [item for item in room["participants"] if item["id"] != sid]
        messages = [{"system": True, "text": f"{user['name']} left the room"}]

        if not room["participants"]:
            rooms.pop(room_id, None)
            summary = None
        else:
            if room["host"] == sid:
                room["host"] = room["participants"][0]["id"]
                messages.append(
                    {"system": True, "text": f"{room['participants'][0]['name']} is now the host 👑"}
                )
            summary = build_room_summary(room)
        users.pop(sid, None)

    for message in messages:
        socketio.emit("chat-msg", message, to=room_id)
    if summary is not None:
        socketio.emit("participant-update", summary, to=room_id)
    socketio.emit("rooms-updated")


@socketio.on("leave-room")
def handle_leave_room():
    sid = request.sid
    with state_lock:
        user = users.get(sid)
        room_id = user["roomId"] if user else None
    leave_current_room(sid)
    if room_id:
        leave_room(room_id)


@socketio.on("disconnect")
def handle_disconnect(reason=None):
    leave_current_room(request.sid)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "3000")))
