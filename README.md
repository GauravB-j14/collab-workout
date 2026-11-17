# 🏋️ Workout Together

A real-time social workout app where people can create rooms, join workout sessions, exercise together with synchronized timers, and track each other's progress — all in real-time.

## Features

- **🚪 Room System** — Create or join workout rooms with a simple code
- **📋 5 Built-in Workout Templates** — Full Body Blast, Core Crusher, HIIT Cardio, Upper Body Strength, Stretch & Recover
- **⏱️ Synchronized Timer** — Everyone sees the same countdown, exercise name, and rest periods
- **👥 Real-time Participants** — See who's in your room, who's ready, and track completed exercises
- **💬 Live Chat** — Message your workout partners during the session
- **🔥 Emoji Reactions** — Send floating reactions (🔥💪😤🎉😅) to hype each other up
- **👑 Host Controls** — Room creator can start, pause/resume the workout
- **📊 Completion Stats** — See a summary of everyone's performance at the end

## Getting Started

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

Open multiple browser tabs to simulate multiple users working out together!

## Tech Stack

- **Backend:** Node.js + Express + Socket.IO
- **Frontend:** Vanilla HTML/CSS/JS
- **Real-time:** WebSockets (Socket.IO)
- **Storage:** In-memory (no database needed)

## How It Works

1. Enter your name
2. **Create a Room** — pick a workout template & room name, or **Join** an existing room
3. Hit **"I'm Ready"** once everyone's in
4. Host clicks **Start Workout** — the synchronized timer begins
5. Exercise together with the shared timer, chat, and send reactions
6. See completion stats when the workout is done

## Project Structure

```
workout-together/
├── server.js          # Express + Socket.IO backend
├── public/
│   ├── index.html     # Single-page app HTML
│   ├── style.css      # Dark theme styles
│   └── app.js         # Client-side Socket.IO logic
├── package.json
└── README.md
```
