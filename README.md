# GlukoBuddy

En Tamagotchi‑inspirerad glukosmonitor med en pixel‑Chow Chow. Appen visar ett glukosvärde som gör valpen glad, neutral eller ledsen.

## Kör igång

```bash
npm install
npm run dev
```

Öppna sedan `http://localhost:3000`.

## Funktioner

- Pixel‑Chow Chow med animationer och humör baserat på glukos
- Automatisk uppdatering var 2:e minut efter inloggning
- Manuell uppdatering och simulerad Dexcom‑värdeknapp
- Enkel follower-login med lösenordet `follower123`
- Dexcom-loginfälten för e-post och lösenord finns i appen
- Mock-Dexcom-knapp med tydlig text om att riktig backend krävs

## Dexcom G7

Frontenden visar en mock-anslutning. För riktig Dexcom G7-anslutning behövs en separat backend som hanterar Share/OAuth och returnerar säkrade glukosvärden till klienten.

## GitHub Pages

Koppla repo till GitHub Pages med:

- Branch: `main`
- Folder: `/ (root)`

Sidan kan då publiceras som en statisk Next.js-app via `next export` eller genom ett enklare frontend-ramverk.
