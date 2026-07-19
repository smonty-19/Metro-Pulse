const express = require('express');
const Station = require('../models/Station');

const router = express.Router();

// GET ALL STATIONS
router.get('/', async (req, res) => {
  try {
    res.json(await Station.find());
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET STATIONS BY LINE
router.get('/line/:line', async (req, res) => {
  try {
    res.json(await Station.find({ line: req.params.line }));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;