/*
 * UTILITIES FOR RECEPTIONIST PAGES - UPDATED ROOM AVAILABILITY LOGIC
 * 
 * Fungsi-fungsi utilitas untuk halaman resepsionis yang menggunakan logika
 * ketersediaan kamar yang telah diperbaiki.
 */

// Validate date range for room availability checking
function validateDateRange(checkinDate, checkoutDate) {
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if dates are valid
    if (isNaN(checkin.getTime()) || isNaN(checkout.getTime())) {
        return { valid: false, message: 'Tanggal tidak valid' };
    }
    
    // Check if check-in is not in the past
    checkin.setHours(0, 0, 0, 0);
    if (checkin < today) {
        return { valid: false, message: 'Tanggal check-in tidak boleh di masa lalu' };
    }
    
    // Check if check-out is after check-in
    if (checkout <= checkin) {
        return { valid: false, message: 'Tanggal check-out harus setelah tanggal check-in' };
    }
    
    return { valid: true };
}

// Check if two date ranges overlap (for room availability)
function datesOverlap(start1, end1, start2, end2) {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);
    
    // Two date ranges overlap if: start1 < end2 AND start2 < end1
    return s1 < e2 && s2 < e1;
}

// Calculate number of nights between two dates
function calculateNights(checkinDate, checkoutDate) {
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    return Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
}

// Calculate total cost with PPN
function calculateTotalCost(roomPrice, nights, ppnRate = 0.10) {
    const subtotal = roomPrice * nights;
    const ppnAmount = subtotal * ppnRate;
    const total = subtotal + ppnAmount;
    
    return {
        subtotal,
        ppnAmount,
        total,
        nights
    };
}

// Format currency for Indonesian Rupiah
function formatCurrencyIDR(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Get room type facilities
function getRoomFacilities(roomType) {
    const facilities = {
        'Standard': ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam'],
        'Superior': ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam', 'Mini Bar'],
        'Deluxe': ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam', 'Mini Bar', 'Balkon'],
        'Suite': ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam', 'Mini Bar', 'Balkon', 'Ruang Tamu'],
        'Family': ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam', 'Mini Bar', 'Ruang Keluarga', 'Extra Bed']
    };
    
    return facilities[roomType] || ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam'];
}

// Validate room capacity against guest count
function validateRoomCapacity(roomCapacity, guestCount) {
    const capacity = parseInt(roomCapacity);
    const guests = parseInt(guestCount);
    
    if (guests > capacity) {
        return {
            valid: false,
            message: `Kamar hanya dapat menampung ${capacity} tamu, namun Anda memilih ${guests} tamu`
        };
    }
    
    return { valid: true };
}

// Get reservation status display
function getReservationStatusDisplay(status) {
    const statusMap = {
        'Belum Bayar': { class: 'status-pending', text: 'Belum Bayar' },
        'Menunggu Konfirmasi': { class: 'status-pending', text: 'Menunggu Konfirmasi' },
        'Dikonfirmasi': { class: 'status-confirmed', text: 'Dikonfirmasi' },
        'Check-In': { class: 'status-active', text: 'Check-In' },
        'Check-Out': { class: 'status-completed', text: 'Check-Out' },
        'Dibatalkan': { class: 'status-cancelled', text: 'Dibatalkan' }
    };
    
    return statusMap[status] || { class: 'status-unknown', text: status };
}

// Get room status display
function getRoomStatusDisplay(status) {
    const statusMap = {
        'Tersedia': { class: 'status-available', text: 'Tersedia' },
        'Ditempati': { class: 'status-occupied', text: 'Ditempati' },
        'Dipesan': { class: 'status-reserved', text: 'Dipesan' },
        'Maintenance': { class: 'status-maintenance', text: 'Maintenance' },
        'Tidak Tersedia': { class: 'status-unavailable', text: 'Tidak Tersedia' }
    };
    
    return statusMap[status] || { class: 'status-unknown', text: status };
}

// Validate guest information
function validateGuestInfo(guestData) {
    const { nama, no_hp, email } = guestData;
    
    if (!nama || nama.trim().length < 2) {
        return { valid: false, message: 'Nama tamu harus diisi minimal 2 karakter' };
    }
    
    if (!no_hp || no_hp.trim().length < 10) {
        return { valid: false, message: 'Nomor HP harus diisi minimal 10 digit' };
    }
    
    // Basic phone number validation (Indonesian format)
    const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
    if (!phoneRegex.test(no_hp.replace(/\s|-/g, ''))) {
        return { valid: false, message: 'Format nomor HP tidak valid' };
    }
    
    // Email validation if provided
    if (email && email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { valid: false, message: 'Format email tidak valid' };
        }
    }
    
    return { valid: true };
}

// Show notification message
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="notification-close">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateDateRange,
        datesOverlap,
        calculateNights,
        calculateTotalCost,
        formatCurrencyIDR,
        getRoomFacilities,
        validateRoomCapacity,
        getReservationStatusDisplay,
        getRoomStatusDisplay,
        validateGuestInfo,
        showNotification
    };
}
