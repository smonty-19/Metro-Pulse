const mongoose = require('mongoose');

// A route a user has saved as a favourite.
const routeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromStation: { type: String, required: true },
  toStation: { type: String, required: true },
  fromLine: { type: String, required: true },
  toLine: { type: String, required: true },
  distance: { type: Number },
  fare: { type: Number },
  label: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date }
});

module.exports = mongoose.model('Route', routeSchema);