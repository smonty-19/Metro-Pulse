const express = require('express');
const Station = require('../models/Station');
const { planRoute } = require('../services/routePlanner');

const router = express.Router();

// PLAN A TRIP
// GET /api/routes/plan?from=PL01&to=YL16
// Returns the single path between two stations, split into per-line legs with
// the interchanges called out, plus the fare for that fixed station count.
router.get('/plan', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: 'Both `from` and `to` station ids are required' });
    }

    const stations = await Station.find().lean();
    const plan = planRoute(stations, from, to);
    if (!plan) return res.status(404).json({ message: 'No route between these stations' });

    res.json(plan);
  } catch (error) {
    if (error.message.startsWith('Unknown station')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;