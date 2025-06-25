const USER_SESSION_KEY = 'hotelAppUser';

function getCurrentUser() {
    const userJson = localStorage.getItem(USER_SESSION_KEY);
    return userJson ? JSON.parse(userJson) : null;
}

function setCurrentUser(username, role) {
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify({ username, role }));
}

function clearCurrentUser() {
    localStorage.removeItem(USER_SESSION_KEY);
}

function redirectTo(path) {
    window.location.href = path;
}

function updateHeaderState() { // Untuk header baru (Tailwind)
    const user = getCurrentUser();
    const userSpecificLinks = document.getElementById('userSpecificLinks');
    const guestSpecificLinks = document.getElementById('guestSpecificLinks');
    const myReservationsButtonLink = document.getElementById('myReservationsButtonLink');
    const myReservationsButtonText = document.querySelector('#myReservationsButton span');
    const headerLogoutButton = document.getElementById('headerLogoutButton');

    if (user) {
        if (userSpecificLinks) userSpecificLinks.style.display = 'flex';
        if (guestSpecificLinks) guestSpecificLinks.style.display = 'none';

        if (myReservationsButtonLink && myReservationsButtonText) {
            switch (user.role) {
                case 'tamu':
                    myReservationsButtonLink.href = '/tamu/reservasi-saya.html'; // Atau dashboard tamu
                    myReservationsButtonText.textContent = 'My Reservations';
                    break;
                case 'resepsionis':
                    myReservationsButtonLink.href = '/resepsionis/dashboard.html';
                    myReservationsButtonText.textContent = 'Staff Dashboard';
                    break;
                case 'admin':
                    myReservationsButtonLink.href = '/admin/dashboard.html';
                    myReservationsButtonText.textContent = 'Admin Dashboard';
                    break;
                default:
                    myReservationsButtonLink.href = '#';
                    myReservationsButtonText.textContent = 'Dashboard';
            }
        }
        if (headerLogoutButton) {
            headerLogoutButton.style.display = 'flex';
            headerLogoutButton.onclick = (e) => {
                e.preventDefault();
                clearCurrentUser();
                redirectTo('/'); // Redirect ke halaman utama (index.html)
            };
        }

    } else { // No user logged in
        if (userSpecificLinks) userSpecificLinks.style.display = 'none';
        if (guestSpecificLinks) guestSpecificLinks.style.display = 'flex';
    }
}

// Fungsi untuk navigasi lama (jika masih ada di halaman lain)
function updateOldNavigation() {
    const user = getCurrentUser();
    const navLogin = document.getElementById('navLogin');
    const navRegister = document.getElementById('navRegister');
    const navLogout = document.getElementById('navLogout'); // Tombol logout di nav utama lama
    const usernameDisplay = document.getElementById('usernameDisplay');
    const navTamuDashboardLink = document.getElementById('navTamuDashboardLink');
    const navResepsionisDashboardLink = document.getElementById('navResepsionisDashboardLink');
    const navAdminDashboardLink = document.getElementById('navAdminDashboardLink');

    if (navLogin) navLogin.style.display = user ? 'none' : 'inline-block';
    if (navRegister) navRegister.style.display = user ? 'none' : 'inline-block';
    if (navLogout) navLogout.style.display = user ? 'inline-block' : 'none';
    if (usernameDisplay) usernameDisplay.textContent = user ? `Login sebagai: ${user.username} (${user.role})` : '';

    if (navTamuDashboardLink) navTamuDashboardLink.style.display = (user && user.role === 'tamu') ? 'inline-block' : 'none';
    if (navResepsionisDashboardLink) navResepsionisDashboardLink.style.display = (user && user.role === 'resepsionis') ? 'inline-block' : 'none';
    if (navAdminDashboardLink) navAdminDashboardLink.style.display = (user && user.role === 'admin') ? 'inline-block' : 'none';

    if (navLogout) { // Untuk tombol logout di header LAMA
        navLogout.onclick = (e) => { // Ganti addEventListener dengan onclick agar tidak duplikat jika script dipanggil berkali-kali
            e.preventDefault();
            clearCurrentUser();
            redirectTo('/login.html'); // Arahkan ke login.html
        };
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // Cek apakah kita di halaman yang menggunakan header baru atau lama
    if (document.getElementById('userSpecificLinks')) { // Cek keberadaan elemen header baru
        updateHeaderState();
    } else if (document.getElementById('navLogin')) { // Cek keberadaan elemen header lama
        updateOldNavigation();
    }


    // Handle logout button di sub-navigation (dari kode lama, relevan untuk halaman dashboard)
    const subNavLogoutButton = document.getElementById('subNavLogout');
    if (subNavLogoutButton) {
        subNavLogoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            clearCurrentUser();
            redirectTo('/'); // Redirect ke halaman utama (index.html)
        });
    }
});

function protectPage(allowedRoles) {
    const user = getCurrentUser();
    if (!user) {
        alert('Anda harus login untuk mengakses halaman ini.');
        redirectTo('/login.html'); // Arahkan ke login.html
        return false;
    }
    if (!allowedRoles.includes(user.role)) {
        alert(`Akses ditolak. Halaman ini hanya untuk peran: ${allowedRoles.join(', ')}.`);
        switch (user.role) {
            case 'tamu': redirectTo('/tamu/dashboard.html'); break;
            case 'resepsionis': redirectTo('/resepsionis/dashboard.html'); break;
            case 'admin': redirectTo('/admin/dashboard.html'); break;
            default: redirectTo('/'); break;
        }
        return false;
    }
    const subUsernameDisplay = document.getElementById('subUsernameDisplay');
    if (subUsernameDisplay) {
        subUsernameDisplay.textContent = `User: ${user.username} (${user.role})`;
    }
    return true;
}