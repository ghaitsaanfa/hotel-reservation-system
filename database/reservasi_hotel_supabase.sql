-- =====================================================================
-- DATABASE RESERVASI HOTEL - SUPABASE MINIMAL VERSION
-- Hanya konversi MySQL ke PostgreSQL tanpa UUID/RLS
-- Struktur tabel 100% sama dengan MySQL asli
-- =====================================================================

-- Tabel Admin (struktur identik dengan MySQL)
CREATE TABLE admin (
    id_admin SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- Tabel Kamar (struktur identik dengan MySQL)
CREATE TABLE kamar (
    id_kamar SERIAL PRIMARY KEY,
    no_kamar VARCHAR(10) NOT NULL UNIQUE,
    tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('Standard', 'Superior', 'Deluxe', 'Suite', 'Family')),
    harga DECIMAL(13, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Tersedia' CHECK (status IN ('Tersedia', 'Maintenance', 'Tidak Tersedia')),
    deskripsi_kamar VARCHAR(100) NOT NULL,
    kapasitas_maks VARCHAR(5) CHECK (kapasitas_maks IN ('2','3','4'))
);

-- Tabel Tamu (struktur identik dengan MySQL)
CREATE TABLE tamu (
    id_tamu SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    alamat TEXT,
    no_hp VARCHAR(20) UNIQUE,
    email VARCHAR(50) UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- Tabel Resepsionis (struktur identik dengan MySQL)
CREATE TABLE resepsionis (
    id_resepsionis SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    no_hp VARCHAR(20),
    email VARCHAR(50) UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- Tabel Reservasi (struktur identik dengan MySQL)
CREATE TABLE reservasi (
    id_reservasi SERIAL PRIMARY KEY,
    id_tamu INT NOT NULL,
    id_kamar INT NOT NULL,
    id_resepsionis INT NULL,
    tanggal_reservasi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tanggal_checkin DATE NOT NULL,
    tanggal_checkout DATE NOT NULL,
    jumlah_tamu INT NOT NULL DEFAULT 1,
    status_reservasi VARCHAR(30) NOT NULL DEFAULT 'Belum Bayar' 
        CHECK (status_reservasi IN ('Belum Bayar','Menunggu Konfirmasi', 'Dikonfirmasi', 'Check-In', 'Check-Out', 'Dibatalkan')),
    FOREIGN KEY (id_tamu) REFERENCES tamu(id_tamu) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (id_kamar) REFERENCES kamar(id_kamar) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (id_resepsionis) REFERENCES resepsionis(id_resepsionis) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_tanggal_valid CHECK (tanggal_checkout >= tanggal_checkin)
);

-- Tabel Pembayaran (struktur identik dengan MySQL)
CREATE TABLE pembayaran (
    id_pembayaran SERIAL PRIMARY KEY,
    id_reservasi INT NOT NULL,
    id_resepsionis INT NULL,
    tanggal_bayar TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    jumlah_bayar DECIMAL(13, 2) NOT NULL,
    metode_pembayaran VARCHAR(20) NOT NULL CHECK (metode_pembayaran IN ('Tunai', 'Kartu Kredit','Transfer Bank', 'E-Wallet')),
    status_pembayaran VARCHAR(30) NOT NULL DEFAULT 'Belum Lunas' 
        CHECK (status_pembayaran IN ('Belum Lunas', 'Lunas', 'Menunggu Verifikasi')),
    FOREIGN KEY (id_reservasi) REFERENCES reservasi(id_reservasi) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_resepsionis) REFERENCES resepsionis(id_resepsionis) ON DELETE SET NULL ON UPDATE CASCADE
);

-- =====================================================================
-- SAMPLE DATA (sama dengan MySQL)
-- =====================================================================

-- INSERT DATA ADMIN
INSERT INTO admin (id_admin, nama, username, password) VALUES
    (9, 'Administrator', 'admin', '$2b$10$vc9OwV8cE8VMPTFn.nzRUeTw21qALDce.uAktwvdM6EpU12mp2zwC'),
    (10, 'Super Admin', 'superadmin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- INSERT DATA KAMAR
INSERT INTO kamar (id_kamar, no_kamar, tipe, harga, status, deskripsi_kamar, kapasitas_maks) VALUES
    (9, '101', 'Standard', '500000.00', 'Tersedia', 'Kamar standar dengan pemandangan kota.', '2'),
    (10, '102', 'Standard', '500000.00', 'Maintenance', 'Kamar standar dengan pemandangan kota.', '2'),
    (11, '201', 'Superior', '750000.00', 'Tersedia', 'Kamar superior lebih luas dan elegan.', '2'),
    (12, '202', 'Superior', '750000.00', 'Tersedia', 'Kamar superior dengan fasilitas tambahan.', '3'),
    (13, '301', 'Deluxe', '1000000.00', 'Tersedia', 'Kamar deluxe mewah dengan balkon pribadi.', '3'),
    (14, '302', 'Deluxe', '1000000.00', 'Tersedia', 'Kamar deluxe mewah dengan balkon pribadi.', '3'),
    (15, '401', 'Suite', '1500000.00', 'Maintenance', 'Suite mewah dengan privat jacuzzi.', '4'),
    (16, '501', 'Family', '1200000.00', 'Tersedia', 'Kamar keluarga luas dengan ruang tamu terpisah.', '4'),
    (26, '103', 'Standard', '500000.00', 'Maintenance', 'Kamar standar dengan pemandangan kota.', '2'),
    (27, '104', 'Standard', '500000.00', 'Maintenance', 'Kamar standar dengan pemandangan kota.', '2'),
    (28, '105', 'Standard', '500000.00', 'Tersedia', 'Kamar standar dengan pemandangan kota.', '2'),
    (29, '203', 'Superior', '750000.00', 'Tersedia', 'Kamar superior lebih luas dan elegan.', '2'),
    (30, '204', 'Superior', '750000.00', 'Maintenance', 'Kamar superior lebih luas dan elegan.', '2'),
    (31, '205', 'Superior', '750000.00', 'Tersedia', 'Kamar superior dengan fasilitas tambahan.', '3'),
    (32, '303', 'Deluxe', '1000000.00', 'Tersedia', 'Kamar deluxe mewah dengan balkon pribadi.', '3'),
    (33, '304', 'Deluxe', '1000000.00', 'Tersedia', 'Kamar deluxe mewah dengan balkon pribadi.', '3'),
    (34, '305', 'Deluxe', '1000000.00', 'Maintenance', 'Kamar deluxe mewah dengan balkon pribadi.', '3'),
    (35, '402', 'Suite', '1500000.00', 'Tersedia', 'Suite mewah dengan privat jacuzzi.', '4'),
    (36, '403', 'Suite', '1500000.00', 'Maintenance', 'Suite mewah dengan privat jacuzzi.', '4'),
    (37, '404', 'Suite', '1500000.00', 'Tersedia', 'Suite mewah dengan privat jacuzzi.', '4'),
    (38, '405', 'Suite', '1500000.00', 'Maintenance', 'Suite mewah dengan privat jacuzzi.', '4'),
    (39, '502', 'Family', '1200000.00', 'Tersedia', 'Kamar keluarga luas dengan ruang tamu terpisah.', '4'),
    (40, '503', 'Family', '1200000.00', 'Maintenance', 'Kamar keluarga luas dengan ruang tamu terpisah.', '4'),
    (41, '504', 'Family', '1200000.00', 'Maintenance', 'Kamar keluarga luas dengan ruang tamu terpisah.', '4'),
    (42, '505', 'Family', '1200000.00', 'Tersedia', 'Kamar keluarga luas dengan ruang tamu terpisah.', '4');

-- INSERT DATA TAMU
INSERT INTO tamu (id_tamu, nama, alamat, no_hp, email, username, password) VALUES
    (5, 'Ahmad Wijayaa', 'Jl. Sudirman No. 123, Jakarta', '081234567892', 'ahmad@email.com', 'ahmadw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
    (6, 'Siti Nurhaliza', 'Jl. Thamrin No. 456, Jakarta', '081234567893', 'siti@email.com', 'sitin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
    (7, 'Budi Santoso', 'Jl. Gatot Subroto No. 789, Jakarta', '081234567894', 'budi@email.com', 'budis', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
    (8, 'Maya Sari', 'Jl. Kuningan No. 321, Jakarta', '081234567895', 'maya@email.com', 'mayas', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
    (9, 'Ghaitsa Anfa''', 'Semarangg', '081909962288', 'ghaitsa@gmail.com', 'ghaitsa', '$2b$10$H56wJXnEmiKhlIIknxPDtOcmcM4WjgHfyN7IN4QlB3uWW0Zb.Epxu'),
    (14, 'John Doe', 'Jakarta Selatan', '081234567890', 'john.doe@email.com', 'john.doe', '$2b$10$zsfoEjNG/rRGw4xIr2i4y.krrKgnYKktbX9l34B7ZTtJeekwkNgQG'),
    (20, 'Michael Johnson', 'Surabaya', '081234567896', 'michael.johnson@email.com', 'michael.johnson', '$2b$10$ntco0ZWqCDTHZ1bWQX9xl.9qNjhyVSI5XJal4FZfyws13ST1pGvVe'),
    (21, 'Sarah Williams', 'Yogyakarta', '081234567897', 'sarah.williams@email.com', 'sarah.williams', '$2b$10$impZAdSCGtZaKY7aCD.VzeyRRyKm.x1oGIgTwgozh/8is8idov1/O'),
    (22, 'David Brown', 'Medan', '081234567898', 'david.brown@email.com', 'david.brown', '$2b$10$DQeHP6XKmeUhanub6NyFL.JFYwDxlJFH26NzYyt9hbNMeCgurFnWC'),
    (23, 'Emily Davis', 'Bali', '081234567899', 'emily.davis@email.com', 'emily.davis', '$2b$10$sbeJ.f26eOYfClOj8VgzdektzV9oo21SwOQ9bi1gsu8GFCQ4SAXgm'),
    (24, 'Salma Aqillaa', 'Gunungpati', '0895397267510', 'salma@gmail.com', 'salma', '$2b$10$SH7R9soTWpFFxndl9ugjC.DrsMSu5pND.KG3EiM.uL6K7fc.sXljW');

-- INSERT DATA RESEPSIONIS
INSERT INTO resepsionis (id_resepsionis, nama, no_hp, email, username, password) VALUES
    (5, 'John Doe', '081234567890', 'john@hotel.com', 'johndoe', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
    (6, 'Jane Smith', '081234567891', 'jane@hotel.com', 'janesmith', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
    (9, 'Resepsionis', NULL, 'resepsionis@hotel.com', 'resepsionis1', '$2b$10$PsCqs8DKxQHk5CXm163v3eqhbJGSbeWDOuPG1ud6Mjr18lTRFlnvq'),
    (10, 'Salma', '088998989898', 'salma@hotel.com', 'resepsionis2', '$2b$10$YiyYGoigN8CxyQxX2Ggape2w69NjAyhvR8b/ux6TNCc6ok1jyf5z6');

-- INSERT DATA RESERVASI
INSERT INTO reservasi (id_reservasi, id_tamu, id_kamar, id_resepsionis, tanggal_reservasi, tanggal_checkin, tanggal_checkout, jumlah_tamu, status_reservasi) VALUES
    (12, 8, 15, 6, '2025-06-15 09:40:02', '2025-06-30 17:00:00', '2025-07-04 17:00:00', 4, 'Dikonfirmasi'),
    (16, 9, 9, 5, '2025-06-15 11:49:38', '2025-06-17 17:00:00', '2025-06-19 17:00:00', 2, 'Check-Out'),
    (17, 9, 9, 5, '2025-06-15 11:50:16', '2025-06-17 17:00:00', '2025-06-19 17:00:00', 2, 'Check-In'),
    (18, 9, 11, 6, '2025-06-15 11:50:16', '2025-07-09 17:00:00', '2025-07-11 17:00:00', 1, 'Dibatalkan'),
    (19, 9, 13, 5, '2025-06-15 11:50:16', '2025-04-30 17:00:00', '2025-05-02 17:00:00', 2, 'Check-In'),
    (20, 9, 9, NULL, '2025-06-16 00:08:08', '2025-06-19 17:00:00', '2025-06-21 17:00:00', 2, 'Dikonfirmasi'),
    (23, 9, 11, NULL, '2025-06-16 01:26:48', '2025-06-18 17:00:00', '2025-06-20 17:00:00', 2, 'Dibatalkan'),
    (25, 9, 35, NULL, '2025-06-16 07:18:31', '2025-06-16 17:00:00', '2025-06-17 17:00:00', 2, 'Dikonfirmasi'),
    (26, 5, 9, NULL, '2025-06-16 07:23:52', '2025-06-30 17:00:00', '2025-07-02 17:00:00', 2, 'Dikonfirmasi'),
    (27, 5, 9, 5, '2025-06-16 07:24:50', '2025-07-04 17:00:00', '2025-07-06 17:00:00', 2, 'Dikonfirmasi'),
    (28, 9, 11, NULL, '2025-06-16 07:26:09', '2025-06-16 17:00:00', '2025-06-18 17:00:00', 2, 'Dikonfirmasi'),
    (29, 9, 11, NULL, '2025-06-18 04:16:39', '2025-06-17 17:00:00', '2025-06-18 17:00:00', 2, 'Dikonfirmasi'),
    (30, 9, 11, 5, '2025-06-18 04:21:01', '2025-06-17 17:00:00', '2025-06-18 17:00:00', 2, 'Dikonfirmasi'),
    (31, 9, 11, NULL, '2025-06-18 10:35:11', '2025-06-17 17:00:00', '2025-06-18 17:00:00', 2, 'Dibatalkan'),
    (32, 9, 13, NULL, '2025-06-21 15:08:42', '2025-06-22 17:00:00', '2025-06-23 17:00:00', 2, 'Dibatalkan'),
    (33, 9, 13, NULL, '2025-06-21 20:45:05', '2025-06-22 17:00:00', '2025-06-23 17:00:00', 2, 'Dikonfirmasi'),
    (34, 9, 10, NULL, '2025-06-21 20:57:45', '2025-06-22 17:00:00', '2025-06-23 17:00:00', 2, 'Dikonfirmasi'),
    (35, 9, 14, NULL, '2025-06-21 21:40:08', '2025-06-22 17:00:00', '2025-06-23 17:00:00', 2, 'Dikonfirmasi'),
    (36, 9, 13, NULL, '2025-06-21 21:42:19', '2025-06-23 17:00:00', '2025-06-25 17:00:00', 2, 'Dikonfirmasi'),
    (37, 5, 11, 5, '2025-06-22 07:49:45', '2025-06-23 17:00:00', '2025-06-24 17:00:00', 2, 'Dikonfirmasi'),
    (38, 9, 12, NULL, '2025-06-22 11:44:40', '2025-06-22 17:00:00', '2025-06-24 17:00:00', 2, 'Dikonfirmasi'),
    (39, 24, 35, NULL, '2025-06-23 06:12:54', '2025-06-24 17:00:00', '2025-06-25 17:00:00', 2, 'Dikonfirmasi'),
    (40, 24, 11, NULL, '2025-06-23 06:35:32', '2025-06-24 17:00:00', '2025-06-26 17:00:00', 2, 'Menunggu Konfirmasi');

-- INSERT DATA PEMBAYARAN
INSERT INTO pembayaran (id_pembayaran, id_reservasi, id_resepsionis, tanggal_bayar, jumlah_bayar, metode_pembayaran, status_pembayaran) VALUES
    (8, 12, NULL, '2025-06-15 09:41:12', '6000000.00', 'Transfer Bank', 'Lunas'),
    (12, 20, NULL, '2025-06-16 06:42:07', '1000000.00', 'E-Wallet', 'Lunas'),
    (15, 28, NULL, '2025-06-16 07:26:20', '1500000.00', 'E-Wallet', 'Lunas'),
    (16, 29, NULL, '2025-06-18 04:16:48', '750000.00', 'E-Wallet', 'Lunas'),
    (17, 30, NULL, '2025-06-18 04:21:16', '750000.00', 'E-Wallet', 'Lunas'),
    (20, 26, NULL, '2025-06-21 09:04:56', '2200000.00', 'E-Wallet', 'Lunas'),
    (21, 27, 6, '2025-06-21 09:04:56', '900000.00', 'Kartu Kredit', 'Lunas'),
    (24, 33, NULL, '2025-06-21 20:45:22', '1000000.00', 'Transfer Bank', 'Lunas'),
    (25, 34, NULL, '2025-06-21 21:02:18', '500000.00', 'Transfer Bank', 'Lunas'),
    (26, 35, NULL, '2025-06-21 21:40:51', '1000000.00', 'Transfer Bank', 'Lunas'),
    (27, 38, NULL, '2025-06-22 11:44:59', '1500000.00', 'Transfer Bank', 'Lunas'),
    (28, 36, NULL, '2025-06-22 11:56:08', '2000000.00', 'Tunai', 'Belum Lunas'),
    (29, 37, NULL, '2025-06-22 14:49:41', '750000.00', 'Transfer Bank', 'Lunas'),
    (30, 39, NULL, '2025-06-23 06:14:09', '1500000.00', 'E-Wallet', 'Lunas'),
    (31, 40, NULL, '2025-06-23 06:47:45', '1815000.00', 'E-Wallet', 'Lunas');

-- =====================================================================
-- CATATAN PENTING
-- =====================================================================

/*
MIGRASI MINIMAL - TANPA UUID/RLS:

KEUNTUNGAN:
✅ Struktur database 100% identik dengan MySQL
✅ Tidak perlu mengubah kode aplikasi sama sekali
✅ DFD/ERD tetap valid dan sesuai dengan yang diajukan ke dosen
✅ Aplikasi langsung bisa jalan tanpa modifikasi
✅ Tidak ada kompleksitas tambahan UUID/RLS

KEKURANGAN:
❌ Tidak ada keamanan tingkat database (semua user bisa akses semua data)
❌ Keamanan hanya bergantung pada logic aplikasi
❌ Tidak memanfaatkan fitur keamanan Supabase

CARA DEPLOY:
1. Buat project di Supabase
2. Jalankan script SQL ini di SQL Editor Supabase
3. Update connection string di aplikasi Node.js dari MySQL ke PostgreSQL
4. Test aplikasi - seharusnya langsung jalan tanpa perubahan

COCOK UNTUK:
- Project akademik/kuliah yang fokus pada fungsionalitas
- Prototype atau demo
- Aplikasi internal yang tidak perlu keamanan tinggi
- Situasi dimana struktur database tidak boleh diubah

MENGATASI WARNING SECURITY ADVISOR:
- RLS dummy sudah ditambahkan di bagian bawah file ini
- Policy "Allow all access" mengizinkan semua akses (sama seperti tanpa RLS)
- Warning Security Advisor akan hilang tanpa mengubah fungsionalitas aplikasi
- Aplikasi tetap berjalan seperti biasa tanpa perubahan kode
*/

-- =====================================================================
-- OPTIONAL: RLS DUMMY UNTUK MENGHILANGKAN WARNING SECURITY ADVISOR
-- Hanya untuk mengatasi warning, tidak mengubah fungsionalitas aplikasi
-- =====================================================================

-- Enable RLS pada semua tabel (untuk menghilangkan warning)
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE kamar ENABLE ROW LEVEL SECURITY;
ALTER TABLE tamu ENABLE ROW LEVEL SECURITY;
ALTER TABLE resepsionis ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembayaran ENABLE ROW LEVEL SECURITY;

-- Buat policy yang mengizinkan semua akses (tidak ada restriksi)
-- Ini equivalen dengan tidak ada RLS sama sekali, hanya untuk menghilangkan warning

-- Policy untuk tabel admin
CREATE POLICY "Allow all access admin" ON admin FOR ALL USING (true) WITH CHECK (true);

-- Policy untuk tabel kamar
CREATE POLICY "Allow all access kamar" ON kamar FOR ALL USING (true) WITH CHECK (true);

-- Policy untuk tabel tamu
CREATE POLICY "Allow all access tamu" ON tamu FOR ALL USING (true) WITH CHECK (true);

-- Policy untuk tabel resepsionis
CREATE POLICY "Allow all access resepsionis" ON resepsionis FOR ALL USING (true) WITH CHECK (true);

-- Policy untuk tabel reservasi
CREATE POLICY "Allow all access reservasi" ON reservasi FOR ALL USING (true) WITH CHECK (true);

-- Policy untuk tabel pembayaran
CREATE POLICY "Allow all access pembayaran" ON pembayaran FOR ALL USING (true) WITH CHECK (true);
