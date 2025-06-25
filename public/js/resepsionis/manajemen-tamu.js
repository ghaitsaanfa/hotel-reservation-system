document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth functions to load
    let authCheckAttempts = 0;
    while ((typeof isUserLoggedIn !== 'function' || typeof getLoggedInUser !== 'function') && authCheckAttempts < 50) {
        console.log('Waiting for auth functions to load...');
        await new Promise(resolve => setTimeout(resolve, 100));
        authCheckAttempts++;
    }

    if (typeof isUserLoggedIn !== 'function' || !isUserLoggedIn()) {
        alert("Akses ditolak. Anda harus login sebagai resepsionis.");
        const targetUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?role=resepsionis&redirect=${targetUrl}`;
        return;
    }

    const currentUser = getLoggedInUser();
    if (!currentUser || currentUser.role !== 'resepsionis') {
        alert("Akses ditolak. Anda harus login sebagai resepsionis.");
        window.location.href = '/login.html';
        return;
    }

    const guestsTbody = document.getElementById('guests-tbody');
    const noGuestsMessage = document.getElementById('no-guests-message');
    const loadingState = document.getElementById('loading-state');
    
    const searchGuestQueryInput = document.getElementById('search-guest-query');
    const filterGuestStatusSelect = document.getElementById('filter-guest-status');
    const filterGuestVisitsInput = document.getElementById('filter-guest-visits');
    const applyGuestFilterBtn = document.getElementById('apply-guest-filter-btn');
    const resetGuestFilterBtn = document.getElementById('reset-guest-filter-btn');
    const addNewGuestBtn = document.getElementById('add-new-guest-btn');

    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    // Global variable to store all guests from database
    let allGuests = [];

    // Load guests from database
    async function loadGuests() {
        try {
            showLoading();
            console.log('🔄 Loading guests from database...');
            
            const response = await fetch('/api/tamu', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Guests loaded:', result);
            
            allGuests = result.data || [];
            displayGuests(allGuests);
            hideLoading();
            
        } catch (error) {
            console.error('❌ Error loading guests:', error);
            hideLoading();
            showError('Gagal memuat data tamu: ' + error.message);
        }
    }

    function showLoading() {
        if (loadingState) {
            loadingState.classList.remove('hidden');
        }
        if (guestsTbody) {
            guestsTbody.innerHTML = '<tr><td colspan="7" class="text-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-color)] mx-auto"></div></td></tr>';
        }
    }

    function hideLoading() {
        if (loadingState) {
            loadingState.classList.add('hidden');
        }
    }

    function showError(message) {
        if (guestsTbody) {
            guestsTbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-red-500">${message}</td></tr>`;
        }
    }

    function getGuestStatusBadge(guest) {
        // Check if guest has active reservations
        const hasActiveReservation = guest.total_reservasi_aktif > 0;
        return hasActiveReservation 
            ? `<span class="status-badge-guest status-menginap">Menginap</span>`
            : `<span class="status-badge-guest status-riwayat">Riwayat</span>`;
    }

    function displayGuests(guestsToDisplay) {
        guestsTbody.innerHTML = ''; 
        if (guestsToDisplay.length === 0) {
            if (noGuestsMessage) noGuestsMessage.style.display = 'block';
            guestsTbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-[var(--text-muted-color)]">Tidak ada tamu ditemukan.</td></tr>`;
            return;
        }
        if (noGuestsMessage) noGuestsMessage.style.display = 'none';

        guestsToDisplay.forEach(guest => {
            const row = `
                <tr class="border-b border-[var(--input-border-color)]">
                    <td class="px-4 py-3 font-medium text-[var(--primary-color)] whitespace-nowrap">TAMU-${String(guest.id_tamu).padStart(3, '0')}</td>
                    <td class="px-4 py-3">${guest.nama}</td>
                    <td class="px-4 py-3">${guest.email || '-'}</td>
                    <td class="px-4 py-3">${guest.no_hp || '-'}</td>
                    <td class="px-4 py-3 text-center">${getGuestStatusBadge(guest)}</td>
                    <td class="px-4 py-3 text-center">${guest.total_reservasi || 0}x</td>
                    <td class="px-4 py-3 text-center whitespace-nowrap">
                        <button data-id="${guest.id_tamu}" class="btn-view-guest-details text-[var(--primary-color)] hover:underline p-1 text-xs" title="Lihat Detail">Detail</button> |
                        <button data-id="${guest.id_tamu}" class="btn-edit-guest text-blue-400 hover:underline p-1 text-xs" title="Edit Tamu">Edit</button> |
                        <button data-id="${guest.id_tamu}" class="btn-view-guest-reservations text-green-400 hover:underline p-1 text-xs" title="Lihat Reservasi">Reservasi</button>
                    </td>
                </tr>
            `;
            guestsTbody.insertAdjacentHTML('beforeend', row);
        });
    }

    function applyGuestFilters() {
        const query = searchGuestQueryInput.value.toLowerCase().trim();
        const status = filterGuestStatusSelect.value;
        const minVisits = parseInt(filterGuestVisitsInput.value) || 0;

        let filtered = allGuests.filter(guest => {
            const nameMatch = guest.nama ? guest.nama.toLowerCase().includes(query) : false;
            const emailMatch = guest.email ? guest.email.toLowerCase().includes(query) : false;
            const idMatch = `tamu-${String(guest.id_tamu).padStart(3, '0')}`.toLowerCase().includes(query);
            
            let statusMatch = true;
            if (status === "Menginap") {
                statusMatch = (guest.total_reservasi_aktif || 0) > 0;
            } else if (status === "Riwayat") {
                statusMatch = (guest.total_reservasi_aktif || 0) === 0;
            }
            
            const visitsMatch = (guest.total_reservasi || 0) >= minVisits;

            return (nameMatch || emailMatch || idMatch) && statusMatch && visitsMatch;
        });
        displayGuests(filtered);
    }
    
    if (applyGuestFilterBtn) applyGuestFilterBtn.addEventListener('click', applyGuestFilters);
    if (searchGuestQueryInput) searchGuestQueryInput.addEventListener('keyup', (event) => { if(event.key === 'Enter') applyGuestFilters()});


    if (resetGuestFilterBtn) {
        resetGuestFilterBtn.addEventListener('click', () => {
            searchGuestQueryInput.value = '';
            filterGuestStatusSelect.value = '';
            filterGuestVisitsInput.value = '';
            displayGuests(allGuests); 
        });
    }
    
    if (addNewGuestBtn) {
        addNewGuestBtn.addEventListener('click', () => {
            alert("Simulasi: Buka form untuk menambah data tamu baru.");
            // window.location.href = "/resepsionis/tambah-tamu.html"; // Contoh
        });
    }

    // Event delegation untuk tombol aksi di tabel
    guestsTbody.addEventListener('click', async (event) => {
        const target = event.target;
        const guestId = target.dataset.id;

        if (!guestId) return;
        
        try {
            if (target.classList.contains('btn-view-guest-details')) {
                await showGuestDetails(guestId);
            } else if (target.classList.contains('btn-edit-guest')) {
                await showEditGuestModal(guestId);
            } else if (target.classList.contains('btn-view-guest-reservations')) {
                await showGuestReservations(guestId);
            }
        } catch (error) {
            console.error('❌ Error handling guest action:', error);
            alert('Terjadi kesalahan: ' + error.message);
        }
    });

    // Show guest details
    async function showGuestDetails(guestId) {
        try {
            const response = await fetch(`/api/tamu/${guestId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Gagal memuat detail tamu');
            }

            const result = await response.json();
            const guest = result.data;
            
            alert(`Detail Tamu:\nNama: ${guest.nama}\nEmail: ${guest.email || 'N/A'}\nTelepon: ${guest.no_hp || 'N/A'}\nAlamat: ${guest.alamat || 'N/A'}\nTotal Reservasi: ${guest.total_reservasi || 0}`);
        } catch (error) {
            console.error('❌ Error fetching guest details:', error);
            alert('Gagal memuat detail tamu: ' + error.message);
        }
    }

    // Show edit guest modal
    async function showEditGuestModal(guestId) {
        // For now, just show alert
        alert(`Fitur edit tamu akan segera tersedia untuk ID: ${guestId}`);
    }

    // Show guest reservations
    async function showGuestReservations(guestId) {
        try {
            const response = await fetch(`/api/reservasi/tamu/${guestId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Gagal memuat reservasi tamu');
            }

            const result = await response.json();
            const reservations = result.data || [];
            
            if (reservations.length === 0) {
                alert('Tamu ini belum memiliki reservasi.');
            } else {
                let message = `Reservasi untuk tamu ini (${reservations.length} reservasi):\n\n`;
                reservations.slice(0, 5).forEach(res => {
                    message += `• ID: ${res.id_reservasi} - ${res.status_reservasi}\n`;
                    message += `  Check-in: ${new Date(res.tanggal_checkin).toLocaleDateString('id-ID')}\n`;
                    message += `  Kamar: ${res.tipe_kamar || 'N/A'}\n\n`;
                });
                if (reservations.length > 5) {
                    message += `... dan ${reservations.length - 5} reservasi lainnya`;
                }
                alert(message);
            }
        } catch (error) {
            console.error('❌ Error fetching guest reservations:', error);
            alert('Gagal memuat reservasi tamu: ' + error.message);
        }
    }

    // Toggle mobile menu
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Initialize: load guests from database
    await loadGuests();
    
    // Cek apakah ada parameter filter dari URL
    const urlParams = new URLSearchParams(window.location.search);
    const guestIdFromUrl = urlParams.get('tamu_id'); // Contoh jika datang dari halaman lain
    if (guestIdFromUrl) {
        searchGuestQueryInput.value = `tamu-${String(guestIdFromUrl).padStart(3, '0')}`;
        applyGuestFilters();
    }
});