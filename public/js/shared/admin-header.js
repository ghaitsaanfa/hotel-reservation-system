// Admin Header Component - consistent header for all admin pages
function createAdminHeader(activePage) {
    const headerHTML = `
        <!-- Header untuk Admin -->
        <header class="header-standard flex items-center justify-between whitespace-nowrap px-6 md:px-10 py-4 shadow-md">
            <div class="flex items-center gap-3">
                <div class="size-8 header-brand-icon-color">
                    <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M8.25 6h7.5m-7.5 3h7.5m-7.5 3h7.5m-7.5 3h7.5M3 12h18" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                </div>
                <a href="/admin/dashboard.html" class="text-xl font-bold leading-tight tracking-[-0.015em] header-text-color">The Grand Royale - Admin</a>
            </div>
            <nav class="hidden md:flex flex-1 justify-center items-center gap-4 lg:gap-6">
                <a class="header-nav-link-color ${activePage === 'dashboard' ? 'active' : ''} text-sm font-medium leading-normal transition-colors" href="/admin/dashboard.html">Dashboard</a>
                <a class="header-nav-link-color ${activePage === 'manajemen-kamar' ? 'active' : ''} text-sm font-medium leading-normal transition-colors" href="/admin/manajemen-kamar.html">Manajemen Kamar</a>
                <a class="header-nav-link-color ${activePage === 'data-reservasi' ? 'active' : ''} text-sm font-medium leading-normal transition-colors" href="/admin/data-reservasi.html">Data Reservasi</a>
                <a class="header-nav-link-color ${activePage === 'data-pembayaran' ? 'active' : ''} text-sm font-medium leading-normal transition-colors" href="/admin/data-pembayaran.html">Data Pembayaran</a>
                <a class="header-nav-link-color ${activePage === 'manajemen-tamu' ? 'active' : ''} text-sm font-medium leading-normal transition-colors" href="/admin/manajemen-tamu.html">Manajemen Tamu</a>
                <a class="header-nav-link-color ${activePage === 'manajemen-resepsionis' ? 'active' : ''} text-sm font-medium leading-normal transition-colors" href="/admin/manajemen-resepsionis.html">Manajemen Resepsionis</a>
            </nav>
            <div class="flex items-center gap-4">
                <div id="userSpecificLinks" class="flex items-center gap-3">
                    <span id="userNameDisplay" class="text-sm font-medium header-text-color">Admin</span>
                    <button id="logoutButton" class="btn-secondary flex items-center justify-center rounded-lg h-10 px-4 text-sm font-semibold transition-colors min-w-[84px] hover:bg-opacity-80">Logout</button>
                </div>
                <button class="mobile-menu-button md:hidden">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>
        </header>

        <!-- Mobile Menu -->
        <div class="mobile-menu bg-[var(--card-bg-color)] border-b border-[var(--secondary-color)] px-4 py-3">
            <div class="space-y-1">
                <a href="/admin/dashboard.html" class="text-[var(--text-muted-color)] hover:bg-[var(--input-bg-color)] hover:text-[var(--primary-color)] ${activePage === 'dashboard' ? 'text-[var(--primary-color)]' : ''} block rounded-md px-3 py-2 text-base font-medium">Dashboard</a>
                <a href="/admin/manajemen-kamar.html" class="text-[var(--text-muted-color)] hover:bg-[var(--input-bg-color)] hover:text-[var(--primary-color)] ${activePage === 'manajemen-kamar' ? 'text-[var(--primary-color)]' : ''} block rounded-md px-3 py-2 text-base font-medium">Manajemen Kamar</a>
                <a href="/admin/data-reservasi.html" class="text-[var(--text-muted-color)] hover:bg-[var(--input-bg-color)] hover:text-[var(--primary-color)] ${activePage === 'data-reservasi' ? 'text-[var(--primary-color)]' : ''} block rounded-md px-3 py-2 text-base font-medium">Data Reservasi</a>
                <a href="/admin/data-pembayaran.html" class="text-[var(--text-muted-color)] hover:bg-[var(--input-bg-color)] hover:text-[var(--primary-color)] ${activePage === 'data-pembayaran' ? 'text-[var(--primary-color)]' : ''} block rounded-md px-3 py-2 text-base font-medium">Data Pembayaran</a>
                <a href="/admin/manajemen-tamu.html" class="text-[var(--text-muted-color)] hover:bg-[var(--input-bg-color)] hover:text-[var(--primary-color)] ${activePage === 'manajemen-tamu' ? 'text-[var(--primary-color)]' : ''} block rounded-md px-3 py-2 text-base font-medium">Manajemen Tamu</a>
                <a href="/admin/manajemen-resepsionis.html" class="text-[var(--text-muted-color)] hover:bg-[var(--input-bg-color)] hover:text-[var(--primary-color)] ${activePage === 'manajemen-resepsionis' ? 'text-[var(--primary-color)]' : ''} block rounded-md px-3 py-2 text-base font-medium">Manajemen Resepsionis</a>
            </div>
            <div class="mt-4 pt-4 border-t border-[var(--secondary-color)]">
                <div class="flex items-center mb-3">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-[var(--primary-color)] rounded-full flex items-center justify-center">
                            <span class="text-sm font-medium text-white">A</span>
                        </div>
                    </div>
                    <div class="ml-3">
                        <p id="mobileUserName" class="text-base font-medium text-[var(--text-color)]">Admin</p>
                        <p id="mobileUserEmail" class="text-sm font-medium text-[var(--text-muted-color)]">Administrator</p>
                    </div>
                </div>
                <button id="mobileHeaderLogoutButton" class="w-full flex items-center justify-center rounded-md bg-[var(--primary-color)] px-3 py-2 text-base font-medium text-white hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--primary-color)]">
                    Logout
                </button>
            </div>
        </div>
    `;
    
    return headerHTML;
}

// Mobile menu functionality and logout setup
function setupAdminHeader() {
    // Mobile menu functionality
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('show');
        });
    }
    
    // Setup logout functionality
    const logoutButtons = document.querySelectorAll('#logoutButton, #mobileHeaderLogoutButton');
    logoutButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (confirm('Apakah Anda yakin ingin logout?')) {
                logoutUser();
                window.location.href = '/login.html';
            }
        });
    });
}
