// Trip planning across the Namma Metro network.
//
// The three lines meet at only two points (Majestic on purple/green, RV Road
// on green/yellow) and form no loops, so the network is a tree: between any
// two stations there is exactly one path. There is nothing to optimise, so
// this walks the network to find that single path rather than searching for a
// best one among alternatives.
//
// The graph is derived from the Station collection rather than hardcoded, so
// adding a station - or a whole line - to the seed data makes it routable
// without touching this file. Interchanges are found by matching station names
// across lines, which is why Whitefield -> Electronic City picks up both
// Majestic and RV Road on its own.

const { calculateFare } = require('../config/fares');

const MINUTES_PER_HOP = 2.5;      // running time plus dwell at each station
const TRANSFER_PENALTY_MIN = 5;   // walk between platforms plus wait for the next train

/** Numeric ordering suffix of a station id, e.g. "PL23" -> 23. */
function sequenceOf(stationId) {
  const match = /(\d+)$/.exec(stationId);
  if (!match) throw new Error(`Station id has no sequence number: ${stationId}`);
  return parseInt(match[1], 10);
}

/**
 * Adjacency map of the network.
 * Edges are either 'ride' (next station along a line) or 'transfer' (same
 * station, different line - e.g. Majestic is PL23 on purple and GL17 on green).
 */
function buildGraph(stations) {
  const graph = new Map(stations.map(s => [s.stationId, []]));
  const connect = (a, b, type) => {
    graph.get(a).push({ to: b, type });
    graph.get(b).push({ to: a, type });
  };

  const byLine = new Map();
  for (const station of stations) {
    if (!byLine.has(station.line)) byLine.set(station.line, []);
    byLine.get(station.line).push(station);
  }

  for (const lineStations of byLine.values()) {
    lineStations.sort((a, b) => sequenceOf(a.stationId) - sequenceOf(b.stationId));
    for (let i = 0; i < lineStations.length - 1; i++) {
      const current = lineStations[i];
      const next = lineStations[i + 1];
      // A closed station breaks the line: trains pass through without serving it.
      if (current.operational === false || next.operational === false) continue;
      connect(current.stationId, next.stationId, 'ride');
    }
  }

  const byName = new Map();
  for (const station of stations) {
    const key = station.name.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(station);
  }

  for (const sameName of byName.values()) {
    if (sameName.length < 2) continue;
    for (let i = 0; i < sameName.length; i++) {
      for (let j = i + 1; j < sameName.length; j++) {
        if (sameName[i].operational === false || sameName[j].operational === false) continue;
        connect(sameName[i].stationId, sameName[j].stationId, 'transfer');
      }
    }
  }

  return graph;
}

/** Walk the tree from one station to the other. Returns the edge list, or null. */
function findPath(graph, fromId, toId) {
  const previous = new Map([[fromId, null]]);
  const queue = [fromId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === toId) break;
    for (const edge of graph.get(current) || []) {
      if (previous.has(edge.to)) continue;
      previous.set(edge.to, { from: current, type: edge.type });
      queue.push(edge.to);
    }
  }

  if (!previous.has(toId)) return null;

  const path = [];
  let cursor = toId;
  while (previous.get(cursor)) {
    const step = previous.get(cursor);
    path.unshift({ from: step.from, to: cursor, type: step.type });
    cursor = step.from;
  }
  return path;
}

/**
 * Plan a journey between two station ids.
 *
 * @param {Array}  stations Station documents
 * @param {string} fromId
 * @param {string} toId
 * @returns {object|null}   null when no route exists
 */
function planRoute(stations, fromId, toId) {
  const byId = new Map(stations.map(s => [s.stationId, s]));
  const origin = byId.get(fromId);
  const destination = byId.get(toId);
  if (!origin || !destination) {
    throw new Error(`Unknown station: ${!origin ? fromId : toId}`);
  }

  if (fromId === toId) {
    return {
      from: origin.name,
      to: destination.name,
      stationCount: 0,
      totalTimeMin: 0,
      interchanges: [],
      legs: [],
      fare: 0
    };
  }

  const path = findPath(buildGraph(stations), fromId, toId);
  if (!path) return null;

  // Collapse the edge list into per-line legs separated by interchanges.
  const legs = [];
  const interchanges = [];
  let leg = null;

  for (const step of path) {
    const fromStation = byId.get(step.from);
    const toStation = byId.get(step.to);

    if (step.type === 'transfer') {
      interchanges.push({
        station: fromStation.name,
        fromLine: fromStation.line,
        toLine: toStation.line,
        walkMinutes: TRANSFER_PENALTY_MIN
      });
      leg = null;
      continue;
    }

    if (!leg) {
      leg = {
        line: fromStation.line,
        boardAt: fromStation.name,
        arriveAt: toStation.name,
        stations: [fromStation.name]
      };
      legs.push(leg);
    }

    leg.stations.push(toStation.name);
    leg.arriveAt = toStation.name;
  }

  for (const l of legs) {
    l.stationCount = l.stations.length - 1;
    l.timeMin = Math.round(l.stationCount * MINUTES_PER_HOP);
  }

  const stationCount = path.filter(step => step.type === 'ride').length;
  const totalTimeMin = Math.round(
    stationCount * MINUTES_PER_HOP + interchanges.length * TRANSFER_PENALTY_MIN
  );

  return {
    from: origin.name,
    to: destination.name,
    stationCount,
    totalTimeMin,
    interchanges,
    legs,
    fare: calculateFare(stationCount, origin.name, destination.name)
  };
}

module.exports = { planRoute, buildGraph, findPath, MINUTES_PER_HOP, TRANSFER_PENALTY_MIN };