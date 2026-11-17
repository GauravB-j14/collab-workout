# 🏋️ Workout Together

A real-time social workout app where people create rooms, exercise together with synchronized timers, and track each other's progress.

## Features

- **🚪 Room System** — Create or join workout rooms with a simple code
- **📋 5 Built-in Workout Templates** — Full Body Blast, Core Crusher, HIIT Cardio, Upper Body Strength, Stretch & Recover
- **⏱️ Synchronized Timer** — Everyone sees the same countdown, exercise name, and rest periods
- **👥 Real-time Participants** — See who's in your room, who's ready, and track completed exercises
- **💬 Live Chat** — Message your workout partners during the session
- **🔥 Emoji Reactions** — Send floating reactions to hype each other up
- **👑 Host Controls** — Room creator can start, pause, and resume the workout
- **📊 Completion Stats** — See a summary of everyone's performance at the end

## Run Locally

```bash
python -m venv .venv
# Activate the virtual environment, then:
pip install -r requirements.txt
python app.py
```

Open **http://localhost:3000** in your browser. Open multiple tabs to simulate multiple people working out together.

## Deploy on Render

- **Build command:** `pip install -r requirements.txt`
- **Start command:** `gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 100 app:app`

The single Gunicorn worker keeps the in-memory room state shared by all connected participants. Rooms and active workouts reset when the service restarts or redeploys.

## Tech Stack

- **Backend:** Python, Flask, Flask-SocketIO
- **Frontend:** HTML, CSS, and JavaScript
- **Real-time:** Socket.IO over WebSockets or long polling
- **Storage:** In-memory (no database required)

## How It Works

1. Enter your name.
2. Create a room with a workout template, or join an existing room.
3. Everyone marks themselves ready.
4. The host starts the workout.
5. Exercise together with the shared timer, chat, and reactions.
6. Review completion stats when the workout finishes.

## Project Structure

```
workout-together/
├── app.py                         # Flask + Flask-SocketIO backend
├── data/
│   ├── exercise_guide.json        # Exercise instructions and tips
│   └── workout_templates.json     # Built-in workouts
├── public/
│   ├── index.html                 # Single-page app
│   ├── app.js                     # Browser-side interaction
│   ├── animator.js                # Exercise animation
│   ├── socket.io.min.js           # Socket.IO browser client
│   └── style.css                  # App styles
├── requirements.txt
└── README.md
```
