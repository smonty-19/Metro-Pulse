const mongoose = require('mongoose');
const { mongoUri } = require('./env');
const seedStations = require('../services/seedStations');

/**
 * Connect to MongoDB and seed the station list on first run.
 * Throws on failure so the caller can decide whether to exit.
 */
async function connectDatabase() {
  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');
  await seedStations();
}

module.exports = connectDatabase;