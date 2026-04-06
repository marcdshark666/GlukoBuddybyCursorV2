// ── GlukoBuddy — Pixel Chow Chow Tamagotchi ──

const canvas = document.getElementById("gardenCanvas");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

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

// Modal refs
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const dexcomForm = document.getElementById("dexcomForm");
const dexUsername = document.getElementById("dexUsername");
const dexPassword = document.getElementById("dexPassword");
const dexRegion = document.getElementById("dexRegion");
const loginBtn = document.getElementById("loginBtn");
const modalStatus = document.getElementById("modalStatus");

// ── State ──
let glucose = 6.2;
let mood = "happy";
let frame = 0;
let breathOffset = 0;
let tailAngle = 0;
let blinkTimer = 0;
let isBlinking = false;
let tongueOut = true;
let dexcomSessionId = null;
let dexcomPolling = null;

// Particles
const leaves = [];
const butterflies = [];
const sparkles = [];
const flowers = [];
const raindrops = [];

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

// ══════════════════════════════════════
// ── DEXCOM SHARE API ──
// ══════════════════════════════════════

const DEXCOM_APP_ID = "d89443d2-327c-4a6f-89e5-496bbb0317db";

const DEXCOM_HOSTS = {
  us: "https://share2.dexcom.com",
  eu: "https://shareous1.dexcom.com"
};

const CORS_PROXY = "https://corsproxy.io/?url=";

function getDexcomUrl(region) {
  return DEXCOM_HOSTS[region] || DEXCOM_HOSTS.eu;
}

// Login to Dexcom Share and get session ID
async function dexcomLogin(username, password, region) {
  const baseUrl = getDexcomUrl(region);
  const loginUrl = `${baseUrl}/ShareWebServices/Services/General/LoginPublisherAccountByName`;

  const response = await fetch(CORS_PROXY + encodeURIComponent(loginUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accountName: username,
      password: password,
      applicationId: DEXCOM_APP_ID
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 500 && errorText.includes("AccountPasswordInvalid")) {
      throw new Error("Fel användarnamn eller lösenord.");
    }
    if (response.status === 500 && errorText.includes("SSO_AuthenticateAccountNotFound")) {
      throw new Error("Kontot hittades inte. Kontrollera användarnamn.");
    }
    if (response.status === 500 && errorText.includes("SSO_InternalError")) {
      throw new Error("Fel region? Testa byta mellan EU/USA.");
    }
    throw new Error(`Dexcom-fel (${response.status}): ${errorText.substring(0, 100)}`);
  }

  const sessionId = await response.json();
  if (!sessionId || sessionId === "00000000-0000-0000-0000-000000000000") {
    throw new Error("Ogiltig session. Kontrollera inloggning och att Share är aktiverat.");
  }

  return sessionId;
}

// Fetch latest glucose reading from Dexcom Share
async function dexcomGetLatestGlucose(sessionId, region) {
  const baseUrl = getDexcomUrl(region);
  const readUrl = `${baseUrl}/ShareWebServices/Services/Publisher/ReadPublisherLatestGlucoseValues?sessionId=${sessionId}&minutes=1440&maxCount=1`;

  const response = await fetch(CORS_PROXY + encodeURIComponent(readUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });

  if (!response.ok) {
    if (response.status === 500) {
      throw new Error("SESSION_EXPIRED");
    }
    throw new Error(`Kunde inte hämta glukosvärde (${response.status})`);
  }

  const readings = await response.json();
  if (!readings || readings.length === 0) {
    throw new Error("Inga glukosvärden hittades. Kontrollera att sensorn skickar data.");
  }

  const reading = readings[0];
  const mgdl = reading.Value;
  const mmol = Math.round((mgdl / 18.0182) * 10) / 10;
  const trend = reading.Trend;

  // Parse timestamp: /Date(1234567890000)/
  const tsMatch = reading.WT.match(/\d+/);
  const timestamp = tsMatch ? new Date(parseInt(tsMatch[0])) : new Date();

  return { mmol, mgdl, trend, timestamp };
}

