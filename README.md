# GlukoBuddybyCursorV2

Pixel Tamagotchi-liknande chow chow som reagerar pa glukos (mmol/L), med pixeltradgard (fallande lov + fjarlilar).

## Glukosregler i appen

- Ledsen hund: `> 10` eller `< 4` mmol/L
- Glad + svansvift: `4.5 - 7.5` mmol/L
- Lugn/neutral: allt annat mellan dessa omraden

## Koer lokalt

Oppna `index.html` i webblasare.

## Enklaste privata koppling (Reddit/community-stil)

Byggd nu for enklast mojliga setup utan Nightscout:

1. Backend loggar in mot **Dexcom Share** med konto-uppgifter i `.env`.
2. Frontend fragar bara backend om senaste glukos.
3. Inga Dexcom-loesenord i browsern.

Detta ar oftast snabbaste vagen for privatperson/hobbyprojekt.

## Endpoints

- `POST /api/dexcom/connect` -> testar att Share-inloggning fungerar
- `GET /api/glucose/latest` -> senaste glukos i mmol/L och mg/dL

Frontendknappen `Koppla Dexcom Share` anropar connect-endpointen och appen pollar latest-endpointen.

## Setup

1. Installera:
   - `npm install`
2. Kopiera `.env.example` till `.env` och fyll i:
   - `DEXCOM_SHARE_USERNAME`
   - `DEXCOM_SHARE_PASSWORD`
   - ev. `DEXCOM_SHARE_HOST`
3. Starta:
   - `npm start`
4. Oppna:
   - `http://localhost:8080`

## Vad jag behover av dig for att koppla live + pusha

1. GitHub access/token eller att du kor `git push` lokalt.
2. Dexcom Share uppgifter:
   - Username
   - Password
   - Region/host (om annat an standard)
3. Om du vill deploya:
   - vilken plattform (Render/Railway/Fly.io)
   - om frontend ska ligga pa GitHub Pages eller samma server
