module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(404).json({ error: 'API route not found' });
};
