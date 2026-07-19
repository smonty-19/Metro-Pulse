const express = require('express');

const Route = require('../models/Route');
const User = require('../models/User');
const verifyToken = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// SAVE FAVORITE
router.post('/', async (req, res) => {
  try {
    const { fromStation, toStation, fromLine, toLine, distance, fare, label } = req.body;

    const route = new Route({
      userId: req.userId,
      fromStation, toStation, fromLine, toLine, distance, fare, label
    });
    await route.save();
    await User.findByIdAndUpdate(req.userId, { $push: { favorites: route._id } });

    res.status(201).json({ message: 'Route saved', route });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET FAVORITES
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('favorites');
    res.json(user ? user.favorites : []);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE FAVORITE
router.delete('/:routeId', async (req, res) => {
  try {
    // Scope the delete to the owner so one user cannot remove another's route
    // by guessing an id.
    const deleted = await Route.findOneAndDelete({
      _id: req.params.routeId,
      userId: req.userId
    });
    if (!deleted) return res.status(404).json({ message: 'Route not found' });

    await User.findByIdAndUpdate(req.userId, { $pull: { favorites: req.params.routeId } });
    res.json({ message: 'Route deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;