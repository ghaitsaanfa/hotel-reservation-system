// Authentication middleware untuk integrasi dengan Supabase RLS
const { supabase } = require('../config/database');

/**
 * Middleware untuk memverifikasi JWT token dari Supabase
 * dan mengset session untuk RLS policies
 */
const authenticateUser = async (req, res, next) => {
    try {
        // Ambil token dari header Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Authentication required',
                details: 'Please provide a valid authorization token'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verifikasi token dengan Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ 
                error: 'Invalid token',
                details: 'The provided token is invalid or expired'
            });
        }

        // Set user session untuk RLS
        // Ini akan membuat auth.uid() mengembalikan user.id di database
        await supabase.auth.setSession({
            access_token: token,
            refresh_token: req.headers['x-refresh-token'] || ''
        });

        // Simpan informasi user di request object
        req.user = {
            id: user.id,
            email: user.email,
            // Role akan ditentukan oleh RLS helper function berdasarkan tabel
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({ 
            error: 'Authentication failed',
            details: 'An error occurred during authentication'
        });
    }
};

/**
 * Middleware untuk mengecek role user (optional, karena RLS sudah handle)
 * Ini berguna untuk memberikan error message yang lebih spesifik
 */
const checkUserRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ 
                    error: 'Authentication required',
                    details: 'Please login first'
                });
            }

            // Query untuk mendapatkan role user berdasarkan tabel
            // Cek di tabel admin
            const { data: adminData } = await supabase
                .from('admin')
                .select('id_admin')
                .eq('id_admin', req.user.id)
                .single();

            if (adminData) {
                req.user.role = 'admin';
                if (allowedRoles.includes('admin')) {
                    return next();
                }
            }

            // Cek di tabel resepsionis
            const { data: resepsionisData } = await supabase
                .from('resepsionis')
                .select('id_resepsionis')
                .eq('id_resepsionis', req.user.id)
                .single();

            if (resepsionisData) {
                req.user.role = 'resepsionis';
                if (allowedRoles.includes('resepsionis')) {
                    return next();
                }
            }

            // Cek di tabel tamu
            const { data: tamuData } = await supabase
                .from('tamu')
                .select('id_tamu')
                .eq('id_tamu', req.user.id)
                .single();

            if (tamuData) {
                req.user.role = 'tamu';
                if (allowedRoles.includes('tamu')) {
                    return next();
                }
            }

            // Jika tidak ditemukan role atau role tidak diizinkan
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                details: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
            });

        } catch (error) {
            console.error('Role check error:', error);
            return res.status(500).json({ 
                error: 'Authorization failed',
                details: 'An error occurred during authorization'
            });
        }
    };
};

/**
 * Middleware untuk route yang bisa diakses tanpa login (public)
 * Tapi jika ada token, tetap set session
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            
            const { data: { user }, error } = await supabase.auth.getUser(token);
            
            if (!error && user) {
                await supabase.auth.setSession({
                    access_token: token,
                    refresh_token: req.headers['x-refresh-token'] || ''
                });
                
                req.user = {
                    id: user.id,
                    email: user.email
                };
            }
        }
        
        next();
    } catch (error) {
        // Jika ada error, lanjutkan tanpa auth (karena optional)
        console.warn('Optional auth warning:', error);
        next();
    }
};

/**
 * Helper function untuk registrasi user baru
 */
const registerUser = async (userData, role = 'tamu') => {
    try {
        // 1. Buat user di Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password
        });

        if (authError) {
            throw authError;
        }

        if (!authData.user) {
            throw new Error('Failed to create user account');
        }

        // 2. Insert ke tabel yang sesuai dengan role
        let insertData;
        let tableName;

        switch (role) {
            case 'admin':
                tableName = 'admin';
                insertData = {
                    id_admin: authData.user.id,
                    nama: userData.nama,
                    username: userData.username,
                    password: userData.hashedPassword // Sudah di-hash di controller
                };
                break;
            
            case 'resepsionis':
                tableName = 'resepsionis';
                insertData = {
                    id_resepsionis: authData.user.id,
                    nama: userData.nama,
                    username: userData.username,
                    password: userData.hashedPassword,
                    shift: userData.shift || 'Pagi'
                };
                break;
            
            case 'tamu':
            default:
                tableName = 'tamu';
                insertData = {
                    id_tamu: authData.user.id,
                    nama: userData.nama,
                    alamat: userData.alamat,
                    no_hp: userData.no_hp,
                    email: userData.email,
                    username: userData.username,
                    password: userData.hashedPassword
                };
                break;
        }

        // 3. Insert ke tabel database
        const { data: insertResult, error: insertError } = await supabase
            .from(tableName)
            .insert(insertData)
            .select()
            .single();

        if (insertError) {
            // Jika gagal insert ke tabel, hapus user dari auth
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw insertError;
        }

        return {
            authUser: authData.user,
            userData: insertResult
        };

    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
};

/**
 * Helper function untuk login user
 */
const loginUser = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        return {
            user: data.user,
            session: data.session
        };

    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

module.exports = {
    authenticateUser,
    checkUserRole,
    optionalAuth,
    registerUser,
    loginUser
};
