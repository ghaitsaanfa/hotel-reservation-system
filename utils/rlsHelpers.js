// Utility functions untuk menangani RLS errors dan operations
const { supabase } = require('../config/database');

/**
 * Handle RLS (Row Level Security) errors dengan user-friendly messages
 * @param {Object} error - Error object dari Supabase
 * @param {Object} res - Express response object
 * @param {string} defaultMessage - Default error message
 */
const handleRLSError = (error, res, defaultMessage = 'Access denied') => {
    console.error('Database error:', error);
    
    // RLS policy violation
    if (error.code === 'PGRST116' || error.message.includes('row-level security policy')) {
        return res.status(403).json({ 
            error: 'You do not have permission to access this data',
            details: 'Access denied by security policy'
        });
    }
    
    // Record not found (bisa karena RLS filter atau memang tidak ada)
    if (error.code === 'PGRST116' || error.details === 'The result contains 0 rows') {
        return res.status(404).json({ 
            error: 'Data not found',
            details: 'The requested data does not exist or you do not have access to it'
        });
    }
    
    // Unique constraint violation
    if (error.code === '23505') {
        let field = 'field';
        if (error.message.includes('email')) field = 'email';
        if (error.message.includes('no_hp')) field = 'phone number';
        if (error.message.includes('username')) field = 'username';
        
        return res.status(400).json({ 
            error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
            details: `The ${field} you provided is already in use`
        });
    }
    
    // Foreign key constraint violation
    if (error.code === '23503') {
        return res.status(400).json({ 
            error: 'Invalid reference',
            details: 'One or more referenced records do not exist'
        });
    }
    
    // Check constraint violation
    if (error.code === '23514') {
        return res.status(400).json({ 
            error: 'Invalid data',
            details: 'The data provided does not meet the required constraints'
        });
    }
    
    // Default server error
    return res.status(500).json({ 
        error: defaultMessage,
        details: 'An unexpected error occurred'
    });
};

/**
 * Mendapatkan informasi user yang sedang login dari session
 * @param {Object} req - Express request object
 * @returns {Object} User info object
 */
const getCurrentUser = (req) => {
    // Di production, ini akan diambil dari session/JWT token
    // Untuk development, bisa diambil dari header atau session
    return {
        id: req.user?.id || req.headers['x-user-id'],
        role: req.user?.role || req.headers['x-user-role'],
        email: req.user?.email || req.headers['x-user-email']
    };
};

/**
 * Middleware untuk memastikan user sudah login
 */
const requireAuth = (req, res, next) => {
    const user = getCurrentUser(req);
    if (!user.id) {
        return res.status(401).json({ 
            error: 'Authentication required',
            details: 'You must be logged in to access this resource'
        });
    }
    req.currentUser = user;
    next();
};

/**
 * Middleware untuk memastikan user memiliki role tertentu
 * @param {Array} allowedRoles - Array of allowed roles
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        const user = getCurrentUser(req);
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                details: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
            });
        }
        next();
    };
};

/**
 * Wrapper untuk operasi database dengan error handling otomatis
 * @param {Function} operation - Function yang mengembalikan Promise dari operasi Supabase
 * @param {Object} res - Express response object
 * @param {string} successMessage - Success message
 * @param {string} errorMessage - Default error message
 */
const executeWithErrorHandling = async (operation, res, successMessage = 'Operation successful', errorMessage = 'Operation failed') => {
    try {
        const result = await operation();
        
        if (result.error) {
            return handleRLSError(result.error, res, errorMessage);
        }
        
        return res.json({
            message: successMessage,
            data: result.data
        });
    } catch (error) {
        return handleRLSError(error, res, errorMessage);
    }
};

/**
 * Validasi input untuk mencegah injection dan data yang tidak valid
 * @param {Object} data - Data object to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} Validation result
 */
const validateInput = (data, requiredFields = []) => {
    const errors = [];
    
    // Check required fields
    for (const field of requiredFields) {
        if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
            errors.push(`${field} is required`);
        }
    }
    
    // Validate email format
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Invalid email format');
    }
    
    // Validate phone number (Indonesian format)
    if (data.no_hp && !/^(\+62|62|0)[0-9]{9,13}$/.test(data.no_hp.replace(/[\s-]/g, ''))) {
        errors.push('Invalid phone number format');
    }
    
    // Validate dates
    if (data.tanggal_checkin && isNaN(Date.parse(data.tanggal_checkin))) {
        errors.push('Invalid check-in date format');
    }
    
    if (data.tanggal_checkout && isNaN(Date.parse(data.tanggal_checkout))) {
        errors.push('Invalid check-out date format');
    }
    
    // Check if checkout is after checkin
    if (data.tanggal_checkin && data.tanggal_checkout) {
        const checkinDate = new Date(data.tanggal_checkin);
        const checkoutDate = new Date(data.tanggal_checkout);
        if (checkoutDate <= checkinDate) {
            errors.push('Check-out date must be after check-in date');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Sanitize input data untuk mencegah XSS dan injection
 * @param {Object} data - Data object to sanitize
 * @returns {Object} Sanitized data
 */
const sanitizeInput = (data) => {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
            // Basic HTML escape untuk mencegah XSS
            sanitized[key] = value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .trim();
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
};

module.exports = {
    handleRLSError,
    getCurrentUser,
    requireAuth,
    requireRole,
    executeWithErrorHandling,
    validateInput,
    sanitizeInput
};
