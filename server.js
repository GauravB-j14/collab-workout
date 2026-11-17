const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// ── In-memory store ──────────────────────────────────────────────
const rooms = new Map();     // roomId → Room
const users = new Map();     // socketId → { name, roomId, avatarColor }

// ── Exercise guide database ──────────────────────────────────
const EXERCISE_GUIDE = {
  "Jumping Jacks": {
    emoji: "⭐",
    muscles: ["Full Body", "Cardio"],
    steps: [
      "Stand upright with feet together, arms at your sides",
      "Jump and spread your legs shoulder-width apart while raising arms overhead",
      "Jump again to return to the starting position",
      "Repeat at a steady, brisk pace"
    ],
    tips: ["Land softly on the balls of your feet", "Keep your core tight throughout", "Fully extend your arms overhead"]
  },
  "Push-Ups": {
    emoji: "💪",
    muscles: ["Chest", "Triceps", "Shoulders"],
    steps: [
      "Start in a high plank — hands slightly wider than shoulders",
      "Keep your body in a straight line from head to heels",
      "Lower your chest toward the floor by bending your elbows",
      "Push back up to the starting position"
    ],
    tips: ["Don't flare elbows out past 45°", "Engage your core — no sagging hips", "Drop to knees for an easier version"]
  },
  "Squats": {
    emoji: "🦵",
    muscles: ["Quads", "Glutes", "Hamstrings"],
    steps: [
      "Stand with feet shoulder-width apart, toes slightly out",
      "Push your hips back as if sitting into a chair",
      "Lower until thighs are parallel to the floor (or as low as comfortable)",
      "Drive through your heels to stand back up"
    ],
    tips: ["Keep your knees tracking over your toes", "Chest up, back straight", "Weight in your heels, not toes"]
  },
  "Burpees": {
    emoji: "🔥",
    muscles: ["Full Body", "Cardio"],
    steps: [
      "Stand tall, then squat down and place hands on the floor",
      "Jump or step your feet back into a plank position",
      "Do one push-up (optional for beginners)",
      "Jump or step feet forward to your hands, then explode upward with arms overhead"
    ],
    tips: ["Land softly when jumping", "Modify by stepping instead of jumping", "Keep a strong plank — don't let hips sag"]
  },
  "Plank": {
    emoji: "🧱",
    muscles: ["Core", "Shoulders", "Back"],
    steps: [
      "Start face-down, then prop yourself on forearms and toes",
      "Keep elbows directly under shoulders",
      "Engage your core and hold your body in a straight line",
      "Breathe steadily — don't hold your breath"
    ],
    tips: ["Squeeze your glutes to keep hips level", "Look at the floor to keep your neck neutral", "Don't let your lower back arch or sag"]
  },
  "Mountain Climbers": {
    emoji: "⛰️",
    muscles: ["Core", "Shoulders", "Cardio"],
    steps: [
      "Start in a high plank position with hands under shoulders",
      "Drive your right knee toward your chest",
      "Quickly switch legs, bringing left knee forward",
      "Continue alternating at a fast pace, like running in place"
    ],
    tips: ["Keep hips level — don't bounce them up", "Hands stay planted, don't shift forward", "Go faster for more cardio, slower for more core"]
  },
  "Lunges": {
    emoji: "🚶",
    muscles: ["Quads", "Glutes", "Hamstrings"],
    steps: [
      "Stand tall with feet hip-width apart",
      "Step forward with one leg and lower your hips",
      "Both knees should bend to about 90 degrees",
      "Push through your front heel to return to standing, then switch legs"
    ],
    tips: ["Front knee shouldn't pass your toes", "Keep your torso upright", "Alternate legs each rep"]
  },
  "High Knees": {
    emoji: "🏃",
    muscles: ["Core", "Hip Flexors", "Cardio"],
    steps: [
      "Stand tall with feet hip-width apart",
      "Drive your right knee up toward your chest",
      "Quickly switch to the left knee",
      "Pump your arms and maintain a fast pace"
    ],
    tips: ["Aim to get knees to hip height", "Stay on the balls of your feet", "Keep your core engaged throughout"]
  },
  "Crunches": {
    emoji: "🔄",
    muscles: ["Abs", "Core"],
    steps: [
      "Lie on your back with knees bent, feet flat on the floor",
      "Place hands behind your head or across your chest",
      "Curl your shoulders off the floor by engaging your abs",
      "Lower back down with control — don't just drop"
    ],
    tips: ["Don't pull on your neck", "Focus on curling your ribcage toward your pelvis", "Exhale as you crunch up"]
  },
  "Bicycle Crunches": {
    emoji: "🚲",
    muscles: ["Abs", "Obliques"],
    steps: [
      "Lie on your back, hands behind head, legs lifted with knees bent 90°",
      "Bring your right elbow toward your left knee while extending right leg",
      "Switch sides — left elbow to right knee",
      "Continue in a pedaling motion"
    ],
    tips: ["Rotate from your torso, not just your elbows", "Keep lower back pressed to the floor", "Move slowly and controlled for best results"]
  },
  "Leg Raises": {
    emoji: "🦿",
    muscles: ["Lower Abs", "Hip Flexors"],
    steps: [
      "Lie flat on your back, legs extended, hands by your sides (or under hips)",
      "Keeping legs straight, raise them toward the ceiling",
      "Lift until your legs are perpendicular to the floor",
      "Lower slowly back down without touching the floor"
    ],
    tips: ["Press your lower back into the floor", "Move slowly — don't use momentum", "Bend knees slightly to make it easier"]
  },
  "Russian Twists": {
    emoji: "🌀",
    muscles: ["Obliques", "Core"],
    steps: [
      "Sit on the floor with knees bent, feet slightly off the ground",
      "Lean back slightly to engage your core, keep your back straight",
      "Clasp your hands together (or hold a weight)",
      "Rotate your torso to touch the floor on each side"
    ],
    tips: ["Keep your chest lifted", "Rotate from your ribcage, not just arms", "Lift feet for more challenge, plant them for easier"]
  },
  "Flutter Kicks": {
    emoji: "🦶",
    muscles: ["Lower Abs", "Hip Flexors"],
    steps: [
      "Lie flat on your back, hands under your hips for support",
      "Lift both legs a few inches off the ground",
      "Kick one leg up while the other stays low",
      "Alternate in a quick, fluttering motion"
    ],
    tips: ["Keep lower back pressed to the floor", "Small controlled kicks — about 6 inches range", "Don't hold your breath"]
  },
  "Jump Squats": {
    emoji: "🦘",
    muscles: ["Quads", "Glutes", "Cardio"],
    steps: [
      "Stand with feet shoulder-width apart",
      "Lower into a squat position",
      "Explosively jump up, extending your body fully",
      "Land softly back into the squat position"
    ],
    tips: ["Land softly with bent knees to absorb impact", "Swing arms for momentum", "Keep chest up throughout"]
  },
  "Tuck Jumps": {
    emoji: "🐸",
    muscles: ["Quads", "Core", "Cardio"],
    steps: [
      "Stand with feet shoulder-width apart, knees slightly bent",
      "Jump straight up as high as you can",
      "At the top, tuck your knees toward your chest",
      "Extend legs and land softly on the balls of your feet"
    ],
    tips: ["Focus on height, not speed", "Land softly with bent knees", "Use arm swing to generate power"]
  },
  "Speed Skaters": {
    emoji: "⛸️",
    muscles: ["Glutes", "Quads", "Balance"],
    steps: [
      "Stand on your right foot, left foot off the ground",
      "Leap laterally to the left, landing on your left foot",
      "Swing right foot behind left leg for balance",
      "Immediately leap back to the right — continue alternating"
    ],
    tips: ["Stay low in an athletic stance", "Swing your arms for balance and power", "Land softly on the ball of your foot"]
  },
  "Box Jumps (imaginary)": {
    emoji: "📦",
    muscles: ["Quads", "Glutes", "Calves"],
    steps: [
      "Stand facing forward with feet shoulder-width apart",
      "Drop into a quarter-squat and swing arms back",
      "Explode upward, jumping as high as possible",
      "Land softly with bent knees, then step back and repeat"
    ],
    tips: ["Focus on soft landings with bent knees", "Use your arms to help generate upward force", "Stand fully upright at the top"]
  },
  "Sprint in Place": {
    emoji: "🏃‍♂️",
    muscles: ["Full Body", "Cardio"],
    steps: [
      "Stand with feet hip-width apart in a running stance",
      "Begin running in place as fast as you can",
      "Drive knees high and pump arms hard",
      "Stay on the balls of your feet"
    ],
    tips: ["Lean slightly forward", "Pump arms vigorously — they drive your speed", "Breathe rhythmically"]
  },
  "Diamond Push-Ups": {
    emoji: "💎",
    muscles: ["Triceps", "Chest", "Shoulders"],
    steps: [
      "Start in a plank position",
      "Place hands close together under your chest, forming a diamond/triangle shape",
      "Lower your chest toward your hands by bending elbows",
      "Push back up to the starting position"
    ],
    tips: ["Keep elbows close to your body", "Harder than regular push-ups — go to knees if needed", "Focus on squeezing your triceps at the top"]
  },
  "Tricep Dips": {
    emoji: "🪑",
    muscles: ["Triceps", "Shoulders", "Chest"],
    steps: [
      "Sit on the edge of a sturdy chair/bench, hands gripping the edge",
      "Slide your hips off the edge, supporting yourself with your arms",
      "Lower your body by bending elbows to about 90 degrees",
      "Push back up to straighten your arms"
    ],
    tips: ["Keep your back close to the chair", "Don't shrug your shoulders up", "Extend legs further out for more challenge"]
  },
  "Pike Push-Ups": {
    emoji: "🔺",
    muscles: ["Shoulders", "Triceps", "Upper Chest"],
    steps: [
      "Start in a downward dog position — hips high, forming an inverted V",
      "Place hands shoulder-width apart",
      "Bend elbows and lower the top of your head toward the floor",
      "Push back up to the starting pike position"
    ],
    tips: ["Keep hips high throughout the movement", "Great shoulder press substitute with no equipment", "Walk feet closer to hands for more difficulty"]
  },
  "Arm Circles": {
    emoji: "🔄",
    muscles: ["Shoulders", "Upper Back"],
    steps: [
      "Stand tall with arms extended straight out to the sides",
      "Make small forward circles with both arms",
      "Gradually increase the size of the circles",
      "Reverse direction halfway through"
    ],
    tips: ["Keep your core engaged and stand tall", "Don't shrug your shoulders", "Start small and go bigger"]
  },
  "Plank Shoulder Taps": {
    emoji: "👋",
    muscles: ["Core", "Shoulders", "Stability"],
    steps: [
      "Start in a high plank position, hands under shoulders",
      "Lift your right hand and tap your left shoulder",
      "Place it back down, then tap right shoulder with left hand",
      "Continue alternating while keeping hips as still as possible"
    ],
    tips: ["Widen your feet for more stability", "Fight the urge to rotate your hips", "Go slowly — this is about control"]
  },
  "Neck Rolls": {
    emoji: "🙆",
    muscles: ["Neck", "Upper Traps"],
    steps: [
      "Stand or sit tall with shoulders relaxed",
      "Slowly drop your chin to your chest",
      "Roll your head gently to the right, bringing ear toward shoulder",
      "Continue the circle to the back, then left, and back to center"
    ],
    tips: ["Move very slowly and gently", "Don't force any position that causes pain", "Reverse direction after a few rolls"]
  },
  "Shoulder Stretch": {
    emoji: "🤸",
    muscles: ["Shoulders", "Upper Back"],
    steps: [
      "Bring your right arm across your chest",
      "Use your left hand to gently press above or below the elbow",
      "Hold for 15 seconds, feeling the stretch in your shoulder",
      "Switch arms and repeat"
    ],
    tips: ["Don't press on the elbow joint directly", "Keep your shoulder down, not shrugged", "Breathe deeply and relax into it"]
  },
  "Quad Stretch": {
    emoji: "🦵",
    muscles: ["Quadriceps", "Hip Flexors"],
    steps: [
      "Stand tall (hold a wall for balance if needed)",
      "Bend your right knee and grab your right ankle behind you",
      "Pull your heel gently toward your glute",
      "Hold for 15 seconds, then switch legs"
    ],
    tips: ["Keep your knees close together", "Stand tall — don't lean forward", "Push your hips slightly forward for a deeper stretch"]
  },
  "Hamstring Stretch": {
    emoji: "🧘",
    muscles: ["Hamstrings", "Lower Back"],
    steps: [
      "Stand tall and extend one leg forward, heel on the ground, toes up",
      "Hinge at the hips and lean your torso forward slightly",
      "Place hands on your thigh for support",
      "Hold for 15 seconds, then switch legs"
    ],
    tips: ["Keep your back straight — hinge from the hips", "Don't bounce — hold steady", "You should feel the stretch behind your thigh"]
  },
  "Child's Pose": {
    emoji: "🙏",
    muscles: ["Lower Back", "Hips", "Shoulders"],
    steps: [
      "Kneel on the floor, sit back on your heels",
      "Fold forward, extending arms out in front of you",
      "Rest your forehead on the floor",
      "Breathe deeply and relax into the stretch"
    ],
    tips: ["Spread your knees wider for more comfort", "Walk hands forward for a deeper shoulder stretch", "This is a resting pose — fully relax"]
  },
  "Cat-Cow Stretch": {
    emoji: "🐱",
    muscles: ["Spine", "Core", "Back"],
    steps: [
      "Start on hands and knees (tabletop position)",
      "COW: Inhale, drop your belly, lift your chest and tailbone up",
      "CAT: Exhale, round your back, tuck chin and tailbone under",
      "Flow between the two positions with your breath"
    ],
    tips: ["Move slowly with your breath", "Great for warming up or cooling down the spine", "Initiate the movement from your pelvis"]
  },
  "Pigeon Pose": {
    emoji: "🐦",
    muscles: ["Hip Flexors", "Glutes", "Piriformis"],
    steps: [
      "From hands and knees, bring right knee forward behind right wrist",
      "Extend your left leg straight back behind you",
      "Square your hips toward the floor as much as possible",
      "Fold forward over your front shin for a deeper stretch"
    ],
    tips: ["Use a pillow under your hip if it doesn't reach the floor", "Keep your back leg straight", "Hold for at least 30 seconds per side"]
  },
};

