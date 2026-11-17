/* ═══════════════════════════════════════════════════════════════
   Workout Together – Client
   ═══════════════════════════════════════════════════════════════ */
const socket = io();

// ── DOM refs ──────────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const screens = { lobby: $("#screen-lobby"), waiting: $("#screen-waiting"), workout: $("#screen-workout"), finished: $("#screen-finished") };

let templates = [];
let selectedTemplate = null;
let currentRoom = null;
let myId = null;
let totalDuration = 0;
let exerciseGuide = {};

// 2D Coach Animators
let workoutAnimator = null;
let modalAnimator = null;

function initAnimators() {
  const c1 = document.getElementById('coach-canvas');
  if (c1 && window.ExerciseAnimator) {
    workoutAnimator = new ExerciseAnimator(c1);
  }
  const c2 = document.getElementById('modal-coach-canvas');
  if (c2 && window.ExerciseAnimator) {
    modalAnimator = new ExerciseAnimator(c2);
  }
}
window.addEventListener('DOMContentLoaded', initAnimators);

// ── Helpers ───────────────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
  window.scrollTo(0, 0);
}

function getName() {
  const v = $("#inp-name").value.trim();
  if (!v) { $("#inp-name").focus(); $("#inp-name").style.borderColor = "var(--danger)"; return null; }
  $("#inp-name").style.borderColor = "";
  return v;
}

// ── Tabs ──────────────────────────────────────────────────────
$$(".tab").forEach((t) => {
  t.addEventListener("click", () => {
    $$(".tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    $$(".tab-panel").forEach((p) => p.classList.remove("active"));
    $(`#panel-${t.dataset.tab}`).classList.add("active");
    if (t.dataset.tab === "join") socket.emit("list-rooms");
  });
});

// ── Templates ─────────────────────────────────────────────────
socket.on("templates", (list) => {
  templates = list;
  const container = $("#template-list");
  container.innerHTML = "";
  list.forEach((t, i) => {
    const div = document.createElement("div");
    div.className = "template-option";
    div.innerHTML = `<h4>${t.name}</h4><p>${t.exercises.length} exercises · ${t.exercises.reduce((a, e) => a + e.duration + e.rest, 0)}s total</p>`;
    div.addEventListener("click", () => {
      $$(".template-option").forEach((x) => x.classList.remove("selected"));
      div.classList.add("selected");
      selectedTemplate = i;
    });
    container.appendChild(div);
  });
});

// ── Room list ─────────────────────────────────────────────────
socket.emit("list-rooms");
socket.on("rooms-updated", () => socket.emit("list-rooms"));

socket.on("room-list", (list) => {
  const container = $("#room-list");
  if (!list.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">📡</span><p>No open rooms yet — create one!</p></div>`;
    return;
  }
  container.innerHTML = "";
  list.forEach((r) => {
    const div = document.createElement("div");
    div.className = "room-card";
    div.innerHTML = `
      <div class="room-card-info">
        <h3>${esc(r.name)}</h3>
        <span>${r.workout.name} · ${r.workout.exercises.length} exercises</span>
      </div>
      <div class="room-card-count">${r.participants.length}/${r.maxParticipants}</div>`;
    div.addEventListener("click", () => {
      const name = getName();
      if (!name) return;
      socket.emit("join-room", { userName: name, roomId: r.id });
    });
    container.appendChild(div);
  });
});

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// ── Theme toggle ──────────────────────────────────────────────
function loadTheme() {
  const saved = localStorage.getItem("workout-theme");
  if (saved === "light") document.body.classList.add("light");
}
loadTheme();

$("#btn-theme").addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("workout-theme", document.body.classList.contains("light") ? "light" : "dark");
});

// ── Exercise guide ────────────────────────────────────────────
socket.on("exercise-guide", (guide) => { exerciseGuide = guide; });

function openHowTo(exerciseName) {
  const guide = exerciseGuide[exerciseName];
  if (!guide) return;
  
  $("#modal-emoji").textContent = guide.emoji || "💪";
  $("#modal-title").textContent = exerciseName;

  if (modalAnimator) {
    modalAnimator.setExercise(exerciseName, false);
  }
  
  const muscles = $("#modal-muscles");
  muscles.innerHTML = "";
  (guide.muscles || []).forEach((m) => {
    const tag = document.createElement("span");
    tag.className = "muscle-tag";
    tag.textContent = m;
    muscles.appendChild(tag);
  });
  
  const steps = $("#modal-steps");
  steps.innerHTML = "";
  (guide.steps || []).forEach((s) => {
    const li = document.createElement("li");
    li.textContent = s;
    steps.appendChild(li);
  });
  
  const tips = $("#modal-tips");
  tips.innerHTML = "";
  (guide.tips || []).forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    tips.appendChild(li);
  });
  
  $("#modal-howto").classList.remove("hidden");
}

function closeHowTo() {
  $("#modal-howto").classList.add("hidden");
}

