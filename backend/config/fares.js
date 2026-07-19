// Namma Metro (BMRCL) fare configuration.
//
// The network is a tree, so there is exactly one path between any two
// stations. That makes the station count fixed for a given pair, which makes
// the fare fixed too - matching how BMRCL publishes a set price per pair.
//
// ---------------------------------------------------------------------------
// VERIFY THESE NUMBERS BEFORE YOU TRUST THEM.
//
// This reflects the widely-reported structure after the February 2025
// revision (min Rs 10, max Rs 90). Reporting on a February 2026 annual
// revision (approx +5%, min Rs 11, max Rs 95) exists but could not be
// confirmed against an official source.
//
// Authoritative sources - check these and update SLABS if they disagree:
//   http://fare.bmrc.co.in/
//   https://english.bmrc.co.in:8282/English/uploads/news/english//fileuploads/Revised_Fare_Chart_for_webiste.pdf
//
// Last checked: not yet verified against the official chart.
// ---------------------------------------------------------------------------

// Fare applies when the number of stations travelled is <= maxStations.
const SLABS = [
  { maxStations: 2, fare: 10 },
  { maxStations: 4, fare: 20 },
  { maxStations: 6, fare: 30 },
  { maxStations: 8, fare: 40 },
  { maxStations: 10, fare: 50 },
  { maxStations: 15, fare: 60 },
  { maxStations: 20, fare: 70 },
  { maxStations: 25, fare: 80 },
  { maxStations: Infinity, fare: 90 }
];

// Exceptions to the slab table, for pairs where BMRCL's published fare differs.
// Key format: "Origin Name|Destination Name" (order independent).
// Example: 'Majestic|Whitefield (Kadugodi)': 60
const FARE_OVERRIDES = {};

function overrideKey(fromName, toName) {
  return [fromName, toName].sort().join('|');
}

/**
 * Fare for a journey.
 * @param {number} stationCount hops travelled along the fixed path
 * @param {string} [fromName]   used only to look up published exceptions
 * @param {string} [toName]
 * @returns {number} fare in rupees
 */
function calculateFare(stationCount, fromName, toName) {
  if (!Number.isInteger(stationCount) || stationCount < 0) {
    throw new Error(`calculateFare: invalid station count ${stationCount}`);
  }
  if (fromName && toName) {
    const override = FARE_OVERRIDES[overrideKey(fromName, toName)];
    if (override !== undefined) return override;
  }
  return SLABS.find(slab => stationCount <= slab.maxStations).fare;
}

module.exports = { SLABS, FARE_OVERRIDES, calculateFare };