// Pre-built workout templates
const WORKOUT_TEMPLATES = [
  {
    name: "Full Body Blast",
    exercises: [
      { name: "Jumping Jacks", duration: 45, rest: 15 },
      { name: "Push-Ups", duration: 40, rest: 20 },
      { name: "Squats", duration: 45, rest: 15 },
      { name: "Burpees", duration: 30, rest: 30 },
      { name: "Plank", duration: 45, rest: 15 },
      { name: "Mountain Climbers", duration: 40, rest: 20 },
      { name: "Lunges", duration: 45, rest: 15 },
      { name: "High Knees", duration: 30, rest: 15 },
    ],
  },
  {
    name: "Core Crusher",
    exercises: [
      { name: "Crunches", duration: 40, rest: 15 },
      { name: "Plank", duration: 50, rest: 20 },
      { name: "Bicycle Crunches", duration: 40, rest: 15 },
      { name: "Leg Raises", duration: 35, rest: 20 },
      { name: "Russian Twists", duration: 40, rest: 15 },
      { name: "Flutter Kicks", duration: 35, rest: 20 },
    ],
  },
  {
    name: "HIIT Cardio",
    exercises: [
      { name: "Burpees", duration: 30, rest: 15 },
      { name: "Jump Squats", duration: 30, rest: 15 },
      { name: "High Knees", duration: 30, rest: 15 },
      { name: "Tuck Jumps", duration: 25, rest: 20 },
      { name: "Speed Skaters", duration: 30, rest: 15 },
      { name: "Box Jumps (imaginary)", duration: 30, rest: 15 },
      { name: "Sprint in Place", duration: 30, rest: 20 },
    ],
  },
  {
    name: "Upper Body Strength",
    exercises: [
      { name: "Push-Ups", duration: 40, rest: 20 },
      { name: "Diamond Push-Ups", duration: 30, rest: 20 },
      { name: "Tricep Dips", duration: 35, rest: 20 },
      { name: "Pike Push-Ups", duration: 30, rest: 20 },
      { name: "Arm Circles", duration: 40, rest: 15 },
      { name: "Plank Shoulder Taps", duration: 35, rest: 20 },
    ],
  },
  {
    name: "Stretch & Recover",
    exercises: [
      { name: "Neck Rolls", duration: 30, rest: 10 },
      { name: "Shoulder Stretch", duration: 30, rest: 10 },
      { name: "Quad Stretch", duration: 30, rest: 10 },
      { name: "Hamstring Stretch", duration: 30, rest: 10 },
      { name: "Child's Pose", duration: 40, rest: 10 },
      { name: "Cat-Cow Stretch", duration: 40, rest: 10 },
      { name: "Pigeon Pose", duration: 40, rest: 10 },
    ],
  },
];

