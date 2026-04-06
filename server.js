const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const PORT = Number(process.env.PORT || 8080);
const DEXCOM_SHARE_HOST = process.env.DEXCOM_SHARE_HOST || "shareous1.dexcom.com";
const DEXCOM_APP_ID = "d89443d2-327c-4a6f-89e5-496bbb0317db";

function requireShareCredentials() {
  const username = process.env.DEXCOM_SHARE_USERNAME;
  const password = process.env.DEXCOM_SHARE_PASSWORD;
  if (!username || !password) {
    const error = new Error("Missing Dexcom Share credentials in environment.");
    error.statusCode = 400;
    throw error;
  }
  return { username, password };
}

async function dexcomShareRequest(pathname, body, query = "") {
  const url = `https://${DEXCOM_SHARE_HOST}${pathname}${query}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`Dexcom Share error (${response.status}): ${text}`);
    error.statusCode = response.status;
    throw error;
  }
  return text;
}

async function getDexcomShareSession() {
  const { username, password } = requireShareCredentials();

  const accountId = await dexcomShareRequest(
    "/ShareWebServices/Services/General/AuthenticatePublisherAccount",
    {
      accountName: username,
      password,
      applicationId: DEXCOM_APP_ID
    }
  );

  const sessionId = await dexcomShareRequest(
    "/ShareWebServices/Services/General/LoginPublisherAccountById",
    {
      accountId: accountId.replace(/"/g, ""),
      password,
      applicationId: DEXCOM_APP_ID
    }
  );

  return { accountId: accountId.replace(/"/g, ""), sessionId: sessionId.replace(/"/g, "") };
}

function mgdlToMmol(valueMgdl) {
  return valueMgdl / 18.0;
}

app.post("/api/dexcom/connect", async (_req, res) => {
  try {
    await getDexcomShareSession();
    res.json({ ok: true, message: "Dexcom Share kopplad." });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message
    });
  }
});

app.get("/api/glucose/latest", async (_req, res) => {
  try {
    const { accountId, sessionId } = await getDexcomShareSession();
    const raw = await dexcomShareRequest(
      "/ShareWebServices/Services/Publisher/ReadPublisherLatestGlucoseValues",
      accountId,
      `?sessionId=${encodeURIComponent(sessionId)}&minutes=1440&maxCount=1`
    );

    const values = JSON.parse(raw);
    if (!Array.isArray(values) || values.length === 0) {
      return res.status(404).json({ error: "No glucose values returned from Dexcom Share." });
    }

    const latest = values[0];
    const mmol = mgdlToMmol(Number(latest.Value));
    const trend = latest.Trend;
    const timestamp = latest.WT ? new Date(Number(String(latest.WT).replace(/\D/g, ""))) : new Date();

    res.json({
      valueMmolL: Number(mmol.toFixed(1)),
      valueMgdl: Number(latest.Value),
      trend,
      timestamp: timestamp.toISOString(),
      source: "dexcom-share"
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`GlukoBuddy server running on http://localhost:${PORT}`);
});