$("#btn-close-modal").addEventListener("click", closeHowTo);
$("#modal-howto").addEventListener("click", (e) => { if (e.target === e.currentTarget) closeHowTo(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeHowTo(); });

// How-to button on workout screen
$("#btn-how-to").addEventListener("click", () => {
  if (!currentRoom) return;
  const ex = currentRoom.workout.exercises[currentRoom.currentExerciseIdx];
  if (ex) openHowTo(ex.name);
});

// ── Create room ───────────────────────────────────────────────
$("#btn-create").addEventListener("click", () => {
  const name = getName();
  if (!name) return;
  const roomName = $("#inp-room-name").value.trim() || `${name}'s Room`;
  if (selectedTemplate === null) { alert("Pick a workout!"); return; }
  const workout = templates[selectedTemplate];
  const max = parseInt($("#inp-max").value) || 8;
  socket.emit("create-room", { userName: name, roomName, workout, maxParticipants: max });
});

// ── Room joined ───────────────────────────────────────────────
socket.on("room-joined", (room) => {
  currentRoom = room;
  myId = socket.id;
  enterWaitingRoom(room);
});

function enterWaitingRoom(room) {
  $("#room-title").textContent = room.name;
  $("#room-code").textContent = `ID: ${room.id}`;
  $("#workout-name").textContent = room.workout.name;

  const chips = $("#exercise-preview");
  chips.innerHTML = "";
  room.workout.exercises.forEach((e) => {
    const sp = document.createElement("span");
    sp.className = "exercise-chip";
    sp.textContent = `${e.name} (${e.duration}s)`;
    sp.title = "Click to see instructions";
    sp.addEventListener("click", () => openHowTo(e.name));
    chips.appendChild(sp);
  });

  totalDuration = room.workout.exercises.reduce((a, e) => a + e.duration, 0);
  renderParticipantsWaiting(room);
  showScreen("waiting");
}

function renderParticipantsWaiting(room) {
  const grid = $("#participants-waiting");
  grid.innerHTML = "";
  room.participants.forEach((p) => {
    const div = document.createElement("div");
    div.className = "participant-card";
    div.innerHTML = `
      ${p.id === room.host ? '<span class="host-badge">HOST</span>' : ""}
      <div class="participant-avatar" style="background:${p.avatarColor}">${p.name.charAt(0).toUpperCase()}</div>
      <div class="name">${esc(p.name)}</div>
      <div class="status ${p.ready ? "status-ready" : "status-waiting"}">${p.ready ? "✅ Ready" : "⏳ Not ready"}</div>`;
    grid.appendChild(div);
  });

  // Show start button only for host when all are ready
  const isHost = room.host === myId;
  const allReady = room.participants.every((p) => p.ready);
  $("#btn-start").classList.toggle("hidden", !(isHost && allReady && room.participants.length > 0));
  
  // Update ready button text
  const me = room.participants.find((p) => p.id === myId);
  if (me) {
    $("#btn-ready").textContent = me.ready ? "Not Ready ✋" : "I'm Ready ✋";
    $("#btn-ready").className = me.ready ? "btn btn-danger btn-block" : "btn btn-accent btn-block";
  }
}

// ── Participant updates ───────────────────────────────────────
socket.on("participant-update", (room) => {
  currentRoom = room;
  if (screens.waiting.classList.contains("active")) renderParticipantsWaiting(room);
});

// ── Ready / Start / Leave ─────────────────────────────────────
$("#btn-ready").addEventListener("click", () => socket.emit("toggle-ready"));
$("#btn-start").addEventListener("click", () => socket.emit("start-workout"));
$("#btn-leave").addEventListener("click", () => { socket.emit("leave-room"); showScreen("lobby"); socket.emit("list-rooms"); });
$("#btn-leave-workout").addEventListener("click", () => { socket.emit("leave-room"); showScreen("lobby"); socket.emit("list-rooms"); });

// ── Workout state ─────────────────────────────────────────────
socket.on("workout-state", (room) => {
  currentRoom = room;
  if (room.state === "active" || room.state === "paused") {
    enterWorkoutScreen(room);
  } else if (room.state === "finished") {
    enterFinishedScreen(room);
  }
});

function enterWorkoutScreen(room) {
  showScreen("workout");
  updateWorkoutUI(room);
}

function updateWorkoutUI(data) {
  const ex = currentRoom.workout.exercises[data.currentExerciseIdx];
  const isRest = data.isRest;

  $("#exercise-name").textContent = isRest ? "Rest 😮‍💨" : ex.name;
  const phaseLabel = $("#label-phase");
  phaseLabel.textContent = isRest ? "REST" : "EXERCISE";
  phaseLabel.className = `phase-label ${isRest ? "rest" : "exercise"}`;

  // Update 2D Coach
  if (workoutAnimator) {
    workoutAnimator.setExercise(ex ? ex.name : "", isRest);
  }

  $("#timer-text").textContent = data.timerSeconds;

  // Ring progress
  const totalSec = isRest ? ex.rest : ex.duration;
  const fraction = data.timerSeconds / totalSec;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - fraction);
  const ring = $("#ring-progress");
  ring.style.strokeDashoffset = offset;
  ring.classList.toggle("rest", isRest);

  // Progress
  $("#workout-progress").textContent = `${data.currentExerciseIdx + 1} / ${currentRoom.workout.exercises.length}`;

  // Next up
  const nextIdx = data.currentExerciseIdx + (isRest ? 0 : 1);
  if (nextIdx < currentRoom.workout.exercises.length && !isRest) {
    const nx = currentRoom.workout.exercises[nextIdx];
    $("#next-up").textContent = "";
  } else if (isRest && data.currentExerciseIdx + 1 < currentRoom.workout.exercises.length) {
    $("#next-up").textContent = `Next: ${currentRoom.workout.exercises[data.currentExerciseIdx + 1].name}`;
  } else {
    $("#next-up").textContent = isRest ? "Last exercise coming up!" : "";
  }

  // Pause button
  if (currentRoom.host === myId) {
    $("#btn-pause").classList.remove("hidden");
    $("#btn-pause").textContent = data.state === "paused" ? "▶️" : "⏸️";
  } else {
    $("#btn-pause").classList.add("hidden");
  }

  // Participant strip
  if (data.participants) {
    const strip = $("#participants-workout");
    strip.innerHTML = "";
    data.participants.forEach((p) => {
      const div = document.createElement("div");
      div.className = "p-strip-item";
      div.innerHTML = `
        <div class="p-strip-avatar" style="background:${p.avatarColor}">${p.name.charAt(0).toUpperCase()}</div>
        <div class="p-strip-name">${esc(p.name)}</div>
        <div class="p-strip-score">${p.completedExercises} ✓</div>`;
      strip.appendChild(div);
    });
  }
}