// Trend arrows
function getTrendArrow(trend) {
  const arrows = {
    1: "⬆⬆",   // DoubleUp
    2: "⬆",     // SingleUp
    3: "↗",     // FortyFiveUp
    4: "➡",     // Flat
    5: "↘",     // FortyFiveDown
    6: "⬇",     // SingleDown
    7: "⬇⬇",   // DoubleDown
    8: "?",      // NotComputable
    9: "—"       // RateOutOfRange
  };
  return arrows[trend] || "";
}

// ══════════════════════════════════════
// ── MODAL & LOGIN FLOW ──
// ══════════════════════════════════════

connectBtn.addEventListener("click", () => {
  // Check if we have stored credentials
  const stored = localStorage.getItem("glukobuddy_dexcom");
  if (stored) {
    const creds = JSON.parse(stored);
    dexUsername.value = creds.username || "";
    dexRegion.value = creds.region || "eu";
  }
  modalOverlay.classList.add("open");
  dexUsername.focus();
});

modalClose.addEventListener("click", () => {
  modalOverlay.classList.remove("open");
});

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.remove("open");
});

dexcomForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = dexUsername.value.trim();
  const password = dexPassword.value;
  const region = dexRegion.value;

  if (!username || !password) {
    setModalStatus("Fyll i användarnamn och lösenord.", "error");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Ansluter...";
  setModalStatus("Kontaktar Dexcom Share...", "loading");
  statusDot.className = "status-dot loading";
  dexcomState.textContent = "Ansluter...";

  try {
    // Step 1: Login
    dexcomSessionId = await dexcomLogin(username, password, region);
    setModalStatus("Inloggad! Hämtar glukosvärde...", "loading");

    // Step 2: Get latest reading
    const reading = await dexcomGetLatestGlucose(dexcomSessionId, region);

    // Save credentials (not password in production, but for personal use)
    localStorage.setItem("glukobuddy_dexcom", JSON.stringify({
      username, password, region, sessionId: dexcomSessionId
    }));

    // Update UI
    glucoseInput.value = reading.mmol.toFixed(1);
    setGlucose(reading.mmol);

    const trendArrow = getTrendArrow(reading.trend);
    const timeAgo = getTimeAgo(reading.timestamp);

    setModalStatus(`Kopplad! ${reading.mmol} mmol/L ${trendArrow} (${timeAgo})`, "success");
    statusDot.className = "status-dot connected";
    dexcomState.textContent = `Kopplad ${trendArrow} ${reading.mmol} mmol/L`;

    // Start polling every 5 minutes
    startDexcomPolling(region);

    // Close modal after 2 seconds
    setTimeout(() => modalOverlay.classList.remove("open"), 2000);

  } catch (err) {
    setModalStatus(err.message, "error");
    statusDot.className = "status-dot error";
    dexcomState.textContent = "Koppling misslyckades";
  }

  loginBtn.disabled = false;
  loginBtn.textContent = "Logga in & Koppla";
});

function setModalStatus(text, type) {
  modalStatus.textContent = text;
  modalStatus.className = `modal-status ${type}`;
}

