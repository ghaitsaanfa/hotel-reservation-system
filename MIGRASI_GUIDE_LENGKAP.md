# PANDUAN MIGRASI DATABASE HOTEL KE SUPABASE (MINIMAL)

## MIGRASI MINIMAL - TANPA UUID/RLS ⭐
**File:** `database/reservasi_hotel_supabase_minimal.sql`

### Keuntungan Migrasi Minimal:
- ✅ Struktur 100% identik dengan MySQL
- ✅ Tidak perlu mengubah kode aplikasi sama sekali
- ✅ DFD/ERD tetap valid dan sesuai yang diajukan ke dosen
- ✅ Implementasi cepat dan mudah
- ✅ Tidak ada kompleksitas tambahan
- ✅ Perfect untuk project akademik/kuliah

### Langkah-langkah Migrasi:

1. **Buat Project di Supabase**
   - Kunjungi [supabase.com](https://supabase.com)
   - Klik "New Project"
   - Isi nama project dan password database
   - Tunggu project selesai dibuat

2. **Jalankan Script SQL**
   - Buka SQL Editor di Supabase Dashboard
   - Copy-paste isi file `database/reservasi_hotel_supabase_minimal.sql`
   - Klik "Run" untuk menjalankan script
   - Pastikan semua tabel berhasil dibuat

3. **Update Connection String**
   - Copy connection string dari Supabase Settings > Database
   - Update file konfigurasi database di aplikasi Node.js

4. **Test Aplikasi**
   - Jalankan aplikasi
   - Test login, register, dan semua fitur
   - Seharusnya langsung jalan tanpa perubahan kode

## PERUBAHAN KODE MINIMAL

### 1. Install PostgreSQL Driver:
```bash
npm install pg
npm uninstall mysql2  # hapus MySQL driver
```

### 2. Update Database Connection:
```javascript
// config/database.js - GANTI INI

// LAMA (MySQL)
const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root', 
  password: 'password',
  database: 'reservasi_hotel'
});

// BARU (Supabase/PostgreSQL)
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});
```

### 3. Update Environment Variables:
```env
# .env
SUPABASE_DB_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

### 4. Update Query Syntax (Jika Diperlukan):
```javascript
// MySQL → PostgreSQL
// LAMA: SELECT LAST_INSERT_ID()
// BARU: RETURNING id_column

// Contoh:
// LAMA
const result = await connection.query('INSERT INTO tamu (nama, email) VALUES (?, ?)', [nama, email]);
const insertId = result.insertId;

// BARU  
const result = await pool.query('INSERT INTO tamu (nama, email) VALUES ($1, $2) RETURNING id_tamu', [nama, email]);
const insertId = result.rows[0].id_tamu;
```

## DEPLOY KE VERCEL

### 1. Update package.json:
```json
{
  "dependencies": {
    "pg": "^8.11.3"  // ganti mysql2 dengan pg
  }
}
```

### 2. Deploy:
```bash
npm install vercel -g
vercel --prod
```

### 3. Set Environment Variables di Vercel:
- `SUPABASE_DB_URL`: Connection string dari Supabase

## FILE-FILE YANG DIBUTUHKAN

Setelah cleanup, file yang tersisa dan dibutuhkan:
- ✅ `database/reservasi_hotel.sql` (MySQL asli - untuk referensi)
- ✅ `database/reservasi_hotel_supabase_minimal.sql` (Supabase minimal)
- ✅ `MIGRASI_GUIDE_LENGKAP.md` (panduan ini)
- ✅ Semua file aplikasi Node.js yang sudah ada

## TESTING CHECKLIST

Setelah migrasi, pastikan test ini berhasil:
- [ ] Register user baru (admin, resepsionis, tamu)
- [ ] Login dengan berbagai role
- [ ] CRUD kamar (admin)
- [ ] CRUD reservasi (tamu, resepsionis)
- [ ] CRUD pembayaran (resepsionis)
- [ ] Foreign key constraints bekerja
- [ ] Check constraints bekerja
- [ ] Data sample ter-load dengan benar

---

## KESIMPULAN

✅ **STRUKTUR DATABASE TIDAK BERUBAH** - DFD/ERD tetap valid  
✅ **KODE APLIKASI MINIMAL BERUBAH** - hanya connection string  
✅ **DEPLOY KE VERCEL BISA** - dengan database cloud Supabase  
✅ **COCOK UNTUK PROJECT KULIAH** - fokus fungsionalitas, bukan keamanan  

Dengan migrasi minimal ini, Anda mendapatkan database cloud (Supabase) tanpa mengubah struktur yang sudah disetujui dosen.

---

## LANGKAH DEPLOYMENT KE VERCEL (LENGKAP)

### STEP 1: Persiapan Aplikasi untuk Production

#### 1.1. Update Database Connection
```javascript
// config/database.js - PERUBAHAN UTAMA
const { Pool } = require('pg');

// Hapus MySQL connection, ganti dengan PostgreSQL
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

// Export pool untuk digunakan di controllers
module.exports = pool;
```

#### 1.2. Update Package.json
```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "express": "^4.18.2",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

#### 1.3. Install Dependencies
```bash
npm install pg
npm uninstall mysql2
npm install --save-dev nodemon
```

#### 1.4. Update Controllers untuk PostgreSQL Syntax
Contoh perubahan di controllers:

```javascript
// controllers/tamuController.js - CONTOH PERUBAHAN
const pool = require('../config/database');

// LAMA (MySQL)
// const result = await connection.query('INSERT INTO tamu SET ?', [data]);
// const insertId = result.insertId;

// BARU (PostgreSQL)
const registerTamu = async (req, res) => {
  try {
    const { nama, alamat, no_hp, email, username, password } = req.body;
    
    const result = await pool.query(
      'INSERT INTO tamu (nama, alamat, no_hp, email, username, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_tamu',
      [nama, alamat, no_hp, email, username, hashedPassword]
    );
    
    const insertId = result.rows[0].id_tamu;
    res.status(201).json({ message: 'Tamu berhasil didaftarkan', id: insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### STEP 2: Konfigurasi Environment Variables

#### 2.1. Buat File .env
```env
# .env - JANGAN COMMIT FILE INI
SUPABASE_DB_URL=postgresql://postgres:[your-password]@db.[your-project].supabase.co:5432/postgres
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
NODE_ENV=production
PORT=3000
```

#### 2.2. Buat File .env.example
```env
# .env.example - FILE INI BOLEH DI-COMMIT
SUPABASE_DB_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
JWT_SECRET=your-jwt-secret-key
NODE_ENV=production
PORT=3000
```

### STEP 3: Konfigurasi Vercel

#### 3.1. Buat/Update vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "server.js": {
      "maxDuration": 30
    }
  }
}
```

#### 3.2. Update server.js untuk Vercel
```javascript
// server.js - TAMBAHKAN INI
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// For Vercel
if (process.env.NODE_ENV === 'production') {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
```

### STEP 4: Testing Lokal Sebelum Deploy

#### 4.1. Test Connection Database
```bash
# Test koneksi database
node -e "
const pool = require('./config/database');
pool.query('SELECT COUNT(*) FROM admin')
  .then(result => console.log('Database connected:', result.rows[0]))
  .catch(err => console.error('Database error:', err));
"
```

#### 4.2. Test Aplikasi Lokal
```bash
npm start
# Buka http://localhost:3000
# Test login, register, dan fitur utama
```

### STEP 5: Deploy ke Vercel

#### 5.1. Install Vercel CLI
```bash
npm install -g vercel
```

#### 5.2. Login ke Vercel
```bash
vercel login
# Pilih GitHub/GitLab/Bitbucket atau email
```

#### 5.3. Deploy Pertama Kali
```bash
# Di root folder project
vercel

# Jawab pertanyaan:
# ? Set up and deploy "Project_Reservation_Hotel"? [Y/n] Y
# ? Which scope do you want to deploy to? [pilih scope Anda]
# ? Link to existing project? [N/y] N
# ? What's your project's name? hotel-reservation-system
# ? In which directory is your code located? ./
```

#### 5.4. Set Environment Variables di Vercel
```bash
# Set environment variables
vercel env add SUPABASE_DB_URL
# Paste connection string dari Supabase

vercel env add JWT_SECRET
# Paste JWT secret key Anda

vercel env add NODE_ENV
# Ketik: production
```

#### 5.5. Deploy ke Production
```bash
vercel --prod
```

### STEP 6: Konfigurasi Domain (Opsional)

#### 6.1. Custom Domain
```bash
# Tambah domain custom (jika punya)
vercel domains add yourdomain.com
vercel alias set your-deployment-url.vercel.app yourdomain.com
```

### STEP 7: Testing Production

#### 7.1. Test Endpoints
```bash
# Test health check
curl https://your-app.vercel.app/api/health

# Test database connection
curl https://your-app.vercel.app/api/kamar
```

#### 7.2. Test Frontend
- Buka https://your-app.vercel.app
- Test semua fitur: login, register, CRUD operations
- Check browser developer tools untuk errors

### STEP 8: Monitoring & Debugging

#### 8.1. View Logs
```bash
# Lihat logs deployment
vercel logs your-app.vercel.app

# Lihat logs realtime
vercel logs your-app.vercel.app --follow
```

#### 8.2. Debug Issues
```javascript
// Tambahkan logging di controllers
console.log('Database query:', query);
console.log('Environment:', process.env.NODE_ENV);
console.log('Database URL exists:', !!process.env.SUPABASE_DB_URL);
```

## TROUBLESHOOTING COMMON ISSUES

### Issue 1: Database Connection Error
```javascript
// Error: Connection refused
// Solution: Check SUPABASE_DB_URL format
const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('SUPABASE_DB_URL not set');
  process.exit(1);
}
```

### Issue 2: CORS Error
```javascript
// app.js - Tambah CORS configuration
const cors = require('cors');

app.use(cors({
  origin: [
    'https://your-app.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

### Issue 3: Static Files Not Served
```javascript
// server.js - Pastikan static files configuration
app.use(express.static(path.join(__dirname, 'public')));

// Tambah route untuk SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
```

### Issue 4: Environment Variables Not Working
```bash
# Re-deploy setelah set environment variables
vercel env pull  # Download .env.local
vercel --prod    # Deploy ulang
```

## DEPLOYMENT CHECKLIST

### Pre-deployment:
- [ ] Database berhasil migrasi ke Supabase
- [ ] `pg` package terinstall, `mysql2` dihapus
- [ ] Connection string diupdate
- [ ] Controllers diupdate untuk PostgreSQL syntax
- [ ] Environment variables dikonfigurasi
- [ ] vercel.json dikonfigurasi
- [ ] Testing lokal berhasil

### Deployment:
- [ ] Vercel CLI terinstall dan login
- [ ] Project berhasil di-deploy
- [ ] Environment variables di-set di Vercel
- [ ] Production deployment berhasil
- [ ] Health check endpoint responding

### Post-deployment:
- [ ] Frontend dapat diakses
- [ ] Login/register berfungsi
- [ ] CRUD operations berfungsi
- [ ] Database queries berjalan normal
- [ ] No errors di browser console
- [ ] No errors di Vercel logs

## FINAL VERIFICATION

Setelah deployment selesai, pastikan:

1. **Database**: Supabase dashboard menunjukkan koneksi aktif
2. **Backend**: API endpoints merespons dengan benar
3. **Frontend**: Semua halaman dapat diakses
4. **Authentication**: Login/logout berfungsi
5. **CRUD**: Semua operasi database berhasil
6. **Performance**: Loading time acceptable
7. **Security**: No sensitive data exposed di logs

---

## HASIL AKHIR

✅ **Database**: Migrasi dari MySQL ke Supabase PostgreSQL  
✅ **Backend**: Node.js + Express.js di Vercel Serverless  
✅ **Frontend**: Static files served dari Vercel  
✅ **Domain**: https://your-app.vercel.app  
✅ **Scalability**: Auto-scaling dengan Vercel  
✅ **Monitoring**: Logs tersedia di Vercel Dashboard  

**Selamat! Aplikasi hotel reservation Anda sudah live di production! 🚀**
