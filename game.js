(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.querySelector("#score");
  const bestEl = document.querySelector("#best");
  const tipEl = document.querySelector("#tip");
  const restartBtn = document.querySelector("#restart");

  const W = canvas.width;
  const H = canvas.height;
  const GRAVITY = 1500;
  const MAX_CHARGE_MS = 1100;

  let platforms = [];
  let player;
  let cameraX;
  let score;
  let best = Number(localStorage.getItem("block-jump-best") || 0);
  let state;
  let chargeStartedAt;
  let lastTime;
  let currentPlatform;
  let nextPlatformId;

  bestEl.textContent = best;

  function makePlatform(x, y, width) {
    return { id: nextPlatformId++, x, y, width, height: 24 };
  }

  function addPlatformAfter(previous) {
    const gap = 62 + Math.random() * 82;
    const width = 88 + Math.random() * 58;
    const yShift = (Math.random() - 0.5) * 92;
    const y = Math.max(315, Math.min(458, previous.y + yShift));
    return makePlatform(previous.x + previous.width + gap, y, width);
  }

  function ensurePlatforms() {
    while (platforms.at(-1).x < cameraX + W + 500) {
      platforms.push(addPlatformAfter(platforms.at(-1)));
    }
    platforms = platforms.filter((p) => p.x + p.width > cameraX - 180);
  }

  function resetGame() {
    nextPlatformId = 0;
    platforms = [makePlatform(70, 440, 170)];
    cameraX = 0;
    score = 0;
    scoreEl.textContent = score;
    currentPlatform = platforms[0].id;
    player = {
      x: 140,
      y: platforms[0].y - 34,
      size: 34,
      vx: 0,
      vy: 0,
    };
    state = "ready";
    chargeStartedAt = 0;
    lastTime = performance.now();
    tipEl.textContent = "��ס��ꡢ��Ļ��ո��������ɿ�����";
    restartBtn.hidden = true;
    ensurePlatforms();
  }

  function startCharge() {
    if (state !== "ready") return;
    state = "charging";
    chargeStartedAt = performance.now();
    tipEl.textContent = "�����С����ɿ�����";
  }

  function releaseJump() {
    if (state !== "charging") return;
    const held = Math.min(performance.now() - chargeStartedAt, MAX_CHARGE_MS);
    const power = Math.max(0.12, held / MAX_CHARGE_MS);
    player.vx = 170 + power * 220;
    player.vy = -430 - power * 240;
    state = "jumping";
    tipEl.textContent = "";
  }

  function endGame() {
    if (state === "over") return;
    state = "over";
    player.vx = 0;
    if (score > best) {
      best = score;
      localStorage.setItem("block-jump-best", String(best));
      bestEl.textContent = best;
    }
    tipEl.textContent = `��Ϸ���� �� ���� ${score} ��`;
    restartBtn.hidden = false;
  }

  function update(dt) {
    if (state === "charging") {
      const power = Math.min((performance.now() - chargeStartedAt) / MAX_CHARGE_MS, 1);
      player.size = 34 - power * 7;
      return;
    }

    player.size += (34 - player.size) * Math.min(1, dt * 18);
    if (state !== "jumping") return;

    const oldBottom = player.y + player.size;
    player.vy += GRAVITY * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    const newBottom = player.y + player.size;

    if (player.vy > 0) {
      const landing = platforms.find((p) => {
        const horizontal = player.x + player.size * 0.72 > p.x && player.x + player.size * 0.28 < p.x + p.width;
        return horizontal && oldBottom <= p.y && newBottom >= p.y;
      });

      if (landing) {
        player.y = landing.y - player.size;
        player.vx = 0;
        player.vy = 0;
        state = "ready";
        tipEl.textContent = "������ס����";
        if (landing.id !== currentPlatform) {
          currentPlatform = landing.id;
          score += 1;
          scoreEl.textContent = score;
        }
      }
    }

    const targetCamera = Math.max(0, player.x - 285);
    cameraX += (targetCamera - cameraX) * Math.min(1, dt * 5);
    ensurePlatforms();

    if (player.y > H + 100 || player.x + player.size < cameraX - 40) endGame();
  }

  function roundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#eaf5ff");
    gradient.addColorStop(1, "#f8fafb");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,.6)";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 240 - cameraX * 0.15) % (W + 260)) - 100;
      ctx.beginPath();
      ctx.ellipse(x, 105 + (i % 2) * 50, 70, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    drawBackground();
    ctx.save();
    ctx.translate(-cameraX, 0);

    for (const p of platforms) {
      ctx.fillStyle = p.id === currentPlatform ? "#2f8f78" : "#334958";
      roundedRect(p.x, p.y, p.width, p.height, 7);
      ctx.fillStyle = "rgba(23,33,43,.12)";
      roundedRect(p.x + 7, p.y + p.height, p.width - 14, 7, 4);
    }

    const charge = state === "charging"
      ? Math.min((performance.now() - chargeStartedAt) / MAX_CHARGE_MS, 1)
      : 0;

    ctx.fillStyle = state === "over" ? "#89939b" : "#f06449";
    roundedRect(player.x, player.y + (34 - player.size), player.size, player.size, 8);

    ctx.fillStyle = "#fff";
    ctx.fillRect(player.x + player.size * 0.22, player.y + (34 - player.size) + player.size * 0.3, 4, 4);
    ctx.fillRect(player.x + player.size * 0.66, player.y + (34 - player.size) + player.size * 0.3, 4, 4);

    if (state === "charging") {
      const barWidth = 74;
      const barX = player.x + player.size / 2 - barWidth / 2;
      const barY = player.y - 22;
      ctx.fillStyle = "rgba(23,33,43,.15)";
      roundedRect(barX, barY, barWidth, 8, 4);
      ctx.fillStyle = charge > .82 ? "#f06449" : "#2f8f78";
      roundedRect(barX, barY, barWidth * charge, 8, 4);
    }

    ctx.restore();

    if (state === "over") {
      ctx.fillStyle = "rgba(255,255,255,.58)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#17212b";
      ctx.font = "700 38px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ûվ��", W / 2, H * .43);
    }
  }

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.032);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    startCharge();
  });
  canvas.addEventListener("pointerup", releaseJump);
  canvas.addEventListener("pointercancel", releaseJump);

  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.repeat) return;
    event.preventDefault();
    startCharge();
  });
  window.addEventListener("keyup", (event) => {
    if (event.code !== "Space") return;
    event.preventDefault();
    releaseJump();
  });

  restartBtn.addEventListener("click", resetGame);
  resetGame();
  requestAnimationFrame(loop);
})();

