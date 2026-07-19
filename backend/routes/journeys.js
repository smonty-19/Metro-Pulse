const express = require('express');

const Journey = require('../models/Journey');
const verifyToken = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// How far back each filter reaches. `all` skips the date filter entirely.
const PERIOD_DAYS = { week: 7, month: 30, '6months': 182, year: 365 };
const VALID_PERIODS = [...Object.keys(PERIOD_DAYS), 'all'];

/** Mongo filter for one user's journeys within the requested period. */
function journeyFilter(userId, period) {
  const filter = { userId };
  const days = PERIOD_DAYS[period];
  if (days) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    filter.timestamp = { $gte: since };
  }
  return filter;
}

/**
 * Reads and validates ?period. Sends a 400 and returns null when invalid, so
 * callers can bail out with `if (period === null) return;`.
 */
function readPeriod(req, res) {
  const period = req.query.period || 'all';
  if (!VALID_PERIODS.includes(period)) {
    res.status(400).json({ message: `Invalid period. Use one of: ${VALID_PERIODS.join(', ')}` });
    return null;
  }
  return period;
}

// RECORD JOURNEY
router.post('/', async (req, res) => {
  try {
    const {
      fromStation, toStation, departureTime, crowdLevel,
      fare, duration, stationCount, interchanges
    } = req.body;

    const journey = new Journey({
      userId: req.userId,
      fromStation, toStation, departureTime, crowdLevel,
      fare, duration, stationCount, interchanges
    });
    await journey.save();

    res.status(201).json({ message: 'Journey recorded', journey });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// RIDE HISTORY
// GET /api/journeys?period=week|month|6months|year|all
router.get('/', async (req, res) => {
  try {
    const period = readPeriod(req, res);
    if (period === null) return;

    const journeys = await Journey.find(journeyFilter(req.userId, period)).sort({ timestamp: -1 });
    res.json(journeys);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// SPENDING STATS
// GET /api/journeys/stats?period=week|month|6months|year|all
router.get('/stats', async (req, res) => {
  try {
    const period = readPeriod(req, res);
    if (period === null) return;

    const journeys = await Journey.find(journeyFilter(req.userId, period))
      .sort({ timestamp: -1 })
      .lean();

    const totalSpent = journeys.reduce((sum, j) => sum + (j.fare || 0), 0);
    const totalStations = journeys.reduce((sum, j) => sum + (j.stationCount || 0), 0);

    // Spend per calendar month, keyed YYYY-MM, oldest first.
    const byMonth = {};
    for (const journey of journeys) {
      const key = new Date(journey.timestamp).toISOString().slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { month: key, trips: 0, spent: 0 };
      byMonth[key].trips += 1;
      byMonth[key].spent += journey.fare || 0;
    }

    // Most frequently travelled station pairs.
    const byRoute = {};
    for (const journey of journeys) {
      const key = `${journey.fromStation} → ${journey.toStation}`;
      if (!byRoute[key]) byRoute[key] = { route: key, trips: 0, spent: 0 };
      byRoute[key].trips += 1;
      byRoute[key].spent += journey.fare || 0;
    }

    res.json({
      period,
      totalTrips: journeys.length,
      totalSpent,
      totalStations,
      averageFare: journeys.length ? Math.round(totalSpent / journeys.length) : 0,
      monthlySpend: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)),
      topRoutes: Object.values(byRoute).sort((a, b) => b.trips - a.trips).slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;