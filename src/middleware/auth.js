const checkAdminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided. Use Bearer token in Authorization header.'
    });
  }

  const token = authHeader.substring(7);
  
  if (token !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Invalid admin token.'
    });
  }

  next();
};

module.exports = { checkAdminAuth };