function getTimeAgo(date) {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just nu";
  if (mins < 60) return `${mins} min sedan`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m sedan`;
}

// Poll Dexcom every 5 minutes
function startDexcomPolling(region) {
  if (dexcomPolling) clearInterval(dexcomPolling);

  dexcomPolling = setInterval(async () => {
    if (!dexcomSessionId) return;

    try {
      const reading = await dexcomGetLatestGlucose(dexcomSessionId, region);
      glucoseInput.value = reading.mmol.toFixed(1);
      setGlucose(reading.mmol);

      const trendArrow = getTrendArrow(reading.trend);
      const timeAgo = getTimeAgo(reading.timestamp);
      statusDot.className = "status-dot connected";
      dexcomState.textContent = `Kopplad ${trendArrow} ${reading.mmol} mmol/L (${timeAgo})`;
    } catch (err) {
      if (err.message === "SESSION_EXPIRED") {
        // Try re-login
        const stored = localStorage.getItem("glukobuddy_dexcom");
        if (stored) {
          const creds = JSON.parse(stored);
          try {
            dexcomSessionId = await dexcomLogin(creds.username, creds.password, creds.region);
            localStorage.setItem("glukobuddy_dexcom", JSON.stringify({
              ...creds, sessionId: dexcomSessionId
            }));
          } catch {
            statusDot.className = "status-dot error";
            dexcomState.textContent = "Session utgången — logga in igen";
            clearInterval(dexcomPolling);
          }
        }
      }
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// Auto-reconnect on page load if credentials exist
(function autoConnect() {
  const stored = localStorage.getItem("glukobuddy_dexcom");
  if (!stored) return;

  const creds = JSON.parse(stored);
  statusDot.className = "status-dot loading";
  dexcomState.textContent = "Återansluter...";

  (async () => {
    try {
      dexcomSessionId = await dexcomLogin(creds.username, creds.password, creds.region);
      const reading = await dexcomGetLatestGlucose(dexcomSessionId, creds.region);
      glucoseInput.value = reading.mmol.toFixed(1);
      setGlucose(reading.mmol);

      const trendArrow = getTrendArrow(reading.trend);
      statusDot.className = "status-dot connected";
      dexcomState.textContent = `Kopplad ${trendArrow} ${reading.mmol} mmol/L`;

      localStorage.setItem("glukobuddy_dexcom", JSON.stringify({
        ...creds, sessionId: dexcomSessionId
      }));

      startDexcomPolling(creds.region);
    } catch {
      statusDot.className = "status-dot error";
      dexcomState.textContent = "Kunde inte återansluta — klicka Koppla";
    }
  })();
})();


// ══════════════════════════════════════
// ── PIXEL ART ENGINE ──
// ══════════════════════════════════════

function px(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), size, size);
}

function drawPixelRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function drawSky() {
  const skyColors = mood === "sad"
    ? ["#3a3a5c", "#5a5a7c", "#7a7a9c"]
    : ["#4a90d9", "#6ab4f0", "#9fd4ff"];
  const bandH = Math.ceil(H * 0.6 / skyColors.length);
  skyColors.forEach((c, i) => drawPixelRect(0, i * bandH, W, bandH + 1, c));
}

function drawSun(t) {
  if (mood === "sad") {
    ctx.fillStyle = "#c8c8dd";
    ctx.beginPath(); ctx.arc(W - 60, 55, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3a3a5c";
    ctx.beginPath(); ctx.arc(W - 50, 48, 18, 0, Math.PI * 2); ctx.fill();
  } else {
    const pulse = Math.sin(t * 0.002) * 3;
    ctx.fillStyle = "#ffee44";
    ctx.beginPath(); ctx.arc(W - 60, 55, 24 + pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffcc22";
    ctx.beginPath(); ctx.arc(W - 60, 55, 18, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + t * 0.001;
      ctx.strokeStyle = "rgba(255,238,68,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W - 60 + Math.cos(angle) * 30, 55 + Math.sin(angle) * 30);
      ctx.lineTo(W - 60 + Math.cos(angle) * 38, 55 + Math.sin(angle) * 38);
      ctx.stroke();
    }
  }
}

const clouds = [
  { x: 30, y: 30, w: 70, speed: 0.3 },
  { x: 200, y: 55, w: 55, speed: 0.2 },
  { x: 350, y: 25, w: 60, speed: 0.35 },
];

function drawClouds(t) {
  const cc = mood === "sad" ? "#5a5a7a" : "#ffffff";
  clouds.forEach(c => {
    const cx = (c.x + t * c.speed * 0.02) % (W + 100) - 50;
    ctx.fillStyle = cc;
    ctx.globalAlpha = mood === "sad" ? 0.6 : 0.85;
    ctx.beginPath();
    ctx.arc(cx, c.y, c.w * 0.28, 0, Math.PI * 2);
    ctx.arc(cx + c.w * 0.25, c.y - 8, c.w * 0.22, 0, Math.PI * 2);
    ctx.arc(cx + c.w * 0.5, c.y, c.w * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawGround() {
  const groundY = H * 0.58;
  const g1 = mood === "sad" ? "#3a5a2a" : "#5cb338";
  const g2 = mood === "sad" ? "#2a4a1a" : "#4a9a28";
  const g3 = mood === "sad" ? "#1a3a0a" : "#3d8520";
  drawPixelRect(0, groundY, W, H - groundY, g2);
  drawPixelRect(0, groundY, W, 8, g1);
  drawPixelRect(0, H - 40, W, 40, g3);
  for (let x = 0; x < W; x += 12) {
    const h = 4 + Math.sin(x * 0.5) * 3;
    drawPixelRect(x, groundY - h, 3, h, g1);
    drawPixelRect(x + 6, groundY - h + 2, 2, h - 2, g1);
  }
}

function drawFlowers(t) {
  if (mood === "sad") return;
  flowers.forEach(f => {
    const sway = Math.sin(t * 0.002 + f.swayOffset) * 2;
    drawPixelRect(f.x + sway, f.y - f.size * 3, 2, f.size * 3, "#3a7a20");
    const s = f.size;
    px(f.x + sway - s, f.y - s * 3, s, f.color);
    px(f.x + sway + s, f.y - s * 3, s, f.color);
    px(f.x + sway, f.y - s * 4, s, f.color);
    px(f.x + sway, f.y - s * 2, s, f.color);
    px(f.x + sway, f.y - s * 3, s, "#ffee55");
  });
}

// ── CHOW CHOW ──
function drawChowChow(t) {
  const cx = W / 2;
  const baseY = H * 0.52;
  const b = breathOffset;

  const fur1 = "#e8a44a";
  const fur2 = "#d4923a";
  const fur3 = "#f0bc6a";
  const fur4 = "#c47e2e";
  const fur5 = "#f8d898";
  const nose = "#2a1a0a";
  const eyeC = "#1a0e05";
  const tongue = "#e85a6a";
  const white = "#fff8f0";

  // Body
  ctx.fillStyle = fur2;
  ctx.beginPath(); ctx.ellipse(cx, baseY + 50 + b, 58, 45, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fur1;
  ctx.beginPath(); ctx.ellipse(cx, baseY + 45 + b, 50, 38, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fur3;
  ctx.beginPath(); ctx.ellipse(cx, baseY + 60 + b, 30, 25, 0, 0, Math.PI * 2); ctx.fill();

  // Legs
  const legY = baseY + 82 + b;
  drawPixelRect(cx - 35, legY, 16, 22, fur2);
  drawPixelRect(cx + 19, legY, 16, 22, fur2);
  drawPixelRect(cx - 37, legY + 18, 20, 8, fur4);
  drawPixelRect(cx + 17, legY + 18, 20, 8, fur4);
  drawPixelRect(cx - 33, legY + 22, 5, 4, "#3a2a1a");
  drawPixelRect(cx - 25, legY + 22, 5, 4, "#3a2a1a");
  drawPixelRect(cx + 21, legY + 22, 5, 4, "#3a2a1a");
  drawPixelRect(cx + 29, legY + 22, 5, 4, "#3a2a1a");

  // Tail
  ctx.save();
  ctx.translate(cx + 55, baseY + 30 + b);
  ctx.rotate(mood === "happy" ? tailAngle : 0.3);
  ctx.fillStyle = fur1;
  ctx.beginPath(); ctx.ellipse(15, -15, 18, 10, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fur3;
  ctx.beginPath(); ctx.ellipse(18, -18, 12, 7, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Head mane
  const headY = baseY + b;
  ctx.fillStyle = fur2;
  ctx.beginPath(); ctx.arc(cx, headY, 55, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fur1;
  ctx.beginPath(); ctx.arc(cx, headY, 48, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fur3;
  ctx.beginPath(); ctx.arc(cx, headY + 5, 35, 0, Math.PI * 2); ctx.fill();

  // Fur tufts
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const r = 50 + Math.sin(i * 3.7 + t * 0.001) * 4;
    px(cx + Math.cos(angle) * r, headY + Math.sin(angle) * r, 5, fur2);
  }

  // Ears
  ctx.fillStyle = fur4;
  ctx.beginPath(); ctx.ellipse(cx - 38, headY - 38, 18, 20, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fur1;
  ctx.beginPath(); ctx.ellipse(cx - 36, headY - 36, 14, 16, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f0a060";
  ctx.beginPath(); ctx.ellipse(cx - 35, headY - 34, 8, 10, -0.3, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = fur4;
  ctx.beginPath(); ctx.ellipse(cx + 38, headY - 38, 18, 20, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fur1;
  ctx.beginPath(); ctx.ellipse(cx + 36, headY - 36, 14, 16, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f0a060";
  ctx.beginPath(); ctx.ellipse(cx + 35, headY - 34, 8, 10, 0.3, 0, Math.PI * 2); ctx.fill();

  // Cheek fluff
  ctx.fillStyle = fur5;
  ctx.beginPath(); ctx.ellipse(cx - 25, headY + 10, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 25, headY + 10, 16, 12, 0, 0, Math.PI * 2); ctx.fill();

  // Snout
  ctx.fillStyle = fur5;
  ctx.beginPath(); ctx.ellipse(cx, headY + 14, 18, 14, 0, 0, Math.PI * 2); ctx.fill();

  // Eyes
  if (mood === "sad") {
    ctx.strokeStyle = eyeC; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx - 16, headY - 4, 6, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 16, headY - 4, 6, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = "#88ccff";
    ctx.beginPath(); ctx.ellipse(cx - 22, headY + 8, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 22, headY + 8, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mood === "happy" && !isBlinking) {
    ctx.strokeStyle = eyeC; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx - 16, headY - 2, 7, Math.PI + 0.3, -0.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 16, headY - 2, 7, Math.PI + 0.3, -0.3); ctx.stroke();
  } else {
    const ey = isBlinking ? 1 : 7;
    ctx.fillStyle = eyeC;
    ctx.beginPath(); ctx.ellipse(cx - 16, headY - 4, 6, ey, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 16, headY - 4, 6, ey, 0, 0, Math.PI * 2); ctx.fill();
    if (!isBlinking) {
      px(cx - 18, headY - 7, 3, white);
      px(cx + 14, headY - 7, 3, white);
    }
  }

  // Nose
  ctx.fillStyle = nose;
  ctx.beginPath(); ctx.ellipse(cx, headY + 10, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  px(cx - 2, headY + 8, 3, "#4a3a2a");

  // Mouth
  if (mood === "happy") {
    ctx.strokeStyle = "#5a3a1a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, headY + 12, 12, 0.2, Math.PI - 0.2); ctx.stroke();
    if (tongueOut) {
      ctx.fillStyle = tongue;
      ctx.beginPath(); ctx.ellipse(cx + 3, headY + 24 + Math.sin(t * 0.005) * 2, 6, 8, 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ff7080";
      ctx.beginPath(); ctx.ellipse(cx + 3, headY + 22, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (mood === "sad") {
    ctx.strokeStyle = "#5a3a1a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, headY + 22, 8, Math.PI + 0.4, -0.4); ctx.stroke();
  } else {
    ctx.strokeStyle = "#5a3a1a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 6, headY + 18); ctx.lineTo(cx + 6, headY + 18); ctx.stroke();
  }

  // Blush (happy)
  if (mood === "happy") {
    ctx.fillStyle = "rgba(255,130,100,0.35)";
    ctx.beginPath(); ctx.ellipse(cx - 28, headY + 8, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 28, headY + 8, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// ── Particles ──
function spawnLeaf() {
  leaves.push({
    x: Math.random() * W, y: -10,
    vx: (Math.random() - 0.5) * 0.5, vy: 0.5 + Math.random(),
    rot: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 4,
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
    ctx.restore();
  }
}

function spawnButterfly() {
  butterflies.push({
    x: -20, y: 80 + Math.random() * 150,
    phase: Math.random() * Math.PI * 2,
    speed: 0.4 + Math.random() * 0.6,
    wingColor: ["#ff79b0", "#aa88ff", "#55bbff", "#ffaa55"][Math.floor(Math.random() * 4)],
    size: 4 + Math.random() * 3, life: 0
  });
}

function updateButterflies(t) {
  for (let i = butterflies.length - 1; i >= 0; i--) {
    const b = butterflies[i];
    b.x += b.speed; b.y += Math.sin(t * 0.004 + b.phase) * 0.8;
    if (b.x > W + 30) { butterflies.splice(i, 1); continue; }
    const wf = Math.sin(t * 0.02 + b.phase) * 0.7;
    ctx.fillStyle = b.wingColor;
    ctx.beginPath(); ctx.ellipse(b.x - 3, b.y, b.size * (0.5 + wf * 0.5), b.size, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(b.x + 3, b.y, b.size * (0.5 + wf * 0.5), b.size, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(b.x - 1, b.y - b.size, 2, b.size * 2);
  }
}

function spawnSparkle() {
  if (mood !== "happy") return;
  sparkles.push({
    x: W/2 - 80 + Math.random() * 160, y: H * 0.35 + Math.random() * 100,
    life: 0, maxLife: 30 + Math.random() * 30, size: 2 + Math.random() * 3
  });
}

function updateSparkles() {
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.life++; s.y -= 0.3;
    if (s.life > s.maxLife) { sparkles.splice(i, 1); continue; }
    const a = 1 - s.life / s.maxLife;
    ctx.fillStyle = `rgba(255,238,100,${a})`;
    ctx.fillRect(s.x - s.size/2, s.y - 1, s.size, 2);
    ctx.fillRect(s.x - 1, s.y - s.size/2, 2, s.size);
  }
}

function updateRain() {
  if (mood !== "sad") { raindrops.length = 0; return; }
  if (Math.random() < 0.4) raindrops.push({ x: Math.random() * W, y: -5, speed: 3 + Math.random() * 3 });
  ctx.fillStyle = "rgba(100,160,255,0.4)";
  for (let i = raindrops.length - 1; i >= 0; i--) {
    const r = raindrops[i]; r.y += r.speed;
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
    moodLabel.textContent = value < 4 ? "Lågt blodsocker! Valpen är orolig..." : "Högt blodsocker! Valpen mår dåligt...";
    statusText.textContent = value < 4
      ? `⚠️ ${value.toFixed(1)} mmol/L — Lågt! Valpen är ledsen. Ät något snabbt!`
      : `⚠️ ${value.toFixed(1)} mmol/L — Högt! Valpen är ledsen. Kolla ditt insulin.`;
  } else if (value >= 4.5 && value <= 7.5) {
    mood = "happy";
    badgeValue.className = "badge-value";
    moodLabel.textContent = "Perfekt! Glad valp!";
    statusText.textContent = `✅ ${value.toFixed(1)} mmol/L — Perfekt zon (4.5–7.5)! Valpen viftar på svansen!`;
  } else {
    mood = "neutral";
    badgeValue.className = "badge-value warning";
    moodLabel.textContent = "Okej, men valpen håller koll...";
    statusText.textContent = `🔸 ${value.toFixed(1)} mmol/L — Mellanläge. Valpen är lugn men observant.`;
  }
}

// ── Main render loop ──
let lastLeaf = 0, lastButterfly = 0, lastSparkle = 0;

function render(t) {
  ctx.clearRect(0, 0, W, H);
  breathOffset = Math.sin(t * 0.003) * 3;
  if (mood === "happy") tailAngle = Math.sin(t * 0.015) * 0.5;
  blinkTimer++;
  if (blinkTimer > 120 + Math.random() * 100) {
    isBlinking = true;
    if (blinkTimer > 130) { isBlinking = false; blinkTimer = 0; }
  }
  if (frame % 300 === 0) tongueOut = !tongueOut;

  if (t - lastLeaf > 800) { spawnLeaf(); lastLeaf = t; }
  if (t - lastButterfly > 3000 && mood !== "sad") { spawnButterfly(); lastButterfly = t; }
  if (t - lastSparkle > 200) { spawnSparkle(); lastSparkle = t; }

  drawSky(); drawSun(t); drawClouds(t); drawGround(); drawFlowers(t);
  updateLeaves(); updateButterflies(t); drawChowChow(t);
  updateSparkles(); updateRain();

  frame++;
  requestAnimationFrame(render);
}

// ── Manual controls ──
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

// ── Start ──
setGlucose(glucose);
requestAnimationFrame(render);
