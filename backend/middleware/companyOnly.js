const companyOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'company') {
    return res.status(403).json({ error: 'Access denied. Company role required.' });
  }
  next();
};

module.exports = companyOnly;
