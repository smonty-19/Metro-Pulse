// server.js - MetroPulse backend entry point.
//
// Layout:
//   config/      environment, database connection, station and fare data
//   models/      mongoose schemas
//   middleware/  auth
//   routes/      one router per resource, mounted below
//   services/    trip planning and seeding

const express = require('express');
const cors = require('cors');

const { port, corsOrigins } = require('./config/env');
const connectDatabase = require('./config/db');

const authRoutes = require('./routes/auth');
const stationRoutes = require('./routes/stations');
const tripRoutes = require('./routes/trips');
const favoriteRoutes = require('./routes/favorites');
const journeyRoutes = require('./routes/journeys');

const app = express();

app.use(express.json());
class CorsError extends Error {}

app.use(cors({
  origin(origin, callback) {
    // Requests with no Origin (curl, health checks, same-origin) are allowed.
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    callback(new CorsError(`Origin not allowed by CORS: ${origin}`));
  }
}));

// Hosting platforms ping this to decide whether the service is live.
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/routes', tripRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/journeys', journeyRoutes);

app.use((req, res) => res.status(404).json({ message: `No such endpoint: ${req.method} ${req.path}` }));

// Final safety net: without this an unhandled error in a handler hangs the
// request instead of returning a response.
app.use((err, req, res, next) => {
  // A blocked origin is a rejected request, not a server fault. Returning 500
  // here would send the wrong signal to logs and to whoever is debugging a
  // misconfigured CORS_ORIGIN.
  if (err instanceof CorsError) {
    return res.status(403).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: 'Server error', error: err.message });
});

async function start() {
  try {
    await connectDatabase();
  } catch (error) {
    console.error('FATAL: could not connect to MongoDB:', error.message);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`\nServer running on port ${port}`);
    console.log(`API available at http://localhost:${port}/api`);
    console.log(`Allowed origins: ${corsOrigins.join(', ')}\n`);
  });
}

start();

module.exports = app;