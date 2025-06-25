# 🚀 PANDUAN DEPLOYMENT VIA GITHUB KE VERCEL

## 📋 LANGKAH-LANGKAH DEPLOYMENT

### 1. Persiapan Repository GitHub

#### A. Inisialisasi Git Repository
```bash
# Di folder project
git init
git add .
git commit -m "Initial commit: Hotel Reservation System ready for deployment"
```

#### B. Push ke GitHub
```bash
# Buat repository baru di GitHub: hotel-reservation-system
# Lalu jalankan:
git remote add origin https://github.com/YOURUSERNAME/hotel-reservation-system.git
git branch -M main
git push -u origin main
```

### 2. Setup Vercel dari GitHub

#### A. Login ke Vercel
1. Buka [vercel.com](https://vercel.com)
2. **Sign up/Login dengan GitHub account**
3. Authorize Vercel untuk akses repositories

#### B. Import Project dari GitHub
1. Di Vercel Dashboard → **"Add New"** → **"Project"**
2. **"Import Git Repository"**
3. Pilih repository: `hotel-reservation-system`
4. Click **"Import"**

#### C. Configure Project Settings
```
Framework Preset: Other
Root Directory: ./
Build Command: npm install
Output Directory: public
Install Command: npm install
```

### 3. 🔧 Set Environment Variables (PENTING!)

Di **Vercel Dashboard** → **Settings** → **Environment Variables**, tambahkan:

#### Variable 1: Database Connection
```
Name: SUPABASE_DB_URL
Value: postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
Environment: Production, Preview, Development
```

#### Variable 2: JWT Secret
```
Name: JWT_SECRET
Value: your-super-secret-jwt-key-minimum-32-characters-long
Environment: Production, Preview, Development
```

#### Variable 3: Node Environment
```
Name: NODE_ENV
Value: production
Environment: Production
```

#### Variable 4: Port (opsional)
```
Name: PORT
Value: 3000
Environment: Production, Preview, Development
```

### 4. 🚀 Deploy!

1. Click **"Deploy"** di Vercel Dashboard
2. Tunggu build process (~2-3 menit)
3. ✅ **SELESAI!** App akan tersedia di: `https://your-app.vercel.app`

### 5. 🔄 Auto-Deployment Setup (Bonus!)

Setelah setup initial:
- ✅ **Auto-deploy**: Setiap `git push` ke branch `main` akan auto-deploy
- ✅ **Preview deployments**: Pull requests akan buat preview URL
- ✅ **Instant rollback**: Bisa rollback ke deployment sebelumnya

---

## 🧪 POST-DEPLOYMENT TESTING

### 1. Test URL yang Akan Tersedia:
```
Frontend: https://your-app.vercel.app
API: https://your-app.vercel.app/api/kamar
Admin: https://your-app.vercel.app/admin/dashboard.html
Login: https://your-app.vercel.app/login.html
```

### 2. Health Check Tests:
- [ ] **Homepage**: `https://your-app.vercel.app` → Harus load index.html
- [ ] **API Test**: `https://your-app.vercel.app/api/kamar` → Harus return JSON kamar list
- [ ] **Database**: Login page harus bisa connect dan authenticate

---

## 🔧 TROUBLESHOOTING

### Error: "Server Error 500"
- Check Environment Variables di Vercel Dashboard
- Pastikan SUPABASE_DB_URL format benar

### Error: "Cannot find module"
- Check `package.json` dependencies
- Redeploy: Vercel Dashboard → Deployments → Redeploy

### Error: "Database connection failed"
- Verify SUPABASE_DB_URL di Environment Variables
- Test connection string di local dulu

### Error: Frontend tidak load
- Check file structure: folder `public/` harus ada
- Check `vercel.json` routing configuration

---

## 📊 KEUNTUNGAN DEPLOYMENT VIA GITHUB

✅ **Automatic Deployments**: Push → Auto deploy  
✅ **Team Collaboration**: Multiple developers bisa contribute  
✅ **Version Control**: History lengkap semua changes  
✅ **Preview Deployments**: Test sebelum production  
✅ **Easy Rollback**: Kembali ke versi sebelumnya dengan 1 klik  
✅ **CI/CD Pipeline**: Otomatis build, test, deploy  

---

## 🎯 HASIL AKHIR

Setelah deployment berhasil:

🌐 **Production URL**: `https://hotel-reservation-system.vercel.app`  
🔄 **Auto-deploy**: Aktif untuk setiap push ke main branch  
📱 **Mobile Responsive**: Otomatis responsive di semua device  
🔒 **HTTPS**: SSL certificate otomatis dari Vercel  
⚡ **CDN**: Global distribution untuk performa maksimal  

**🎉 Hotel Reservation System Anda sudah LIVE di production!**
