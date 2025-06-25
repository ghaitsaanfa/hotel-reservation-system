const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

const authenticateAdmin = (req, res, next) => {
    authenticateToken(req, res, (err) => {
        if (err) return next(err);
        
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
};

const authenticateResepsionis = (req, res, next) => {
    authenticateToken(req, res, (err) => {
        if (err) return next(err);
        
        if (req.user.role !== 'resepsionis') {
            return res.status(403).json({ error: 'Resepsionis access required' });
        }
        next();
    });
};

const authenticateTamu = (req, res, next) => {
    authenticateToken(req, res, (err) => {
        if (err) return next(err); // Pass errors to Express error handler
        
        if (!req.user || req.user.role !== 'tamu') {
            return res.status(403).json({ error: 'Tamu access required' });
        }
        next();
    });
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        next();
    };
};

module.exports = {
    authenticate: authenticateToken,
    authenticateToken,
    authenticateAdmin,
    authenticateResepsionis,
    authenticateTamu,
    requireRole
};
