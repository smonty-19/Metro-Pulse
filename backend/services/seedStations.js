const Station = require('../models/Station');
const allStations = require('../config/stations');

/** Populate the station list on first run. No-op once stations exist. */
async function seedStations() {
  const existing = await Station.countDocuments();
  if (existing > 0) {
    console.log(`Stations already in database (${existing})`);
    return;
  }

  console.log(`Seeding ${allStations.length} stations into MongoDB...`);
  await Station.insertMany(allStations);
  console.log(`${allStations.length} stations seeded successfully`);
}

module.exports = seedStations;