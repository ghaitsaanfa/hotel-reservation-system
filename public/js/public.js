document.addEventListener('DOMContentLoaded', () => {
    console.log("Skrip untuk halaman publik (public.js) dimuat.");
    // utils.js sudah memanggil updateHeaderState() atau updateOldNavigation()
    // Jika ada logika spesifik lain untuk index.html, tambahkan di sini.

    // Contoh: Jika Anda ingin melakukan sesuatu yang spesifik hanya di index.html
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        // Logika khusus untuk index.html
        console.log("Ini adalah halaman index.html dengan header baru.");
    }
});