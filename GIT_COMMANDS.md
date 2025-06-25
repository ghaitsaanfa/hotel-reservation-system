# 🔧 GIT SETUP COMMAND REFERENCE

## ✅ Status Saat Ini:
- Repository sudah diinisialisasi
- Branch sudah di `main` 
- Semua files sudah committed

## 🚀 LANGKAH SELANJUTNYA (Copy-Paste Commands):

### 1. Buat Repository di GitHub
1. Buka [github.com](https://github.com)
2. Click **"New repository"**
3. Nama repository: `hotel-reservation-system`
4. **Public** atau **Private** (pilih sesuai kebutuhan)
5. **JANGAN** centang "Add README" (karena sudah ada)
6. Click **"Create repository"**

### 2. Connect ke GitHub (GANTI URL dengan repository Anda)
```bash
# Ganti YOURUSERNAME dengan username GitHub Anda
git remote add origin https://github.com/YOURUSERNAME/hotel-reservation-system.git

# Push ke GitHub
git push -u origin main
```

### 3. Contoh Complete Commands:
```bash
# Jika username GitHub Anda adalah "johnsmith":
git remote add origin https://github.com/johnsmith/hotel-reservation-system.git
git push -u origin main
```

### 4. Verifikasi Push Berhasil
Setelah push, refresh halaman GitHub repository Anda. Harus terlihat semua files project.

---

## 🎯 SETELAH PUSH KE GITHUB:

### Deploy ke Vercel:
1. Login di [vercel.com](https://vercel.com) dengan GitHub
2. **"Add New"** → **"Project"** 
3. **"Import Git Repository"**
4. Pilih repository `hotel-reservation-system`
5. **"Import"**
6. **Build Settings** (biasanya auto-detect):
   - **Framework Preset**: Other/Node.js
   - **Build Command**: `npm install` (atau kosongkan untuk auto-detect)
   - **Output Directory**: `public`
   - **Install Command**: `npm install`
7. Set Environment Variables:
   - `SUPABASE_DB_URL` = Connection string PostgreSQL
   - `JWT_SECRET` = Secret key
   - `NODE_ENV` = **production** (untuk live app di Vercel)
8. **"Deploy"**

---

## ⚠️ TROUBLESHOOTING:

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOURUSERNAME/hotel-reservation-system.git
```

### Error: "authentication failed"
- Pastikan GitHub username/password benar
- Atau gunakan Personal Access Token jika 2FA aktif

### Error: "repository not found"
- Pastikan repository sudah dibuat di GitHub
- Pastikan URL repository benar

---

## 📋 CHECKLIST:
- [x] Git repository initialized
- [x] Branch renamed to `main`
- [x] All files committed
- [ ] **NEXT**: Create GitHub repository
- [ ] **NEXT**: Push to GitHub
- [ ] **NEXT**: Deploy to Vercel

**READY FOR GITHUB PUSH! 🚀**
