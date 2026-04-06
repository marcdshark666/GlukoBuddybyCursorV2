// ── GlukoBuddy — Pixel Chow Chow Tamagotchi ──

const canvas = document.getElementById("gardenCanvas");
const ctx = canvas.getContext("2d");
const W = canvas.width;   // 480
const H = canvas.height;  // 400

// UI refs
const glucoseInput = document.getElementById("glucoseInput");
const applyBtn = document.getElementById("applyManual");
const mockBtn = document.getElementById("mockDexcom");
const connectBtn = document.getElementById("connectDexcom");
const statusText = document.getElementById("statusText");
const dexcomState = document.getElementById("dexcomState");
const statusDot = document.getElementById("statusDot");
const badgeValue = document.getElementById("badgeValue");
const moodLabel = document.getElementById("moodLabel");

// ── State ──
let glucose = 6.2;
let mood = "happy";   // happy | sad | neutral
let frame = 0;
let breathOffset = 0;
let tailAngle = 0;
let blinkTimer = 0;
let isBlinking = false;
let tongueOut = true;

// Particles
const leaves = [];
const butterflies = [];
const sparkles = [];
const flowers = [];

// Pre-generate flowers
for (let i = 0; i < 12; i++) {
  flowers.push({
    x: 20 + Math.random() * (W - 40),
    y: H - 70 + Math.random() * 50,
    color: ["#ff6b8a", "#ffaa55", "#ff55aa", "#ffdd55", "#aa88ff"][Math.floor(Math.random() * 5)],
    size: 3 + Math.random() * 3,
    swayOffset: Math.random() * Math.PI * 2
  });
}

// ── Pixel drawing helpers ──
function px(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), size, size);
}

function drawPixelRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// ── Background: sky gradient ──
function drawSky() {
  const skyColors = mood === "sad"
    ? ["#3a3a5c", "#5a5a7c", "#7a7a9c"]
    : ["#4a90d9", "#6ab4f0", "#9fd4ff"];

  const bandH = Math.ceil(H * 0.6 / skyColors.length);
  skyColors.forEach((c, i) => {
    drawPixelRect(0, i * bandH, W, bandH + 1, c);
  });
}

