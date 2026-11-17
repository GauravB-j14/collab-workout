/* ═══════════════════════════════════════════════════════════════
   2D Canvas Animated Stickman / Vector Coach
   ═══════════════════════════════════════════════════════════════ */

class ExerciseAnimator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animId = null;
    this.currentExercise = null;
    this.isRest = false;
    this.startTime = performance.now();
    this.loop = this.loop.bind(this);
    this.start();
  }

  setExercise(exerciseName, isRest = false) {
    this.currentExercise = exerciseName;
    this.isRest = isRest;
  }

  start() {
    if (!this.animId) {
      this.loop();
    }
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  loop() {
    this.render();
    this.animId = requestAnimationFrame(this.loop);
  }

  render() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const isLight = document.body.classList.contains('light');
    const primaryColor = isLight ? '#5a4bd6' : '#8c7ae6';
    const skinColor = '#fbc531';
    const shadowColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
    const floorColor = isLight ? '#dcdde1' : '#2f3640';

    // Ground platform shadow
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.ellipse(w / 2, h - 16, 60, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    const t = (performance.now() - this.startTime) / 1000;

    if (this.isRest || !this.currentExercise) {
      this.drawRestingGuy(w / 2, h - 25, t, primaryColor, skinColor);
      return;
    }

    const ex = this.currentExercise.toLowerCase();

    if (ex.includes('push-up') || ex.includes('diamond')) {
      this.drawPushUp(w / 2, h - 25, t, primaryColor, skinColor);
    } else if (ex.includes('squat')) {
      this.drawSquat(w / 2, h - 25, t, primaryColor, skinColor);
    } else if (ex.includes('jumping jack')) {
      this.drawJumpingJack(w / 2, h - 25, t, primaryColor, skinColor);
    } else if (ex.includes('plank') && !ex.includes('tap')) {
      this.drawPlank(w / 2, h - 25, t, primaryColor, skinColor);
    } else if (ex.includes('lunge')) {
      this.drawLunge(w / 2, h - 25, t, primaryColor, skinColor);
    } else if (ex.includes('high knee') || ex.includes('sprint')) {
      this.drawHighKnees(w / 2, h - 25, t, primaryColor, skinColor);
    } else if (ex.includes('burpee')) {
      this.drawBurpee(w / 2, h - 25, t, primaryColor, skinColor);
    } else if (ex.includes('crunch') || ex.includes('leg raise') || ex.includes('flutter')) {
      this.drawCrunches(w / 2, h - 25, t, primaryColor, skinColor);
    } else {
      // Default dynamic workout bounce/stretch
      this.drawStretch(w / 2, h - 25, t, primaryColor, skinColor);
    }
  }

  /* ──────────────── Limb drawing utility ──────────────── */
  drawLine(x1, y1, x2, y2, color, lineWidth = 6) {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  drawHead(x, y, radius, skinColor) {
    const { ctx } = this;
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Headband / Cap accent
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.arc(x, y - 2, radius + 1, Math.PI * 1.15, Math.PI * 1.85);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ff4757';
    ctx.stroke();
  }

  /* ── 1. Squats ── */
  drawSquat(cx, floorY, t, color, skin) {
    const cycle = (Math.sin(t * 3.5) + 1) / 2; // 0 = standing, 1 = deep squat
    const hipY = floorY - 50 + cycle * 24;
    const kneeY = floorY - 26 + cycle * 6;
    const shoulderY = hipY - 38;
    const headY = shoulderY - 14;

    this.drawHead(cx, headY, 11, skin);
    // Torso
    this.drawLine(cx, shoulderY, cx + (cycle * 6), hipY, color, 8);

    // Left Leg
    this.drawLine(cx, hipY, cx - 18 - (cycle * 8), kneeY, color, 7);
    this.drawLine(cx - 18 - (cycle * 8), kneeY, cx - 18, floorY, color, 7);

    // Right Leg
    this.drawLine(cx, hipY, cx + 18 + (cycle * 8), kneeY, color, 7);
    this.drawLine(cx + 18 + (cycle * 8), kneeY, cx + 18, floorY, color, 7);

    // Arms forward during squat
    const armReachX = cx + 24 + cycle * 14;
    this.drawLine(cx, shoulderY, armReachX, shoulderY + 8 - cycle * 8, color, 5);
  }

  /* ── 2. Jumping Jacks ── */
  drawJumpingJack(cx, floorY, t, color, skin) {
    const cycle = (Math.sin(t * 5.5) + 1) / 2; // 0 = closed, 1 = star spread
    const hop = Math.abs(Math.sin(t * 5.5)) * 10;
    const baseY = floorY - hop;

    const headY = baseY - 88;
    const shoulderY = baseY - 74;
    const hipY = baseY - 44;

    this.drawHead(cx, headY, 11, skin);
    // Torso
    this.drawLine(cx, shoulderY, cx, hipY, color, 8);

    // Legs
    const legSpread = 6 + cycle * 24;
    this.drawLine(cx, hipY, cx - legSpread, baseY, color, 7);
    this.drawLine(cx, hipY, cx + legSpread, baseY, color, 7);

    // Arms (down at side to overhead hands clap)
    const armAngle = -Math.PI / 4 + cycle * (Math.PI * 0.9);
    const armLen = 28;
    this.drawLine(cx, shoulderY, cx - Math.sin(armAngle) * armLen, shoulderY - Math.cos(armAngle) * armLen, color, 5);
    this.drawLine(cx, shoulderY, cx + Math.sin(armAngle) * armLen, shoulderY - Math.cos(armAngle) * armLen, color, 5);
  }

  /* ── 3. Push-Ups ── */
  drawPushUp(cx, floorY, t, color, skin) {
    const cycle = (Math.sin(t * 3.5) + 1) / 2; // 0 = up, 1 = down
    const shoulderY = floorY - 28 + cycle * 14;
    const hipY = floorY - 20 + cycle * 7;
    const feetX = cx - 42;
    const headX = cx + 34;
    const shoulderX = cx + 20;
    const handsX = cx + 22;

    this.drawHead(headX, shoulderY - 3, 10, skin);
    // Body line
    this.drawLine(feetX, floorY, hipY > shoulderY ? hipY : shoulderY, hipY, color, 7);
    this.drawLine(feetX, floorY, shoulderX, shoulderY, color, 8);

    // Arm (pushing up / bent)
    const elbowX = handsX - (cycle * 8);
    const elbowY = (shoulderY + floorY) / 2 + (cycle * 4);
    this.drawLine(shoulderX, shoulderY, elbowX, elbowY, color, 6);
    this.drawLine(elbowX, elbowY, handsX, floorY, color, 6);
  }

  /* ── 4. Plank ── */
  drawPlank(cx, floorY, t, color, skin) {
    const breath = Math.sin(t * 2) * 1.5;
    const shoulderY = floorY - 22 + breath;
    const hipY = floorY - 20;
    const feetX = cx - 42;
    const headX = cx + 32;

    this.drawHead(headX, shoulderY - 2, 10, skin);
    this.drawLine(feetX, floorY, cx + 18, shoulderY, color, 8);
    // Forearms flat on ground
    this.drawLine(cx + 18, shoulderY, cx + 18, floorY, color, 6);
    this.drawLine(cx + 18, floorY, cx + 28, floorY, color, 6);
  }

  /* ── 5. High Knees / Sprint ── */
  drawHighKnees(cx, floorY, t, color, skin) {
    const phase = t * 7;
    const hop = Math.abs(Math.sin(phase)) * 8;
    const baseY = floorY - hop;
    const headY = baseY - 82;
    const shoulderY = baseY - 68;
    const hipY = baseY - 38;

    this.drawHead(cx, headY, 11, skin);
    this.drawLine(cx, shoulderY, cx, hipY, color, 8);

    const leg1Cycle = Math.sin(phase);
    const leg2Cycle = -leg1Cycle;

    // Leg 1 (Knee high)
    if (leg1Cycle > 0) {
      this.drawLine(cx, hipY, cx + 18, hipY - 6, color, 7);
      this.drawLine(cx + 18, hipY - 6, cx + 18, hipY + 18, color, 7);
    } else {
      this.drawLine(cx, hipY, cx - 6, baseY, color, 7);
    }

    // Leg 2
    if (leg2Cycle > 0) {
      this.drawLine(cx, hipY, cx + 18, hipY - 6, color, 7);
      this.drawLine(cx + 18, hipY - 6, cx + 18, hipY + 18, color, 7);
    } else {
      this.drawLine(cx, hipY, cx - 6, baseY, color, 7);
    }

    // Pumping arms
    this.drawLine(cx, shoulderY, cx - 14 * leg1Cycle, shoulderY + 14, color, 5);
    this.drawLine(cx, shoulderY, cx + 14 * leg1Cycle, shoulderY + 14, color, 5);
  }

  /* ── 6. Lunges ── */
  drawLunge(cx, floorY, t, color, skin) {
    const cycle = (Math.sin(t * 3) + 1) / 2; // 0 to 1 drop
    const hipY = floorY - 38 + cycle * 14;
    const shoulderY = hipY - 38;

    this.drawHead(cx, shoulderY - 12, 11, skin);
    this.drawLine(cx, shoulderY, cx, hipY, color, 8);

    // Front leg (bent at knee)
    const frontKneeX = cx + 22;
    const frontKneeY = hipY + 12;
    this.drawLine(cx, hipY, frontKneeX, frontKneeY, color, 7);
    this.drawLine(frontKneeX, frontKneeY, frontKneeX, floorY, color, 7);

    // Back leg (extended back, knee dips near floor)
    const backKneeX = cx - 20;
    const backKneeY = floorY - 8 + (1 - cycle) * 16;
    this.drawLine(cx, hipY, backKneeX, backKneeY, color, 7);
    this.drawLine(backKneeX, backKneeY, cx - 34, floorY, color, 7);

    // Hands on hips
    this.drawLine(cx, shoulderY, cx + 10, hipY - 8, color, 5);
    this.drawLine(cx, shoulderY, cx - 10, hipY - 8, color, 5);
  }

  /* ── 7. Burpees ── */
  drawBurpee(cx, floorY, t, color, skin) {
    const phase = (t * 2.5) % 4; // 4 phases: 0=jump, 1=plank down, 2=pushup, 3=hop up
    if (phase < 1) {
      // Jumping up
      const hop = Math.sin(phase * Math.PI) * 22;
      const baseY = floorY - hop;
      this.drawHead(cx, baseY - 84, 11, skin);
      this.drawLine(cx, baseY - 70, cx, baseY - 38, color, 8);
      this.drawLine(cx, baseY - 38, cx - 8, baseY, color, 7);
      this.drawLine(cx, baseY - 38, cx + 8, baseY, color, 7);
      this.drawLine(cx, baseY - 70, cx - 12, baseY - 96, color, 5);
      this.drawLine(cx, baseY - 70, cx + 12, baseY - 96, color, 5);
    } else {
      // In plank position
      this.drawPushUp(cx, floorY, t * 1.5, color, skin);
    }
  }

  /* ── 8. Crunches / Abs ── */
  drawCrunches(cx, floorY, t, color, skin) {
    const cycle = (Math.sin(t * 3.5) + 1) / 2; // curl up
    const hipX = cx - 10;
    const hipY = floorY - 8;
    const shoulderX = hipX - 24 + cycle * 12;
    const shoulderY = floorY - 10 - cycle * 16;
    const headX = shoulderX - 8 + cycle * 4;
    const headY = shoulderY - 8;

    this.drawHead(headX, headY, 10, skin);
    // Torso curling
    this.drawLine(shoulderX, shoulderY, hipX, hipY, color, 8);

    // Legs bent
    const kneeX = hipX + 26;
    const kneeY = floorY - 32;
    this.drawLine(hipX, hipY, kneeX, kneeY, color, 7);
    this.drawLine(kneeX, kneeY, kneeX + 10, floorY, color, 7);

    // Hands behind head
    this.drawLine(shoulderX, shoulderY, headX, headY, color, 5);
  }

  /* ── 9. Stretch / Default ── */
  drawStretch(cx, floorY, t, color, skin) {
    const sway = Math.sin(t * 2) * 8;
    this.drawHead(cx + sway * 0.4, floorY - 84, 11, skin);
    this.drawLine(cx + sway * 0.4, floorY - 70, cx, floorY - 38, color, 8);
    this.drawLine(cx, floorY - 38, cx - 14, floorY, color, 7);
    this.drawLine(cx, floorY - 38, cx + 14, floorY, color, 7);

    // Gentle arm stretch up
    this.drawLine(cx + sway * 0.4, floorY - 70, cx - 18 + sway, floorY - 96, color, 5);
    this.drawLine(cx + sway * 0.4, floorY - 70, cx + 18 + sway, floorY - 96, color, 5);
  }

  /* ── Rest guy: Sitting wiping sweat or drinking water ── */
  drawRestingGuy(cx, floorY, t, color, skin) {
    const breath = Math.sin(t * 2.5) * 2;
    const hipX = cx;
    const hipY = floorY - 14;
    const shoulderX = cx - 8;
    const shoulderY = floorY - 42 + breath;

    this.drawHead(shoulderX + 2, shoulderY - 14, 11, skin);
    // Body sitting
    this.drawLine(shoulderX, shoulderY, hipX, hipY, color, 8);

    // Legs folded/sitting
    this.drawLine(hipX, hipY, hipX + 26, floorY - 20, color, 7);
    this.drawLine(hipX + 26, floorY - 20, hipX + 18, floorY, color, 7);

    // Hand wiping brow
    this.drawLine(shoulderX, shoulderY, shoulderX + 12, shoulderY - 6, color, 5);
    this.drawLine(shoulderX + 12, shoulderY - 6, shoulderX + 4, shoulderY - 14, color, 5);

    // Water bottle on floor
    const { ctx } = this;
    ctx.fillStyle = '#00cec9';
    ctx.fillRect(cx - 30, floorY - 16, 8, 16);
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - 29, floorY - 20, 6, 4);

    // Little sweat drop
    if (Math.sin(t * 4) > 0.4) {
      ctx.fillStyle = '#74b9ff';
      ctx.beginPath();
      ctx.arc(shoulderX + 15, shoulderY - 10, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

window.ExerciseAnimator = ExerciseAnimator;