const AVATAR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
  "#F0B27A", "#82E0AA", "#F1948A", "#AED6F1", "#D7BDE2",
];

function pickColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function buildRoomSummary(room) {
  return {
    id: room.id,
    name: room.name,
    host: room.host,
    workout: room.workout,
    participants: room.participants.map((p) => ({
      id: p.id,
      name: p.name,
      avatarColor: p.avatarColor,
      ready: p.ready,
      completedExercises: p.completedExercises,
    })),
    state: room.state,           // waiting | active | paused | finished
    currentExerciseIdx: room.currentExerciseIdx,
    timerSeconds: room.timerSeconds,
    isRest: room.isRest,
    maxParticipants: room.maxParticipants,
  };
}

// ── Socket.IO ────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`✓ connected  ${socket.id}`);

  // Send templates and exercise guide on connect
  socket.emit("templates", WORKOUT_TEMPLATES);
  socket.emit("exercise-guide", EXERCISE_GUIDE);

  // ── List public rooms ────────────────────────────────────────
  socket.on("list-rooms", () => {
    const list = [];
    rooms.forEach((r) => {
      if (r.participants.length < r.maxParticipants) list.push(buildRoomSummary(r));
    });
    socket.emit("room-list", list);
  });

  // ── Create room ──────────────────────────────────────────────
  socket.on("create-room", ({ userName, roomName, workout, maxParticipants }) => {
    const roomId = uuidv4().slice(0, 8);
    const color = pickColor();
    const participant = { id: socket.id, name: userName, avatarColor: color, ready: false, completedExercises: 0 };

    const room = {
      id: roomId,
      name: roomName,
      host: socket.id,
      workout,                       // { name, exercises: [{name,duration,rest}] }
      participants: [participant],
      state: "waiting",
      currentExerciseIdx: 0,
      timerSeconds: 0,
      isRest: false,
      maxParticipants: maxParticipants || 10,
      intervalHandle: null,
    };
    rooms.set(roomId, room);
    users.set(socket.id, { name: userName, roomId, avatarColor: color });

    socket.join(roomId);
    socket.emit("room-joined", buildRoomSummary(room));
    io.emit("rooms-updated");
  });

  // ── Join room ────────────────────────────────────────────────
  socket.on("join-room", ({ userName, roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit("error-msg", "Room not found.");
    if (room.participants.length >= room.maxParticipants) return socket.emit("error-msg", "Room is full.");
    if (room.state !== "waiting") return socket.emit("error-msg", "Workout already in progress.");

    const color = pickColor();
    const participant = { id: socket.id, name: userName, avatarColor: color, ready: false, completedExercises: 0 };
    room.participants.push(participant);
    users.set(socket.id, { name: userName, roomId, avatarColor: color });

    socket.join(roomId);
    socket.emit("room-joined", buildRoomSummary(room));
    io.to(roomId).emit("participant-update", buildRoomSummary(room));
    io.to(roomId).emit("chat-msg", { system: true, text: `${userName} joined the room 💪` });
    io.emit("rooms-updated");
  });

  // ── Toggle ready ─────────────────────────────────────────────
  socket.on("toggle-ready", () => {
    const u = users.get(socket.id);
    if (!u) return;
    const room = rooms.get(u.roomId);
    if (!room) return;
    const p = room.participants.find((pp) => pp.id === socket.id);
    if (p) {
      p.ready = !p.ready;
      io.to(u.roomId).emit("participant-update", buildRoomSummary(room));
    }
  });

  // ── Start workout (host only) ───────────────────────────────
  socket.on("start-workout", () => {
    const u = users.get(socket.id);
    if (!u) return;
    const room = rooms.get(u.roomId);
    if (!room || room.host !== socket.id) return;

    room.state = "active";
    room.currentExerciseIdx = 0;
    room.isRest = false;
    const ex = room.workout.exercises[0];
    room.timerSeconds = ex.duration;

    io.to(u.roomId).emit("workout-state", buildRoomSummary(room));
    io.to(u.roomId).emit("chat-msg", { system: true, text: "🏋️ Workout started! Let's go!" });

    // Shared countdown timer
    room.intervalHandle = setInterval(() => {
      if (room.state !== "active") return;

      room.timerSeconds--;

      if (room.timerSeconds <= 0) {
        if (room.isRest) {
          // Move to next exercise
          room.currentExerciseIdx++;
          if (room.currentExerciseIdx >= room.workout.exercises.length) {
            // Workout complete
            room.state = "finished";
            clearInterval(room.intervalHandle);
            io.to(room.id).emit("workout-state", buildRoomSummary(room));
            io.to(room.id).emit("chat-msg", { system: true, text: "🎉 Workout complete! Great job everyone!" });
            return;
          }
          room.isRest = false;
          room.timerSeconds = room.workout.exercises[room.currentExerciseIdx].duration;
        } else {
          // Start rest
          room.isRest = true;
          room.timerSeconds = room.workout.exercises[room.currentExerciseIdx].rest;
          // Credit completed exercise to everyone
          room.participants.forEach((p) => p.completedExercises++);
        }
      }

      io.to(room.id).emit("timer-tick", {
        timerSeconds: room.timerSeconds,
        currentExerciseIdx: room.currentExerciseIdx,
        isRest: room.isRest,
        state: room.state,
        participants: room.participants.map((p) => ({
          id: p.id, name: p.name, avatarColor: p.avatarColor,
          completedExercises: p.completedExercises,
        })),
      });
    }, 1000);
  });

  // ── Pause / Resume (host) ───────────────────────────────────
  socket.on("pause-workout", () => {
    const u = users.get(socket.id);
    if (!u) return;
    const room = rooms.get(u.roomId);
    if (!room || room.host !== socket.id) return;

    if (room.state === "active") {
      room.state = "paused";
      io.to(u.roomId).emit("workout-state", buildRoomSummary(room));
      io.to(u.roomId).emit("chat-msg", { system: true, text: "⏸️ Workout paused" });
    } else if (room.state === "paused") {
      room.state = "active";
      io.to(u.roomId).emit("workout-state", buildRoomSummary(room));
      io.to(u.roomId).emit("chat-msg", { system: true, text: "▶️ Workout resumed!" });
    }
  });

  // ── Reaction (emoji burst) ──────────────────────────────────
  socket.on("reaction", (emoji) => {
    const u = users.get(socket.id);
    if (!u) return;
    io.to(u.roomId).emit("reaction", { userId: socket.id, userName: u.name, emoji });
  });

  // ── Chat ─────────────────────────────────────────────────────
  socket.on("chat-msg", (text) => {
    const u = users.get(socket.id);
    if (!u) return;
    io.to(u.roomId).emit("chat-msg", { userName: u.name, text, avatarColor: u.avatarColor });
  });

  // ── Leave / Disconnect ──────────────────────────────────────
  function leaveRoom() {
    const u = users.get(socket.id);
    if (!u) return;
    const room = rooms.get(u.roomId);
    if (!room) return;

    room.participants = room.participants.filter((p) => p.id !== socket.id);
    io.to(u.roomId).emit("chat-msg", { system: true, text: `${u.name} left the room` });

    if (room.participants.length === 0) {
      clearInterval(room.intervalHandle);
      rooms.delete(u.roomId);
    } else {
      // Transfer host
      if (room.host === socket.id) {
        room.host = room.participants[0].id;
        io.to(u.roomId).emit("chat-msg", { system: true, text: `${room.participants[0].name} is now the host 👑` });
      }
      io.to(u.roomId).emit("participant-update", buildRoomSummary(room));
    }

    socket.leave(u.roomId);
    users.delete(socket.id);
    io.emit("rooms-updated");
  }

  socket.on("leave-room", leaveRoom);
  socket.on("disconnect", () => {
    console.log(`✗ disconnected ${socket.id}`);
    leaveRoom();
  });
});

// ── Start ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n  🏋️  Workout Together is running at  http://localhost:${PORT}\n`);
});
