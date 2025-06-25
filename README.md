# 🏨 Sistem Reservasi Hotel

Project Database Kelompok 3 - Sistem Reservasi Hotel dengan migrasi dari MySQL ke Supabase.

## 📋 Fitur Utama
- **Admin**: Kelola kamar, resepsionis, tamu, dan laporan
- **Resepsionis**: Kelola reservasi, pembayaran, dan status kamar  
- **Tamu**: Buat reservasi, lihat kamar, dan kelola profil

## 🗄️ Database
- **MySQL Asli**: `database/reservasi_hotel.sql`
- **Supabase Minimal**: `database/reservasi_hotel_supabase_minimal.sql`

## 🚀 Cara Migrasi ke Supabase
1. Buka [Supabase](https://supabase.com) dan buat project baru
2. Copy-paste isi file `database/reservasi_hotel_supabase_minimal.sql` ke SQL Editor
3. Jalankan script SQL
4. Update connection string di `config/database.js`
5. Deploy ke Vercel

**Detail lengkap**: [MIGRASI_GUIDE_LENGKAP.md](MIGRASI_GUIDE_LENGKAP.md)

## 📦 Instalasi
```bash
npm install
npm install pg  # untuk PostgreSQL/Supabase
npm start
```

## 🔧 Environment Variables
```env
SUPABASE_DB_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

## 📁 Struktur Database
- `admin` - Data administrator
- `kamar` - Data kamar hotel
- `tamu` - Data tamu/customer
- `resepsionis` - Data staff resepsionis
- `reservasi` - Data reservasi kamar
- `pembayaran` - Data pembayaran reservasi

## 🎯 Keunggulan Migrasi Minimal
✅ Struktur database 100% sama dengan MySQL  
✅ DFD/ERD tidak berubah  
✅ Kode aplikasi minimal berubah  
✅ Cocok untuk project akademik  
✅ Deploy ke Vercel mudah  

## 👥 Tim Pengembang
Kelompok 3 - Project Database Semester 4
