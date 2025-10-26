# HorusCast

Plan outdoor activities with confidence using **hyper-local, trail-aware weather**.  
HorusCast blends NASA climate data, OpenStreetMap trails, and Mapbox maps to help you pick the best day for your outdoor activities, not limited to hiking, stargazing, fishing, snowboarding, and more.

---

## ✨ Features

- **Long-Term Weather Predictions** — explore climate projections out to **2100** (via external datasets).
- **Hyper-Local, Trail-Specific** — click a trail to see conditions at that spot.
- **Interactive Map** — smooth search and explore experience powered by **Mapbox GL JS**.
- **Offline JSON Log** — every chosen route can be saved to a local JSON store for later analysis.

---

## 🗺️ Website Start up Live Flow (localhost)

# Terminal Server Startup
1. Go to the backend folder
cd mapbox-app\backend

2. Install required package
npm install dotenv
npm install express
npm install cors
npm install node-fetch

3. Initiate the server
node server.js
or
npm start to enable console.log

# Website Flow
1. Open index.html with live server to enter the **Welcome** page
2. Click **Continue** → Map page  
3. Search a city/area (e.g., “Waterloo”)  
4. Nearby **hiking trails** load automatically  
5. Click a trail → it draws on the map and a bottom sheet opens with **NASA** weather for the selected date

---

## 🧩 Tech Stack

- **Frontend**: HTML/CSS/JS, Mapbox GL JS + Mapbox Geocoder
- **Backend**: Node.js + Express  
  - OpenStreetMap **Overpass API** (trail discovery)  
  - Optional Mapbox Directions (polyline route)  
  - NASA POWER (weather point data)
- **Data**: JSON storage (`mapbox-app/backend/data/*.json`)

---

## 🔧 Prerequisites

- **Node.js** 18+ (or 20+)  
- **Python** (for an ultra-simple static server) or VS Code **Live Server**  
- **Mapbox access token** (public)

---

## 🚀 Local Setup

### 1) Clone

```bash
git clone https://github.com/llhtimlam/NASA-Hackathon.git
cd repo
