/**
 * requireAuth: protect write operations. Returns 401 if no session user.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
}

module.exports = { requireAuth };
