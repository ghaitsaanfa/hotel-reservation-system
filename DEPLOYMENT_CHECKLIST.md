# 🚀 DEPLOYMENT CHECKLIST - HOTEL RESERVATION SYSTEM

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. Database Migration ✅ (SELESAI)
- [x] Database berhasil migrasi ke Supabase
- [x] Semua tabel berhasil dibuat
- [x] Sample data ter-load
- [x] RLS dummy ditambahkan (mengatasi Security Advisor warning)

### 2. Dependencies Update
```bash
# Jalankan commands ini:
npm install pg
npm uninstall @supabase/supabase-js mysql2
```

### 3. Configuration Files
- [ ] Update `config/database.js` ✅ (SELESAI)
- [ ] Update `package.json` ✅ (SELESAI)  
- [ ] Buat file `.env` dari `.env.example`
- [ ] Update semua controllers untuk menggunakan PostgreSQL syntax

### 4. Environment Variables Setup
Buat file `.env` dengan isi:
```env
SUPABASE_DB_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
NODE_ENV=development
PORT=3000
```

### 5. Test Database Connection
```bash
node test-database.js
```

### 6. Update Controllers
Gunakan `CONTOH_CONTROLLER_UPDATE.js` sebagai panduan untuk mengupdate:
- [ ] `controllers/adminController.js`
- [ ] `controllers/kamarController.js`
- [ ] `controllers/pembayaranController.js`
- [ ] `controllers/resepsionisController.js`
- [ ] `controllers/reservasiController.js`
- [ ] `controllers/tamuController.js`

**PENTING**: Ganti semua:
- `const { supabase } = require('../config/database')` → `const pool = require('../config/database')`
- `await supabase.from('table').select()` → `await pool.query('SELECT * FROM table')`
- Parameter `?` → `$1, $2, $3`
- `result.insertId` → `result.rows[0].id_column`

### 7. Test Application Locally
```bash
npm start
# Test di http://localhost:3000
# Test login, register, dan semua fitur
```

---

## 🚀 DEPLOYMENT TO VERCEL VIA GITHUB

### 1. Persiapan GitHub Repository

#### A. Push Project ke GitHub
```bash
# Inisialisasi git (jika belum)
git init

# Tambahkan .gitignore
echo "node_modules/
.env
.vercel
*.log" > .gitignore

# Add semua files
git add .

# Commit
git commit -m "Initial commit: Hotel Reservation System ready for deployment"

# Buat repository di GitHub, lalu:
git remote add origin https://github.com/username/hotel-reservation-system.git
git branch -M main
git push -u origin main
```

#### B. Verifikasi Files yang Di-push
Pastikan ada di GitHub:
- [x] `package.json` dengan dependencies yang benar
- [x] `server.js` atau `app.js`
- [x] Folder `public/` dengan frontend
- [x] Folder `routes/`, `controllers/`, `config/`
- [x] `vercel.json` (jika ada)
- [x] ❌ **TIDAK** ada `.env` (harus di .gitignore)

### 2. Setup Vercel Dashboard

#### A. Login ke Vercel
1. Buka [vercel.com](https://vercel.com)
2. Login dengan GitHub account
3. Authorize Vercel untuk akses repository

#### B. Import Project
1. Click "Add New" → "Project"
2. Import dari GitHub repository
3. Pilih repository hotel-reservation-system
4. Click "Import"

### 3. Configure Deployment Settings

#### A. Framework Preset
- **Framework Preset**: Other/Node.js
- **Root Directory**: `./` (default)
- **Build Command**: `npm install` (default)
- **Output Directory**: `public` (untuk static files)
- **Install Command**: `npm install` (default)

#### B. Environment Variables (PENTING!)
Di Vercel Dashboard, tambahkan:

```env
# Key: SUPABASE_DB_URL
# Value: postgresql://postgres:password@db.xyz.supabase.co:5432/postgres

# Key: JWT_SECRET  
# Value: your-super-secret-jwt-key-minimum-32-characters-long

# Key: NODE_ENV
# Value: production

# Key: PORT
# Value: 3000
```

### 4. Configure Vercel.json (OPSIONAL)

Buat file `vercel.json` di root project:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**/*",
      "use": "@vercel/static"
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
  "functions": {
    "server.js": {
      "maxDuration": 30
    }
  }
}
```

### 5. Deploy!
1. Click "Deploy" di Vercel Dashboard
2. Tunggu build process selesai (~2-3 menit)
3. ✅ Deployment berhasil! URL otomatis tersedia

### 6. Auto-Deploy Setup
- ✅ **Auto-deploy**: Setiap push ke `main` branch akan auto-deploy
- ✅ **Preview**: Pull request akan buat preview deployment
- ✅ **Rollback**: Bisa rollback ke deployment sebelumnya

---

## 🧪 POST-DEPLOYMENT TESTING

### 1. Health Check
Buka: `https://your-app.vercel.app/api/health`

### 2. Database Test
Buka: `https://your-app.vercel.app/api/kamar`
(Harus menampilkan daftar kamar)

### 3. Frontend Test
Buka: `https://your-app.vercel.app`
- [ ] Halaman utama loading
- [ ] Login page berfungsi
- [ ] Register berfungsi
- [ ] Dashboard admin/resepsionis/tamu berfungsi

### 4. Full Functionality Test
- [ ] Admin: Kelola kamar, resepsionis, tamu
- [ ] Resepsionis: Kelola reservasi, pembayaran
- [ ] Tamu: Buat reservasi, lihat kamar
- [ ] CRUD operations berfungsi
- [ ] Database constraints berfungsi

---

## 🔧 TROUBLESHOOTING

### Error: "Cannot find module 'pg'"
```bash
npm install pg
vercel --prod
```

### Error: "Connection refused"
- Check SUPABASE_DB_URL format
- Pastikan environment variables ter-set di Vercel

### Error: "Function not found"
- Check apakah semua controllers sudah diupdate
- Check import statements di controllers

### Error: "Query failed"
- Check PostgreSQL syntax ($ parameters instead of ?)
- Check RETURNING clauses untuk INSERT

---

## 📋 FINAL VERIFICATION

Sebelum menyelesaikan deployment, pastikan:

- [ ] Database connection test berhasil
- [ ] Semua endpoints API merespons dengan benar  
- [ ] Frontend dapat diakses dan berfungsi
- [ ] Login/logout berfungsi untuk semua role
- [ ] CRUD operations berfungsi untuk semua tabel
- [ ] No errors di browser console
- [ ] No errors di Vercel function logs

---

## 🎉 SELESAI!

Jika semua checklist di atas sudah ✅, maka:

✅ **Database**: Berhasil migrasi dari MySQL ke Supabase  
✅ **Backend**: Node.js + Express.js running di Vercel  
✅ **Frontend**: Static files served dari Vercel  
✅ **Domain**: https://your-app.vercel.app  
✅ **Production Ready**: Aplikasi siap digunakan!  

**Selamat! Hotel Reservation System Anda sudah live di production! 🚀**

---

## 📞 BANTUAN

Jika ada error atau pertanyaan:

1. Check Vercel function logs: `vercel logs your-app.vercel.app`
2. Check browser developer tools console
3. Test database connection dengan `node test-database.js`
4. Pastikan semua environment variables sudah di-set di Vercel dashboard

**Struktur database tetap sama dengan MySQL, jadi DFD/ERD Anda tetap valid untuk presentasi ke dosen! 📊**
