// File ini bisa Anda isi nanti dengan fungsi validasi form yang lebih kompleks
// Contoh sederhana:
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(email).toLowerCase());
}

function isNotEmpty(value) {
    return value && value.trim() !== '';
}

function hasMinLength(value, minLength) {
    return value && value.length >= minLength;
}

// Anda bisa menambahkan fungsi validasi lain di sini
// seperti validasi nomor telepon, tanggal, dll.

console.log("validation.js loaded - berisi fungsi helper validasi.");