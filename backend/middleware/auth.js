const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

/** Rejects the request unless it carries a valid bearer token. */
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.userId = decoded.userId;
    next();
  });
}

module.exports = verifyToken;