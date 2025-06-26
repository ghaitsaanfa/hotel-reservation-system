document.addEventListener('DOMContentLoaded', async () => {
    // Initialize authentication and UI
    initializeAuth();
    setupMobileMenu();
    
    // Check authentication
    if (!isUserLoggedIn()) {
        showGuestUI();
        return;
    }

    const currentUser = getLoggedInUser(); 
    if (!currentUser || currentUser.role !== 'admin') {
        alert("Akses ditolak. Anda tidak memiliki hak akses admin.");
        logoutUser();
        window.location.href = '/login.html';
        return;
    }

    // Show user-specific UI
    showUserUI(currentUser);
    
    // Load dashboard data
    await loadDashboardStats();
});

function initializeAuth() {
    // Set up logout buttons
    const logoutButtons = ['headerLogoutButton', 'mobileHeaderLogoutButton'];
    logoutButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', handleLogout);
        }
    });
}

function setupMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

function showGuestUI() {
    const guestLinks = document.getElementById('guestSpecificLinks');
    const userLinks = document.getElementById('userSpecificLinks');
    
    if (guestLinks) guestLinks.style.display = 'flex';
    if (userLinks) userLinks.style.display = 'none';
}

function showUserUI(user) {
    const guestLinks = document.getElementById('guestSpecificLinks');
    const userLinks = document.getElementById('userSpecificLinks');
    
    if (guestLinks) guestLinks.style.display = 'none';
    if (userLinks) userLinks.style.display = 'flex';
    
    // Update user display elements
    updateUserDisplay(user);
}

function updateUserDisplay(user) {
    // Update admin name in various places
    const adminNameElements = ['adminNameDisplay', 'mobileUserName'];
    adminNameElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = user.nama || 'Admin';
        }
    });
    
    // Update avatars
    const avatarElements = ['userAvatar', 'mobileUserAvatar'];
    avatarElements.forEach(elementId => {
        const avatar = document.getElementById(elementId);
        if (avatar) {
            avatar.textContent = (user.nama || 'Admin').charAt(0).toUpperCase();
        }
    });
    
    // Update mobile user email (show role)
    const mobileUserEmail = document.getElementById('mobileUserEmail');
    if (mobileUserEmail) {
        mobileUserEmail.textContent = 'Administrator';
    }
}

async function loadDashboardStats() {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch('/api/admin/dashboard/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleAuthError();
                return;
            }
            throw new Error('Failed to fetch dashboard stats');
        }

        const result = await response.json();
        console.log('Dashboard stats response:', result);
        
        // Handle both old and new response formats
        const data = result.data || result;

        // Update statistics cards
        updateStatisticsCards(data);
        
        // Load recent reservations
        loadRecentReservations(data.reservasiTerbaru || []);

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showError('Gagal memuat statistik dashboard. Menggunakan data default.');
        
        // Show default/empty stats
        updateStatisticsCards({});
    }
}

function updateStatisticsCards(data) {
    // Update main statistics
    const statsElements = {
        'totalKamar': data.totalKamar || 0,
        'kamarTersedia': data.kamarTersedia || 0,
        'totalTamu': data.totalTamu || 0,
        'reservasiAktif': data.reservasiAktif || 0,
        'totalResepsionis': data.totalResepsionis || 0,
        'reservasiHariIni': data.reservasiHariIni || 0
    };
    
    Object.entries(statsElements).forEach(([elementId, value]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    });
    
    // Format and update revenue
    const pendapatan = data.pendapatanBulan || 0;
    const pendapatanElement = document.getElementById('pendapatanBulan');
    if (pendapatanElement) {
        pendapatanElement.textContent = formatCurrency(pendapatan);
    }
}

function loadRecentReservations(reservations) {
    const tbody = document.getElementById('reservasiTerbaru');
    
    if (!tbody) return;
    
    if (!reservations || reservations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-[var(--text-muted-color)]">Tidak ada reservasi terbaru</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = reservations.map(reservasi => `
        <tr class="border-b border-[var(--input-border-color)] hover:bg-[var(--table-row-hover-bg)]">
            <td class="py-3 px-4 text-[var(--text-color)]">#${reservasi.id_reservasi}</td>
            <td class="py-3 px-4 text-[var(--text-color)]">${reservasi.nama_tamu}</td>
            <td class="py-3 px-4 text-[var(--text-color)]">${reservasi.no_kamar} (${reservasi.tipe})</td>
            <td class="py-3 px-4 text-[var(--text-color)]">${formatDate(reservasi.tanggal_checkin)}</td>
            <td class="py-3 px-4 text-[var(--text-color)]">${formatDate(reservasi.tanggal_checkout)}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-1 rounded-full text-xs ${getStatusClass(reservasi.status_reservasi)}">
                    ${reservasi.status_reservasi}
                </span>
            </td>
        </tr>
    `).join('');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

function getStatusClass(status) {
    const statusClasses = {
        'Belum Bayar': 'bg-red-500/20 text-red-400',
        'Menunggu Konfirmasi': 'bg-yellow-500/20 text-yellow-400',
        'Dikonfirmasi': 'bg-blue-500/20 text-blue-400',
        'Check-In': 'bg-green-500/20 text-green-400',
        'Check-Out': 'bg-gray-500/20 text-gray-400',
        'Dibatalkan': 'bg-red-500/20 text-red-400'
    };
    return statusClasses[status] || 'bg-gray-500/20 text-gray-400';
}

function handleLogout() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        logoutUser();
        window.location.href = '/login.html';
    }
}

function handleAuthError() {
    alert('Sesi Anda telah berakhir. Silakan login kembali.');
    logoutUser();
    window.location.href = '/login.html';
}

function showError(message) {
    console.error(message);
    // You can implement a more sophisticated error display here
}