// ── Sun / Moon ──
function drawSun(t) {
  if (mood === "sad") {
    // Moon
    ctx.fillStyle = "#c8c8dd";
    ctx.beginPath();
    ctx.arc(W - 60, 55, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a3a5c";
    ctx.beginPath();
    ctx.arc(W - 50, 48, 18, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const pulse = Math.sin(t * 0.002) * 3;
    ctx.fillStyle = "#ffee44";
    ctx.beginPath();
    ctx.arc(W - 60, 55, 24 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcc22";
    ctx.beginPath();
    ctx.arc(W - 60, 55, 18, 0, Math.PI * 2);
    ctx.fill();
    // Rays
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + t * 0.001;
      const x1 = W - 60 + Math.cos(angle) * 30;
      const y1 = 55 + Math.sin(angle) * 30;
      const x2 = W - 60 + Math.cos(angle) * 38;
      const y2 = 55 + Math.sin(angle) * 38;
      ctx.strokeStyle = "rgba(255,238,68,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
}

// ── Clouds ──
const clouds = [
  { x: 30, y: 30, w: 70, speed: 0.3 },
  { x: 200, y: 55, w: 55, speed: 0.2 },
  { x: 350, y: 25, w: 60, speed: 0.35 },
];

function drawClouds(t) {
  const cloudColor = mood === "sad" ? "#5a5a7a" : "#ffffff";
  clouds.forEach(c => {
    const cx = (c.x + t * c.speed * 0.02) % (W + 100) - 50;
    ctx.fillStyle = cloudColor;
    ctx.globalAlpha = mood === "sad" ? 0.6 : 0.85;
    ctx.beginPath();
    ctx.arc(cx, c.y, c.w * 0.28, 0, Math.PI * 2);
    ctx.arc(cx + c.w * 0.25, c.y - 8, c.w * 0.22, 0, Math.PI * 2);
    ctx.arc(cx + c.w * 0.5, c.y, c.w * 0.26, 0, Math.PI * 2);
    ctx.arc(cx + c.w * 0.22, c.y + 2, c.w * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

// ── Ground / Grass ──
function drawGround() {
  // Main ground
  const groundY = H * 0.58;
  const g1 = mood === "sad" ? "#3a5a2a" : "#5cb338";
  const g2 = mood === "sad" ? "#2a4a1a" : "#4a9a28";
  const g3 = mood === "sad" ? "#1a3a0a" : "#3d8520";

  drawPixelRect(0, groundY, W, H - groundY, g2);
  // Lighter top strip
  drawPixelRect(0, groundY, W, 8, g1);
  // Darker bottom
  drawPixelRect(0, H - 40, W, 40, g3);

  // Pixel grass tufts
  for (let x = 0; x < W; x += 12) {
    const h = 4 + Math.sin(x * 0.5) * 3;
    drawPixelRect(x, groundY - h, 3, h, g1);
    drawPixelRect(x + 6, groundY - h + 2, 2, h - 2, g1);
  }
}

// ── Flowers ──
function drawFlowers(t) {
  if (mood === "sad") return;
  flowers.forEach(f => {
    const sway = Math.sin(t * 0.002 + f.swayOffset) * 2;
    // Stem
    drawPixelRect(f.x + sway, f.y - f.size * 3, 2, f.size * 3, "#3a7a20");
    // Petals
    ctx.fillStyle = f.color;
    const s = f.size;
    px(f.x + sway - s, f.y - s * 3, s, f.color);
    px(f.x + sway + s, f.y - s * 3, s, f.color);
    px(f.x + sway, f.y - s * 4, s, f.color);
    px(f.x + sway, f.y - s * 2, s, f.color);
    // Center
    px(f.x + sway, f.y - s * 3, s, "#ffee55");
  });
}

// ── CHOW CHOW PIXEL ART ──
function drawChowChow(t) {
  const cx = W / 2;        // center x
  const baseY = H * 0.52;  // ground line for dog
  const b = breathOffset;
  const scale = 1;

  // Colors matching the reference image
  const fur1 = "#e8a44a";   // main golden
  const fur2 = "#d4923a";   // darker golden
  const fur3 = "#f0bc6a";   // lighter golden
  const fur4 = "#c47e2e";   // darkest fur
  const fur5 = "#f8d898";   // lightest highlights
  const nose = "#2a1a0a";
  const eyeC = "#1a0e05";
  const tongue = "#e85a6a";
  const white = "#fff8f0";
  const cheek = "#f0a060";

  // ── Body (big fluffy oval) ──
  ctx.fillStyle = fur2;
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 50 + b, 58, 45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body highlight
  ctx.fillStyle = fur1;
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 45 + b, 50, 38, 0, 0, Math.PI * 2);
  ctx.fill();

  // Chest fluff
  ctx.fillStyle = fur3;
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 60 + b, 30, 25, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Legs (stubby pixel legs) ──
  const legY = baseY + 82 + b;
  drawPixelRect(cx - 35, legY, 16, 22, fur2);
  drawPixelRect(cx + 19, legY, 16, 22, fur2);
  // Paws
  drawPixelRect(cx - 37, legY + 18, 20, 8, fur4);
  drawPixelRect(cx + 17, legY + 18, 20, 8, fur4);
  // Paw pads
  drawPixelRect(cx - 33, legY + 22, 5, 4, "#3a2a1a");
  drawPixelRect(cx - 25, legY + 22, 5, 4, "#3a2a1a");
  drawPixelRect(cx + 21, legY + 22, 5, 4, "#3a2a1a");
  drawPixelRect(cx + 29, legY + 22, 5, 4, "#3a2a1a");

  // ── Tail ──
  const tailBaseX = cx + 55;
  const tailBaseY = baseY + 30 + b;
  ctx.save();
  ctx.translate(tailBaseX, tailBaseY);
  if (mood === "happy") {
    ctx.rotate(tailAngle);
  } else {
    ctx.rotate(0.3); // droopy tail
  }
  ctx.fillStyle = fur1;
  ctx.beginPath();
  ctx.ellipse(15, -15, 18, 10, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fur3;
  ctx.beginPath();
  ctx.ellipse(18, -18, 12, 7, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Head (big round fluffy head) ──
  const headY = baseY + b;

  // Fluffy mane around head
  ctx.fillStyle = fur2;
  ctx.beginPath();
  ctx.arc(cx, headY, 55, 0, Math.PI * 2);
  ctx.fill();

  // Main head
  ctx.fillStyle = fur1;
  ctx.beginPath();
  ctx.arc(cx, headY, 48, 0, Math.PI * 2);
  ctx.fill();

  // Lighter face center
  ctx.fillStyle = fur3;
  ctx.beginPath();
  ctx.arc(cx, headY + 5, 35, 0, Math.PI * 2);
  ctx.fill();

  // Extra fluff tufts (pixelated fur edges)
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const r = 50 + Math.sin(i * 3.7 + t * 0.001) * 4;
    const fx = cx + Math.cos(angle) * r;
    const fy = headY + Math.sin(angle) * r;
    px(fx, fy, 5, fur2);
    px(fx + 2, fy + 2, 3, fur3);
  }

  // ── Ears (round fluffy ears) ──
  // Left ear
  ctx.fillStyle = fur4;
  ctx.beginPath();
  ctx.ellipse(cx - 38, headY - 38, 18, 20, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fur1;
  ctx.beginPath();
  ctx.ellipse(cx - 36, headY - 36, 14, 16, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Inner ear
  ctx.fillStyle = cheek;
  ctx.beginPath();
  ctx.ellipse(cx - 35, headY - 34, 8, 10, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Right ear
  ctx.fillStyle = fur4;
  ctx.beginPath();
  ctx.ellipse(cx + 38, headY - 38, 18, 20, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fur1;
  ctx.beginPath();
  ctx.ellipse(cx + 36, headY - 36, 14, 16, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = cheek;
  ctx.beginPath();
  ctx.ellipse(cx + 35, headY - 34, 8, 10, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // ── Face features ──

  // Cheek fluff
  ctx.fillStyle = fur5;
  ctx.beginPath();
  ctx.ellipse(cx - 25, headY + 10, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 25, headY + 10, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Snout area
  ctx.fillStyle = fur5;
  ctx.beginPath();
  ctx.ellipse(cx, headY + 14, 18, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Eyes ──
  if (mood === "sad") {
    // Sad eyes — curved down
    ctx.strokeStyle = eyeC;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx - 16, headY - 4, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 16, headY - 4, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Tear drops
    ctx.fillStyle = "#88ccff";
    ctx.beginPath();
    ctx.ellipse(cx - 22, headY + 8, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 22, headY + 8, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Happy/neutral eyes
    const eyeOpenness = isBlinking ? 1 : 7;
    // Left eye
    ctx.fillStyle = eyeC;
    if (mood === "happy" && !isBlinking) {
      // Upside-down arcs (happy squint)
      ctx.lineWidth = 3;
      ctx.strokeStyle = eyeC;
      ctx.beginPath();
      ctx.arc(cx - 16, headY - 2, 7, Math.PI + 0.3, -0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 16, headY - 2, 7, Math.PI + 0.3, -0.3);
      ctx.stroke();
    } else {
      // Round eyes (neutral / blink)
      ctx.beginPath();
      ctx.ellipse(cx - 16, headY - 4, 6, eyeOpenness, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!isBlinking) {
        // White highlight
        ctx.fillStyle = white;
        px(cx - 18, headY - 7, 3, white);
      }
      ctx.fillStyle = eyeC;
      ctx.beginPath();
      ctx.ellipse(cx + 16, headY - 4, 6, eyeOpenness, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!isBlinking) {
        px(cx + 14, headY - 7, 3, white);
      }
    }
  }

  // ── Nose ──
  ctx.fillStyle = nose;
  ctx.beginPath();
  ctx.ellipse(cx, headY + 10, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Nose highlight
  px(cx - 2, headY + 8, 3, "#4a3a2a");

  // ── Mouth ──
  if (mood === "happy") {
    // Big smile
    ctx.strokeStyle = "#5a3a1a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, headY + 12, 12, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Tongue
    if (tongueOut) {
      ctx.fillStyle = tongue;
      ctx.beginPath();
      ctx.ellipse(cx + 3, headY + 24 + Math.sin(t * 0.005) * 2, 6, 8, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff7080";
      ctx.beginPath();
      ctx.ellipse(cx + 3, headY + 22, 4, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (mood === "sad") {
    // Frown
    ctx.strokeStyle = "#5a3a1a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, headY + 22, 8, Math.PI + 0.4, -0.4);
    ctx.stroke();
  } else {
    // Neutral small mouth
    ctx.strokeStyle = "#5a3a1a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 6, headY + 18);
    ctx.lineTo(cx + 6, headY + 18);
    ctx.stroke();
  }

  // ── Blush spots (happy only) ──
  if (mood === "happy") {
    ctx.fillStyle = "rgba(255,130,100,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx - 28, headY + 8, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 28, headY + 8, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Particles: Leaves ──
function spawnLeaf() {
  leaves.push({
    x: Math.random() * W,
    y: -10,
    vx: (Math.random() - 0.5) * 0.5,
    vy: 0.5 + Math.random() * 1,
    rot: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 4,
    size: 4 + Math.random() * 4,
    color: ["#e8a44a", "#d47030", "#c45a20", "#f0bc6a", "#aa4420"][Math.floor(Math.random() * 5)],
    life: 0
  });
}

function updateLeaves() {
  for (let i = leaves.length - 1; i >= 0; i--) {
    const l = leaves[i];
    l.x += l.vx + Math.sin(l.life * 0.03) * 0.5;
    l.y += l.vy;
    l.rot += l.rotSpeed;
    l.life++;
    if (l.y > H + 20) { leaves.splice(i, 1); continue; }

    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(l.rot * Math.PI / 180);
    ctx.fillStyle = l.color;
    ctx.fillRect(-l.size/2, -l.size/4, l.size, l.size/2);
    // Leaf detail
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(-1, -l.size/4, 2, l.size/2);
    ctx.restore();
  }
}

// ── Particles: Butterflies ──
function spawnButterfly() {
  butterflies.push({
    x: -20,
    y: 80 + Math.random() * 150,
    phase: Math.random() * Math.PI * 2,
    speed: 0.4 + Math.random() * 0.6,
    wingColor: ["#ff79b0", "#aa88ff", "#55bbff", "#ffaa55"][Math.floor(Math.random() * 4)],
    size: 4 + Math.random() * 3,
    life: 0
  });
}

function updateButterflies(t) {
  for (let i = butterflies.length - 1; i >= 0; i--) {
    const b = butterflies[i];
    b.x += b.speed;
    b.y += Math.sin(t * 0.004 + b.phase) * 0.8;
    b.life++;
    if (b.x > W + 30) { butterflies.splice(i, 1); continue; }

    const wingFlap = Math.sin(t * 0.02 + b.phase) * 0.7;
    ctx.fillStyle = b.wingColor;
    // Left wing
    ctx.beginPath();
    ctx.ellipse(b.x - 3, b.y, b.size * (0.5 + wingFlap * 0.5), b.size, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.ellipse(b.x + 3, b.y, b.size * (0.5 + wingFlap * 0.5), b.size, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(b.x - 1, b.y - b.size, 2, b.size * 2);
  }
}

// ── Sparkles (happy mode) ──
function spawnSparkle() {
  if (mood !== "happy") return;
  sparkles.push({
    x: W/2 - 80 + Math.random() * 160,
    y: H * 0.35 + Math.random() * 100,
    life: 0,
    maxLife: 30 + Math.random() * 30,
    size: 2 + Math.random() * 3
  });
}

function updateSparkles() {
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.life++;
    s.y -= 0.3;
    if (s.life > s.maxLife) { sparkles.splice(i, 1); continue; }

    const alpha = 1 - s.life / s.maxLife;
    ctx.fillStyle = `rgba(255,238,100,${alpha})`;
    // Star shape
    const sz = s.size;
    ctx.fillRect(s.x - sz/2, s.y - 1, sz, 2);
    ctx.fillRect(s.x - 1, s.y - sz/2, 2, sz);
  }
}

// ── Rain (sad mode) ──
const raindrops = [];
function updateRain() {
  if (mood !== "sad") { raindrops.length = 0; return; }
  if (Math.random() < 0.4) {
    raindrops.push({ x: Math.random() * W, y: -5, speed: 3 + Math.random() * 3 });
  }
  ctx.fillStyle = "rgba(100,160,255,0.4)";
  for (let i = raindrops.length - 1; i >= 0; i--) {
    const r = raindrops[i];
    r.y += r.speed;
    if (r.y > H) { raindrops.splice(i, 1); continue; }
    ctx.fillRect(r.x, r.y, 1, 6);
  }
}

// ── Glucose logic ──
function setGlucose(value) {
  glucose = value;
  badgeValue.textContent = value.toFixed(1);

  if (value < 4 || value > 10) {
    mood = "sad";
    badgeValue.className = "badge-value danger";
    if (value < 4) {
      moodLabel.textContent = "Lågt blodsocker! Valpen är orolig...";
      statusText.textContent = `⚠️ ${value.toFixed(1)} mmol/L — Lågt! Valpen är ledsen och orolig. Ät något snabbt!`;
    } else {
      moodLabel.textContent = "Högt blodsocker! Valpen mår dåligt...";
      statusText.textContent = `⚠️ ${value.toFixed(1)} mmol/L — Högt! Valpen är ledsen. Kolla ditt insulin.`;
    }
  } else if (value >= 4.5 && value <= 7.5) {
    mood = "happy";
    badgeValue.className = "badge-value";
    moodLabel.textContent = "Perfekt! Glad valp! 🐾";
    statusText.textContent = `✅ ${value.toFixed(1)} mmol/L — Perfekt zon (4.5–7.5)! Valpen är jätteglad och viftar på svansen!`;
  } else {
    mood = "neutral";
    badgeValue.className = "badge-value warning";
    moodLabel.textContent = "Okej, men valpen håller koll...";
    statusText.textContent = `🔸 ${value.toFixed(1)} mmol/L — Mellanläge. Valpen är lugn men observant.`;
  }
}

// ── Main render loop ──
let lastLeaf = 0;
let lastButterfly = 0;
let lastSparkle = 0;

function render(t) {
  ctx.clearRect(0, 0, W, H);

  // Breathing animation
  breathOffset = Math.sin(t * 0.003) * 3;

  // Tail wag
  if (mood === "happy") {
    tailAngle = Math.sin(t * 0.015) * 0.5;
  }

  // Blink timer
  blinkTimer++;
  if (blinkTimer > 120 + Math.random() * 100) {
    isBlinking = true;
    if (blinkTimer > 130 + Math.random() * 10) {
      isBlinking = false;
      blinkTimer = 0;
    }
  }

  // Toggle tongue
  if (frame % 300 === 0) tongueOut = !tongueOut;

  // Spawn particles
  if (t - lastLeaf > 800) { spawnLeaf(); lastLeaf = t; }
  if (t - lastButterfly > 3000 && mood !== "sad") { spawnButterfly(); lastButterfly = t; }
  if (t - lastSparkle > 200) { spawnSparkle(); lastSparkle = t; }

  // Draw scene
  drawSky();
  drawSun(t);
  drawClouds(t);
  drawGround();
  drawFlowers(t);
  updateLeaves();
  updateButterflies(t);
  drawChowChow(t);
  updateSparkles();
  updateRain();

  frame++;
  requestAnimationFrame(render);
}

// ── Event listeners ──
applyBtn.addEventListener("click", () => {
  const v = Number(glucoseInput.value);
  if (!isNaN(v) && v >= 0) setGlucose(v);
});

glucoseInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") applyBtn.click();
});

mockBtn.addEventListener("click", () => {
  const v = Math.max(2.2, Math.min(13.8, 6 + (Math.random() - 0.5) * 8));
  glucoseInput.value = v.toFixed(1);
  setGlucose(v);
});

// ── Dexcom Share integration ──
connectBtn.addEventListener("click", async () => {
  dexcomState.textContent = "Ansluter...";
  statusDot.className = "status-dot";
  try {
    const res = await fetch("/api/dexcom/connect", { method: "POST" });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    dexcomState.textContent = data.message || "Kopplad!";
    statusDot.className = "status-dot connected";
    pollDexcom();
  } catch {
    dexcomState.textContent = "Kunde inte koppla (kör backend? se README)";
    statusDot.className = "status-dot error";
  }
});

async function pollDexcom() {
  try {
    const res = await fetch("/api/glucose/latest");
    if (!res.ok) return;
    const data = await res.json();
    const v = Number(data.valueMmolL);
    if (!isNaN(v)) {
      glucoseInput.value = v.toFixed(1);
      setGlucose(v);
      statusDot.className = "status-dot connected";
    }
  } catch { /* silent */ }
}

// Poll Dexcom every 60s if connected
setInterval(() => {
  if (statusDot.classList.contains("connected")) pollDexcom();
}, 60000);

// ── Start ──
setGlucose(glucose);
requestAnimationFrame(render);
