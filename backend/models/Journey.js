const mongoose = require('mongoose');

// A trip the user actually took. Powers ride history and spending stats, so
// `timestamp` and `fare` are the fields that matter most here.
const journeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fromStation: { type: String, required: true },
  toStation: { type: String, required: true },
  departureTime: { type: Date, required: true },
  crowdLevel: { type: Number },
  fare: { type: Number },
  duration: { type: Number },
  stationCount: { type: Number },
  interchanges: [{ type: String }],
  timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Journey', journeySchema);