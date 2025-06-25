document.addEventListener('DOMContentLoaded', () => {
    // Ensure shared auth functions are available
    if (typeof isUserLoggedIn !== 'function' || 
        typeof getLoggedInUser !== 'function' ||
        typeof getAuthToken !== 'function' || // Assuming getAuthToken exists in shared/auth.js
        typeof logoutUser !== 'function') {
        console.error('Required authentication functions from shared/auth.js are not available.');
        alert('Error: Aplikasi tidak dapat memuat dengan benar. Fungsi autentikasi hilang.');
        return;
    }

    if (!isUserLoggedIn()) {
        alert("Akses ditolak. Anda harus login sebagai tamu.");
        // Store the current path to redirect back after login
        const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?role=tamu&redirect=${redirectUrl}`;
        return;
    }    const currentUser = getLoggedInUser();
    if (!currentUser || currentUser.role !== 'tamu') {
        alert("Akses ditolak. Halaman ini hanya untuk tamu.");
        logoutUser(); 
        const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?role=tamu&redirect=${redirectUrl}`;
        return;
    }

    // Force update login/logout buttons after successful authentication check
    console.log('dashboard.js: Authentication successful, forcing UI update');
    if (typeof updateLoginLogoutButtons === 'function') {
        updateLoginLogoutButtons();
    } else {
        console.error('dashboard.js: updateLoginLogoutButtons function not available');
    }

    const guestNameDisplay = document.getElementById('guestNameDisplay');
    const activeReservationsCount = document.getElementById('activeReservationsCount');
    const pastReservationsCount = document.getElementById('pastReservationsCount');
    
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    // Display guest name - using currentUser.nama as per login response
    if (guestNameDisplay) {
        if (currentUser.nama) {
            // Display the full name, or first name if you prefer: currentUser.nama.split(' ')[0]
            guestNameDisplay.textContent = currentUser.nama; 
        } else if (currentUser.username) { // Fallback to username
            guestNameDisplay.textContent = currentUser.username;
        } else {
            guestNameDisplay.textContent = 'Tamu'; // Default if no name/username
        }
    }

    // Fetch reservation summary from API
    const token = localStorage.getItem('token');
    if (token) {
        fetch('/api/tamu/dashboard/reservations-summary', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    alert('Sesi Anda telah berakhir atau akses ditolak. Silakan login kembali.');
                    if (typeof logoutUser === 'function') logoutUser();
                    window.location.href = '/login.html?role=tamu';
                }
                return response.json().then(err => { throw new Error(`HTTP error! status: ${response.status}, message: ${err.message || response.statusText}`)});
            }
            return response.json();        })
        .then(data => {
            console.log('dashboard.js: Received API response:', data);
            // Defensive: check structure
            const summary = data && data.data && data.data.summary ? data.data.summary : {};
            // Active = reservasi_dikonfirmasi + sedang_menginap + belum_bayar + menunggu_konfirmasi
            const activeCount =
                (parseInt(summary.reservasi_dikonfirmasi) || 0) +
                (parseInt(summary.sedang_menginap) || 0) +
                (parseInt(summary.belum_bayar) || 0) +
                (parseInt(summary.menunggu_konfirmasi) || 0);
            // Past = reservasi_selesai + reservasi_dibatalkan
            const pastCount =
                (parseInt(summary.reservasi_selesai) || 0) +
                (parseInt(summary.reservasi_dibatalkan) || 0);
            if (activeReservationsCount) {
                console.log('dashboard.js: Setting active count to:', activeCount);
                activeReservationsCount.textContent = activeCount;
            }
            if (pastReservationsCount) {
                console.log('dashboard.js: Setting past count to:', pastCount);
                pastReservationsCount.textContent = pastCount;
            }
        })
        .catch(error => {
            console.error('Error fetching reservation summary:', error);
            if (activeReservationsCount) {
                activeReservationsCount.textContent = '-'; // Indicate error or unavailable data
            }
            if (pastReservationsCount) {
                pastReservationsCount.textContent = '-';
            }
            // alert('Gagal memuat ringkasan reservasi. Silakan coba lagi nanti.');
        });
    } else {
        // Should not happen if isUserLoggedIn passed, but as a fallback
        alert('Token tidak ditemukan. Silakan login kembali.');
        if (typeof logoutUser === 'function') logoutUser();
        window.location.href = '/login.html?role=tamu';
    }
    
    // Toggle mobile menu
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Fungsi logout sudah ada di auth.js dan di-handle oleh headerLogoutButton
    // Tidak perlu implementasi logout spesifik di sini kecuali ada kebutuhan khusus
});