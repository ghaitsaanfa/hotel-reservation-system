const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for Vercel deployment
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://hotel-reservation-system-khaki.vercel.app'] // Updated with actual domain
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0'
}));

// Import routes
const authRoutes = require('./routes/auth');
const tamuRoutes = require('./routes/tamu');
const kamarRoutes = require('./routes/kamar');
const reservasiRoutes = require('./routes/reservasi');
const pembayaranRoutes = require('./routes/pembayaran');
const resepsionisRoutes = require('./routes/resepsionis');
const adminRoutes = require('./routes/admin');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/tamu', tamuRoutes);
app.use('/api/kamar', kamarRoutes);
app.use('/api/reservasi', reservasiRoutes);
app.use('/api/pembayaran', pembayaranRoutes);
app.use('/api/resepsionis', resepsionisRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Default route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        res.status(404).json({ 
            error: 'API endpoint not found',
            path: req.originalUrl 
        });
    } else {
        // For non-API routes, serve index.html for client-side routing
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    if (req.originalUrl.startsWith('/api/')) {
        res.status(500).json({ 
            error: process.env.NODE_ENV === 'production' 
                ? 'Internal server error' 
                : err.message 
        });
    } else {
        res.status(500).send('Something went wrong!');
    }
});

// For Vercel, export the app
if (process.env.VERCEL) {
    module.exports = app;
} else {
    // For local development
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📱 Frontend available at http://localhost:${PORT}`);
        console.log(`🔌 API endpoints available at http://localhost:${PORT}/api/`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

module.exports = app;
