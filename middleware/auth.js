/**
 * requireAuth: protect write operations. Returns 401 if no session user.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden' });
}

module.exports = { requireAuth, requireAdmin };
