console.log('auth.js: Script start');

function getAuthToken() {
    console.log('auth.js: getAuthToken() called');
    return localStorage.getItem('token');
}

function isUserLoggedIn() {
    console.log('auth.js: isUserLoggedIn() called');
    const token = getAuthToken();
    return !!token;
}

function getLoggedInUser() {
    console.log('auth.js: getLoggedInUser() called');
    const userDataString = localStorage.getItem('currentUser');
    if (userDataString) {
        try {
            return JSON.parse(userDataString);
        } catch (e) {
            console.error("auth.js: Error parsing user data from localStorage:", e);
            return null;
        }
    }
    return null;
}

function setLoggedInUser(userData) {
    console.log('auth.js: setLoggedInUser() called with:', userData);
    if (userData) {
        localStorage.setItem('currentUser', JSON.stringify(userData));
    } else {
        localStorage.removeItem('currentUser');
    }
}

function logoutUser() {
    console.log('auth.js: logoutUser() called');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    updateLoginLogoutButtons(); // Update UI immediately
    // Minimal redirect for testing
    if (window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html' && window.location.pathname !== '/') {
         // Check if already on a public page to avoid redirect loop
        const currentPath = window.location.pathname;
        const publicPages = ['/login.html', '/register.html', '/index.html', '/kamar.html'];
        if (!publicPages.includes(currentPath)) {
            window.location.href = '/login.html';
        }
    }
}

function updateLoginLogoutButtons() {
    console.log('auth.js: updateLoginLogoutButtons() called');
    console.log('auth.js: Current URL:', window.location.pathname);
    
    const guestLinks = document.getElementById('guestSpecificLinks');
    const userLinks = document.getElementById('userSpecificLinks');
    const headerLogoutButton = document.getElementById('headerLogoutButton');
    const mobileHeaderLogoutButton = document.getElementById('mobileHeaderLogoutButton');
    const userAvatar = document.getElementById('userAvatar');
    const mobileUserAvatar = document.getElementById('mobileUserAvatar');
    const mobileUserName = document.getElementById('mobileUserName');
    const mobileUserEmail = document.getElementById('mobileUserEmail');

    console.log('auth.js: Elements found:', {
        guestLinks: !!guestLinks,
        userLinks: !!userLinks,
        headerLogoutButton: !!headerLogoutButton,
        userAvatar: !!userAvatar
    });

    const isLoggedIn = isUserLoggedIn();
    console.log('auth.js: User logged in status:', isLoggedIn);

    if (isLoggedIn) {
        console.log('auth.js: User IS logged in, updating UI for logged-in state.');
        if (guestLinks) {
            guestLinks.style.display = 'none';
            console.log('auth.js: Hidden guest links');
        }
        if (userLinks) {
            userLinks.style.display = 'flex';
            console.log('auth.js: Showed user links');
        }

        const user = getLoggedInUser();
        console.log('auth.js: User data:', user);
        if (user) {
            const initial = user.nama ? user.nama.charAt(0).toUpperCase() : (user.username ? user.username.charAt(0).toUpperCase() : 'T');
            if (userAvatar) {
                userAvatar.textContent = initial;
                userAvatar.style.backgroundImage = '';
            }
            if (mobileUserAvatar) {
                mobileUserAvatar.textContent = initial;
                mobileUserAvatar.style.backgroundImage = '';
            }
            if (mobileUserName) mobileUserName.textContent = user.nama || user.username || 'Pengguna';
            if (mobileUserEmail) mobileUserEmail.textContent = user.email || 'Tidak ada email';
        }

        if (headerLogoutButton) {
            headerLogoutButton.removeEventListener('click', logoutUser);
            headerLogoutButton.addEventListener('click', logoutUser);
            console.log('auth.js: Logout button event listener attached');
        }
        if (mobileHeaderLogoutButton) {
            mobileHeaderLogoutButton.removeEventListener('click', logoutUser);
            mobileHeaderLogoutButton.addEventListener('click', logoutUser);
        }
    } else {
        console.log('auth.js: User is NOT logged in, updating UI for guest state.');
        if (guestLinks) {
            guestLinks.style.display = 'flex';
            console.log('auth.js: Showed guest links');
        }
        if (userLinks) {
            userLinks.style.display = 'none';
            console.log('auth.js: Hidden user links');
        }
    }
}

// Test log to confirm functions are in global scope
console.log('auth.js: isUserLoggedIn type:', typeof isUserLoggedIn);
console.log('auth.js: getLoggedInUser type:', typeof getLoggedInUser);
console.log('auth.js: getAuthToken type:', typeof getAuthToken);
console.log('auth.js: logoutUser type:', typeof logoutUser);
console.log('auth.js: updateLoginLogoutButtons type:', typeof updateLoginLogoutButtons);
console.log('auth.js: setLoggedInUser type:', typeof setLoggedInUser);


document.addEventListener('DOMContentLoaded', () => {
    console.log('auth.js: DOMContentLoaded event fired on page:', window.location.pathname);
    const tokenOnLoad = localStorage.getItem('token');
    console.log('auth.js: Token from localStorage on DOMContentLoaded:', tokenOnLoad); // Crucial log
    updateLoginLogoutButtons(); // Call on every page load to set initial button states

    // Add event listener for mobile menu toggle if it exists on the page
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            const isHidden = mobileMenu.classList.contains('hidden');
            const mobileUserInfoContainer = mobileMenu.querySelector('.border-t.border-\\\\[var\\\\(--input-border-color\\\\)\\\\]');
            if (isHidden) {
                mobileMenu.classList.remove('hidden');
                if (isUserLoggedIn() && mobileUserInfoContainer) {
                    mobileUserInfoContainer.style.display = 'block';
                } else if (!isUserLoggedIn() && mobileUserInfoContainer) {
                    mobileUserInfoContainer.style.display = 'none';
                }
            } else {
                mobileMenu.classList.add('hidden');
            }
        });
    }
});

console.log('auth.js: Script end');