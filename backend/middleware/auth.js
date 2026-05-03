const jwt = require('jsonwebtoken');
const config = require('../config');

function requireUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'User token required' });
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid user token' });
  }
}

function optionalUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return next();
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
  } catch {
    req.user = null;
  }
  next();
}

function requireSameUser(getUsername) {
  return (req, res, next) => {
    const requestedUsername = typeof getUsername === 'function' ? getUsername(req) : undefined;
    if (!requestedUsername) {
      return res.status(400).json({ error: 'Username required' });
    }
    if (requestedUsername !== req.user?.username) {
      return res.status(403).json({ error: 'You can only perform this action as yourself' });
    }
    next();
  };
}

module.exports = {
  optionalUser,
  requireUser,
  requireSameUser,
};
