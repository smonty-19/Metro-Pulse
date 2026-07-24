# Metro Pulse

Metro Pulse is a full-stack web app for the Bangalore (Namma) Metro. Plan a
journey across the Purple, Green, and Yellow lines with real interchange
guidance and fares, check live station crowding, and track your ride history
and spending over time.

**Live demo → [metro-pulse-nine.vercel.app](https://metro-pulse-nine.vercel.app)**

> The demo runs on free hosting that sleeps when idle, so the first load after a
> quiet period can take 30–50 seconds while the backend wakes up. It is quick
> after that.

---

## Table of Contents

- [About](#about)
- [Screenshots](#screenshots)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [API Overview](#api-overview)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## About

Metro Pulse answers the questions every commute raises - which line to take,
where to change, what it will cost, and how crowded it will be. The journey
planner walks the real network and tells you exactly where to switch lines, the
fare for the trip, and how busy the stations are at your chosen time. Once you
are travelling, log each trip to build up a ride history and a spending
breakdown by week, month, or year.

---

## Screenshots

**Home - Top 10 Busiest Stations**
![Home Dashboard](screenshots/home.png)

**Journey Planner**
![Journey Planner](screenshots/planner_1.png)

![Route Breakdown for user convenience](screenshots/planner_2.png)

**User History/Budget Analyser**
![Ride History and Spending](screenshots/history_1.png)

![All Trip Log](screenshots/history_2.png)

**Station Status by Line**
![Station Status](screenshots/station-status.png)

**Favorite Routes**
![Favorites](screenshots/favorites.png)

**Statistics & Analytics**
![Stats](screenshots/stats.png)

**Register**
![Register](screenshots/register.png)

---

## Features

- Live traffic dashboard showing congestion levels across all stations
- Journey planner that walks the real network - shows which line to board,
  where to change, and how many stops each leg takes
- Searchable station picker: type to filter all 85 stations, with each result
  labelled by line so the interchanges (Majestic, RV Road) can be told apart
- Fares derived from the fixed path, so every station pair has one set price
- Explicit **Log Journey** action - checking a route does not record it, so
  history and spending only reflect trips actually taken
- Ride history and spending, filterable by last week, month, 6 months, or year
- Station status filtered by metro line (Purple, Green, Yellow)
- Save and manage favorite routes per user account
- Statistics page with hourly crowd charts and weekly delay trends
- User authentication - register, login, and logout
- Responsive design that works on both desktop and mobile

---

## Tech Stack

**Frontend**
| Technology | Purpose |
|---|---|
| React.js | UI component framework |
| CSS | Styling and layout |
| HTML5 | Markup |

**Backend**
| Technology | Purpose |
|---|---|
| Node.js | Runtime environment |
| Express.js | REST API |
| MongoDB | Database |
| Mongoose | MongoDB object modeling |

---

## Project Structure

```
Metro-Pulse/
├── backend/
│   ├── config/
│   │   ├── db.js             MongoDB connection + first-run seeding
│   │   ├── env.js            reads and validates environment variables
│   │   ├── fares.js          fare slab table (edit fares here)
│   │   └── stations.js       the 85-station network data
│   ├── middleware/
│   │   └── auth.js           JWT verification
│   ├── models/               User, Station, Route, Journey schemas
│   ├── routes/               one router per resource
│   │   ├── auth.js
│   │   ├── stations.js
│   │   ├── trips.js          trip planning
│   │   ├── favorites.js
│   │   └── journeys.js       ride history + spending stats
│   ├── services/
│   │   ├── routePlanner.js   finds the path and its interchanges
│   │   └── seedStations.js
│   └── server.js             entry point: wires middleware and routers
│
├── frontend/
│   ├── public/
│   └── src/
│       └── App.js
│
├── screenshots/
├── render.yaml               backend deployment blueprint (Render)
├── LICENSE
├── .gitignore
└── README.md
```

> `frontend/vercel.json` holds the frontend deployment config (Vercel).

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or above
- npm or yarn
- [MongoDB](https://www.mongodb.com/) - local or via [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

---

### Installation

Clone the repository:

```bash
git clone https://github.com/smonty-19/Metro-Pulse.git
cd Metro-Pulse
```

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

---

### Environment Variables

Both folders ship a `.env.example`. Copy each one and fill in the values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**backend/.env**

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | in production | Atlas connection string, or `mongodb://localhost:27017/metropulse` |
| `JWT_SECRET` | in production | Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PORT` | no | Defaults to `5000` |
| `NODE_ENV` | no | Set to `production` when deployed |
| `CORS_ORIGIN` | no | Comma-separated allowed origins. Defaults to `http://localhost:3000` |

The server refuses to start in production if `MONGODB_URI` or `JWT_SECRET` is
missing, rather than silently falling back to localhost or a guessable key.

**frontend/.env**

| Variable | Notes |
|---|---|
| `REACT_APP_API_URL` | Backend base URL including `/api` |

> Write this file as UTF-8. PowerShell's `>` operator produces UTF-16, which
> the build silently ignores - the app then falls back to the hardcoded
> localhost URL and breaks in production. Use `Set-Content -Encoding utf8`.

Neither `.env` is committed; both are covered by `.gitignore`.

---

### Running the App

Start the backend:

```bash
cd backend
npm start
```

The API will be running at `http://localhost:5000`.

In a separate terminal, start the frontend:

```bash
cd frontend
npm start
```

The app will open at `http://localhost:3000`.

---

## API Overview

Base URL: `http://localhost:5000/api`. Endpoints marked **auth** require an
`Authorization: Bearer <token>` header.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | | Liveness check used by the host |
| `POST` | `/api/auth/register` | | Create an account |
| `POST` | `/api/auth/login` | | Log in, returns a JWT valid for 7 days |
| `GET` | `/api/auth/me` | auth | Current user profile |
| `GET` | `/api/stations` | | All 85 stations |
| `GET` | `/api/stations/line/:line` | | Stations on `purple`, `green`, or `yellow` |
| `GET` | `/api/routes/plan?from=&to=` | | Plan a trip between two station ids |
| `GET` | `/api/favorites` | auth | Saved routes |
| `POST` | `/api/favorites` | auth | Save a route |
| `DELETE` | `/api/favorites/:routeId` | auth | Remove a saved route |
| `POST` | `/api/journeys` | auth | Record a trip |
| `GET` | `/api/journeys?period=` | auth | Ride history |
| `GET` | `/api/journeys/stats?period=` | auth | Spending totals and breakdowns |

`period` accepts `week`, `month`, `6months`, `year`, or `all` (default `all`).

**Trip planning.** The three lines meet only at Majestic and RV Road and form
no loops, so the network is a tree and exactly one path exists between any two
stations. `/api/routes/plan` walks that path and returns it split into per-line
legs with the interchanges called out:

```bash
curl "http://localhost:5000/api/routes/plan?from=PL01&to=YL16"
```

```jsonc
{
  "from": "Whitefield (Kadugodi)",
  "to": "Bommasandra",
  "stationCount": 44,
  "totalTimeMin": 120,
  "interchanges": [
    { "station": "Majestic", "fromLine": "purple", "toLine": "green", "walkMinutes": 5 },
    { "station": "RV Road",  "fromLine": "green",  "toLine": "yellow", "walkMinutes": 5 }
  ],
  "legs": [ /* one per line, with boardAt / arriveAt / stations / timeMin */ ],
  "fare": 90
}
```

**Fares.** Because the path is fixed, so is the station count, and therefore the
fare - one set price per station pair. The slab table lives in
[`backend/config/fares.js`](backend/config/fares.js), along with a
`FARE_OVERRIDES` map for pairs where BMRCL's published price differs from the
slab. **The committed slabs are not yet verified against BMRCL's official
chart** - check <http://fare.bmrc.co.in/> and correct them before relying on
the numbers.

---

## Deployment

Frontend on Vercel, backend on Render, database on MongoDB Atlas - this is how
the [live demo](https://metro-pulse-nine.vercel.app) is hosted, and the steps
below reproduce it from a fork. All three have free tiers that need no card to
start.

### 1. MongoDB Atlas

1. Create a free **M0** cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Database Access** -> add a user with a generated password. Save it now; it
   is only shown once.
3. **Network Access** -> add `0.0.0.0/0`. Render's free tier has no static
   outbound IP, so narrower rules will block the API. This does mean the cluster
   is reachable from any IP, so the database password is the only thing
   protecting it - use a long generated one and never commit it.
4. **Connect -> Drivers -> Node.js** and copy the connection string. Replace
   `<password>` with the real password and add the database name:

   ```
   mongodb+srv://user:PASSWORD@cluster0.xxxxx.mongodb.net/metropulse?retryWrites=true&w=majority
   ```

Point `backend/.env` at it and start the backend once - it seeds all 85
stations automatically on first connect.

### 2. Backend on Render

The repo includes [`render.yaml`](render.yaml), so **New -> Blueprint** picks up
the settings. Otherwise create a Web Service manually with root directory
`backend`, build `npm install`, start `npm start`, health check `/api/health`.

Set these in the Render dashboard, not in the repo:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | the Atlas string from step 1 |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CORS_ORIGIN` | your Vercel URL, added after step 3 |

> Render's free tier sleeps after inactivity, so the first request after an idle
> period takes roughly 30-50 seconds. That is the platform, not a bug in the app.

### 3. Frontend on Vercel

Import the repo and set **root directory** to `frontend`. Add one environment
variable:

| Variable | Value |
|---|---|
| `REACT_APP_API_URL` | `https://your-service.onrender.com/api` |

Note the `/api` suffix - the frontend appends paths directly to this value.

### 4. Connect the two

Go back to Render and set `CORS_ORIGIN` to your Vercel URL, with no trailing
slash:

```
CORS_ORIGIN=https://metro-pulse.vercel.app
```

It accepts a comma-separated list if you want preview deployments allowed too.
Redeploy the backend after changing it.

> `REACT_APP_*` values are compiled into the JavaScript bundle at build time, so
> anyone who loads the site can read them. Only put public values there - never
> the Atlas string or the JWT secret.

---

## Contributing

Pull requests are welcome. If you want to work on something significant, open an issue first so we can discuss the approach.

1. Fork the repo
2. Create your branch - `git checkout -b feature/your-feature`
3. Commit your changes - `git commit -m 'Add your feature'`
4. Push - `git push origin feature/your-feature`
5. Open a pull request

---

## License

This project is open-source under the [MIT License](LICENSE).
