const glucoseInput = document.getElementById("glucoseInput");
const applyManualButton = document.getElementById("applyManual");
const mockDexcomButton = document.getElementById("mockDexcom");
const connectDexcomButton = document.getElementById("connectDexcom");
const statusText = document.getElementById("statusText");
const dexcomState = document.getElementById("dexcomState");
const emotion = document.getElementById("emotion");
const tail = document.getElementById("tail");
const leafLayer = document.getElementById("leafLayer");
const butterflyLayer = document.getElementById("butterflyLayer");

function setPetState(glucose) {
  const lowBad = glucose < 4;
  const highBad = glucose > 10;
  const idealWag = glucose >= 4.5 && glucose <= 7.5;

  if (lowBad || highBad) {
    emotion.textContent = ":'(";
    tail.classList.remove("wagging");
    statusText.textContent = `Ledsen valp: ${glucose.toFixed(1)} mmol/L (utanför tryggt område).`;
    return;
  }

  if (idealWag) {
    emotion.textContent = ":D";
    tail.classList.add("wagging");
    statusText.textContent = `Glad valp: ${glucose.toFixed(1)} mmol/L (perfekt zon 4.5-7.5).`;
    return;
  }

  emotion.textContent = ":)";
  tail.classList.remove("wagging");
  statusText.textContent = `Lugn valp: ${glucose.toFixed(1)} mmol/L (mellanläge).`;
}

function parseAndApplyInput() {
  const value = Number(glucoseInput.value);
  if (Number.isNaN(value) || value < 0) {
    statusText.textContent = "Ogiltigt värde. Ange mmol/L som positivt tal.";
    return;
  }
  setPetState(value);
}

async function startDexcomLogin() {
  try {
    dexcomState.textContent = "Dexcom: kontrollerar Share-koppling...";
    const response = await fetch("/api/dexcom/connect", { method: "POST" });
    if (!response.ok) {
      throw new Error(`Koppling misslyckades (${response.status})`);
    }
    const data = await response.json();
    dexcomState.textContent = data.message || "Dexcom: Share-koppling aktiv.";
    await fetchLatestDexcomGlucose();
  } catch (error) {
    dexcomState.textContent = `Dexcom: fel vid Share-koppling (${error.message}).`;
  }
}

async function fetchLatestDexcomGlucose() {
  try {
    const response = await fetch("/api/glucose/latest");
    if (!response.ok) {
      throw new Error(`API-fel (${response.status})`);
    }
    const data = await response.json();
    const value = Number(data.valueMmolL);
    if (Number.isNaN(value)) {
      throw new Error("Ogiltigt glukosvärde från backend.");
    }
    glucoseInput.value = value.toFixed(1);
    setPetState(value);
    dexcomState.textContent = "Dexcom: kopplad och uppdaterad.";
  } catch (_error) {
    dexcomState.textContent = "Dexcom: inte kopplad (mock eller manuell inmatning aktiv).";
  }
}

function spawnLeaf() {
  const leaf = document.createElement("div");
  leaf.className = "leaf";
  leaf.style.left = `${Math.floor(Math.random() * 95)}%`;
  leaf.style.animationDuration = `${5 + Math.random() * 6}s`;
  leafLayer.appendChild(leaf);
  setTimeout(() => leaf.remove(), 12000);
}

function spawnButterfly() {
  const b = document.createElement("div");
  b.className = "butterfly";
  b.style.left = `${Math.floor(Math.random() * 30)}px`;
  b.style.top = `${70 + Math.floor(Math.random() * 220)}px`;
  b.style.animationDuration = `${4 + Math.random() * 4}s`;
  butterflyLayer.appendChild(b);
  setTimeout(() => b.remove(), 9000);
}

// Mock-strategi för Dexcom G7 dataflöde i frontend.
// Nästa steg: byt ut generateMockDexcomValue mot fetch från backend som hanterar OAuth.
function generateMockDexcomValue() {
  const base = 6.0;
  const swing = (Math.random() - 0.5) * 6.8;
  return Math.max(2.2, Math.min(13.8, base + swing));
}

applyManualButton.addEventListener("click", parseAndApplyInput);
mockDexcomButton.addEventListener("click", () => {
  const value = generateMockDexcomValue();
  glucoseInput.value = value.toFixed(1);
  setPetState(value);
});
connectDexcomButton.addEventListener("click", startDexcomLogin);

setPetState(Number(glucoseInput.value));
fetchLatestDexcomGlucose();
setInterval(spawnLeaf, 550);
setInterval(spawnButterfly, 2200);
setInterval(fetchLatestDexcomGlucose, 60_000);