// ── Timer tick ────────────────────────────────────────────────
socket.on("timer-tick", (data) => {
  if (data.state === "finished") {
    // fetch full room state
    currentRoom.state = "finished";
    enterFinishedScreen({ ...currentRoom, participants: data.participants });
    return;
  }
  currentRoom.currentExerciseIdx = data.currentExerciseIdx;
  currentRoom.isRest = data.isRest;
  currentRoom.timerSeconds = data.timerSeconds;
  currentRoom.state = data.state;
  updateWorkoutUI(data);
});

// ── Pause ─────────────────────────────────────────────────────
$("#btn-pause").addEventListener("click", () => socket.emit("pause-workout"));

// ── Reactions ─────────────────────────────────────────────────
$$(".reaction-btn").forEach((b) => {
  b.addEventListener("click", () => socket.emit("reaction", b.dataset.emoji));
});

socket.on("reaction", ({ userName, emoji }) => {
  const canvas = $("#reaction-canvas");
  const el = document.createElement("div");
  el.className = "floating-emoji";
  el.textContent = emoji;
  el.style.left = Math.random() * 80 + 10 + "%";
  el.style.bottom = "20%";
  canvas.appendChild(el);
  setTimeout(() => el.remove(), 1600);
});

// ── Chat ──────────────────────────────────────────────────────
socket.on("chat-msg", (msg) => {
  const container = $("#chat-messages");
  const div = document.createElement("div");
  if (msg.system) {
    div.className = "chat-msg system";
    div.textContent = msg.text;
  } else {
    div.className = "chat-msg";
    div.innerHTML = `<span class="author" style="color:${msg.avatarColor}">${esc(msg.userName)}:</span> ${esc(msg.text)}`;
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
});

function sendChat() {
  const inp = $("#inp-chat");
  const text = inp.value.trim();
  if (!text) return;
  socket.emit("chat-msg", text);
  inp.value = "";
}
$("#btn-send").addEventListener("click", sendChat);
$("#inp-chat").addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });

// ── Finished screen ───────────────────────────────────────────
function enterFinishedScreen(room) {
  showScreen("finished");
  $("#finish-workout-name").textContent = room.workout.name;
  const stats = $("#finish-stats");
  stats.innerHTML = "";

  const totalEx = room.workout.exercises.length;
  const totalTime = room.workout.exercises.reduce((a, e) => a + e.duration + e.rest, 0);

  // Summary stat
  addStat(stats, "Total Exercises", totalEx);
  addStat(stats, "Total Time", formatTime(totalTime));

  // Per-person stats
  room.participants.forEach((p) => {
    addStat(stats, p.name, `${p.completedExercises}/${totalEx} exercises ✅`);
  });
}

function addStat(container, label, value) {
  const div = document.createElement("div");
  div.className = "finish-stat";
  div.innerHTML = `<span class="fs-name">${esc(String(label))}</span><span class="fs-val">${esc(String(value))}</span>`;
  container.appendChild(div);
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

$("#btn-back-lobby").addEventListener("click", () => { socket.emit("leave-room"); showScreen("lobby"); socket.emit("list-rooms"); });

// ── Errors ────────────────────────────────────────────────────
socket.on("error-msg", (msg) => alert(msg));
