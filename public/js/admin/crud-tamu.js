document.addEventListener('DOMContentLoaded', () => {
    // === AUTHENTICATION CHECK ===
    // Pastikan fungsi-fungsi ini (isUserLoggedIn, getLoggedInUser, logoutUser) tersedia secara global
    if (typeof isUserLoggedIn !== 'function' || !isUserLoggedIn()) {
        alert("Akses ditolak. Anda harus login sebagai admin.");
        const targetUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?role=admin&redirect=${targetUrl}`;
        return;
    }

    const currentUser = getLoggedInUser();
    if (!currentUser || currentUser.role !== 'admin') {
        alert("Akses ditolak. Anda tidak memiliki hak akses admin.");
        logoutUser();
        return;
    }

    // === DOM ELEMENTS ===
    const guestsTbody = document.getElementById('guests-tbody');
    const noGuestsMessage = document.getElementById('no-guests-message');
    const tableContainer = document.querySelector('.table-container'); // Cached element

    // Filter elements
    const searchGuestNameInput = document.getElementById('search-guest-name');
    const searchGuestEmailInput = document.getElementById('search-guest-email');
    const searchGuestPhoneInput = document.getElementById('search-guest-phone');
    const applyFilterBtn = document.getElementById('apply-guest-filter-btn');
    const resetFilterBtn = document.getElementById('reset-guest-filter-btn');

    // Mobile menu
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    // Modal elements
    const guestModal = document.getElementById('guestModal');
    const guestModalTitle = document.getElementById('guestModalTitle');
    const closeGuestModalBtn = document.getElementById('closeGuestModalBtn');
    const cancelGuestModalBtn = document.getElementById('cancelGuestModalBtn');
    const guestForm = document.getElementById('guestForm');
    const saveGuestBtn = document.getElementById('saveGuestBtn');

    const modalGuestIdInput = document.getElementById('modalGuestId');
    const modalGuestFullNameInput = document.getElementById('modalGuestFullName');
    const modalGuestEmailInput = document.getElementById('modalGuestEmail');
    const modalGuestPhoneNumberInput = document.getElementById('modalGuestPhoneNumber');
    const modalGuestNewPasswordInput = document.getElementById('modalGuestNewPassword');
    const modalGuestAddressTextarea = document.getElementById('modalGuestAddress');
    const passwordResetSection = document.getElementById('passwordResetSection');

    const guestDetailInfoSection = document.getElementById('guestDetailInfoSection');
    const detailGuestId = document.getElementById('detail-guest-id');
    const detailGuestTotalReservations = document.getElementById('detail-guest-total-reservations');

    // === GLOBAL STATE ===
    let allGuests = [];
    let allReservations = [];
    let currentGuestId = null;
    let isEditMode = false;

    // === INITIALIZATION ===
    init();

    async function init() {
        await loadGuests();
        await loadAllReservations();
        setupEventListeners();
    }

    // === DATA FETCHING ===
    async function fetchFromAPI(url, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Respons error tidak valid.' }));
            const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }

        return response.json();
    }    async function loadGuests() {
        showLoading();
        try {
            // Try different endpoints to get all guests
            let result;
            try {
                // First try the admin endpoint
                result = await fetchFromAPI('/api/tamu/admin/all');
            } catch (error) {
                try {
                    // Try alternative admin endpoint
                    result = await fetchFromAPI('/api/admin/tamu');
                } catch (secondError) {
                    try {
                        // Try with empty search to get all guests
                        result = await fetchFromAPI('/api/tamu/search?nama=&email=&no_hp=');
                    } catch (thirdError) {
                        // Final fallback - get guests with minimal search
                        result = await fetchFromAPI('/api/tamu/search?nama=');
                    }
                }
            }
            
            allGuests = result.data || result || [];
            applyFilters(); // Apply filters right after loading
        } catch (error) {
            console.error('Error loading guests:', error);
            showError(`Gagal memuat data tamu: ${error.message}`);
        }
    }

    async function loadAllReservations() {
        try {
            const result = await fetchFromAPI('/api/reservasi');
            allReservations = result.data || result || [];
            console.log('Loaded reservations:', allReservations.length);
            
            // Update the table with reservation counts after loading reservations
            if (allGuests.length > 0) {
                applyFilters();
            }
        } catch (error) {
            console.warn('Could not load reservations for counting:', error.message);
            allReservations = [];
            
            // Still show the guests table even if reservations fail to load
            if (allGuests.length > 0) {
                applyFilters();
            }
        }
    }

    function getGuestReservationCount(guestId) {
        if (!allReservations || allReservations.length === 0) {
            return '-'; // Show dash when reservations data is not available
        }
        
        // Count reservations where the id_tamu matches
        const count = allReservations.filter(reservation => {
            return reservation.id_tamu == guestId;
        }).length;
        
        return count;
    }

    async function loadGuestReservationCount(guestId) {
        detailGuestTotalReservations.textContent = '...'; // Loading indicator
        try {
            const count = getGuestReservationCount(guestId);
            detailGuestTotalReservations.textContent = count.toString();
        } catch (error) {
            detailGuestTotalReservations.textContent = '0';
        }
    }

    // === EVENT LISTENERS ===
    function setupEventListeners() {
        // Mobile menu toggle
        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }

        // Filter events (real-time filtering)
        [searchGuestNameInput, searchGuestEmailInput, searchGuestPhoneInput].forEach(input => {
            input.addEventListener('input', applyFilters);
        });

        applyFilterBtn.addEventListener('click', applyFilters);
        resetFilterBtn.addEventListener('click', resetFilters);

        // Modal events
        closeGuestModalBtn.addEventListener('click', closeModal);
        cancelGuestModalBtn.addEventListener('click', closeModal);
        guestForm.addEventListener('submit', handleSaveGuest);

        guestModal.addEventListener('click', (e) => {
            if (e.target === guestModal) closeModal();
        });

        // Event Delegation for table actions (Detail/Edit/Delete)
        guestsTbody.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const id = button.dataset.id;

            if (action === 'detail') {
                viewGuestDetail(id);
            } else if (action === 'edit') {
                editGuest(id);
            } else if (action === 'delete') {
                deleteGuest(id);
            }
        });
    }

    // === FILTERING LOGIC ===
    function applyFilters() {
        const guestName = searchGuestNameInput.value.toLowerCase().trim();
        const guestEmail = searchGuestEmailInput.value.toLowerCase().trim();
        const guestPhone = searchGuestPhoneInput.value.trim(); // No toLowerCase for phone number

        const filteredGuests = allGuests.filter(guest => {
            const nameMatch = !guestName || guest.nama.toLowerCase().includes(guestName);
            const emailMatch = !guestEmail || (guest.email && guest.email.toLowerCase().includes(guestEmail));
            const phoneMatch = !guestPhone || (guest.no_hp && guest.no_hp.includes(guestPhone));
            return nameMatch && emailMatch && phoneMatch;
        });

        renderGuestsTable(filteredGuests);
    }

    function resetFilters() {
        searchGuestNameInput.value = '';
        searchGuestEmailInput.value = '';
        searchGuestPhoneInput.value = '';
        renderGuestsTable(allGuests);
    }

    // === DOM RENDERING ===
    function renderGuestsTable(guests) {
        if (guests.length === 0) {
            guestsTbody.innerHTML = '';
            noGuestsMessage.style.display = 'block';
            tableContainer.style.display = 'none';
        } else {
            noGuestsMessage.style.display = 'none';
            tableContainer.style.display = 'block';
            guestsTbody.innerHTML = guests.map(guest => {
                const reservationCount = getGuestReservationCount(guest.id_tamu);
                const truncatedAddress = guest.alamat && guest.alamat.length > 30 
                    ? guest.alamat.substring(0, 30) + '...' 
                    : (guest.alamat || '-');
                
                return `
                <tr class="border-b border-[var(--secondary-color)] hover:bg-[var(--table-row-hover-bg)] transition-colors">
                    <td class="px-3 py-4 font-medium text-[var(--primary-color)]">${guest.id_tamu}</td>
                    <td class="px-3 py-4">${guest.nama || '-'}</td>
                    <td class="px-3 py-4">${guest.email || '-'}</td>
                    <td class="px-3 py-4">${guest.no_hp || '-'}</td>
                    <td class="px-3 py-4" title="${guest.alamat || '-'}">${truncatedAddress}</td>
                    <td class="px-3 py-4 text-center">
                        ${typeof reservationCount === 'number' ? 
                            `<span class="inline-flex items-center justify-center min-w-[2rem] h-6 bg-[var(--primary-color)] text-white text-xs font-semibold rounded-full">
                                ${reservationCount}
                            </span>` :
                            `<span class="text-[var(--text-muted-color)] text-xs">-</span>`
                        }
                    </td>
                    <td class="px-3 py-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                            <button data-action="detail" data-id="${guest.id_tamu}" class="text-blue-400 hover:text-blue-300 text-sm font-medium" title="Detail">
                                Detail
                            </button>
                            <button data-action="edit" data-id="${guest.id_tamu}" class="text-[var(--primary-color)] hover:text-[var(--primary-color)]/80 text-sm font-medium" title="Edit">
                                Edit
                            </button>
                            <button data-action="delete" data-id="${guest.id_tamu}" class="text-red-400 hover:text-red-300 text-sm font-medium" title="Hapus">
                                Hapus
                            </button>
                        </div>
                    </td>
                </tr>
                `;
            }).join('');
        }
    }

    // === MODAL & FORM HANDLING ===
    function populateGuestForm(guest) {
        modalGuestIdInput.value = guest.id_tamu;
        modalGuestFullNameInput.value = guest.nama;
        modalGuestEmailInput.value = guest.email || '';
        modalGuestPhoneNumberInput.value = guest.no_hp || '';
        modalGuestAddressTextarea.value = guest.alamat || '';
        
        detailGuestId.textContent = guest.id_tamu;
    }

    async function viewGuestDetail(guestId) {
        try {
            // Try different endpoints for getting single guest
            let result;
            try {
                result = await fetchFromAPI(`/api/tamu/${guestId}`);
            } catch (error) {
                try {
                    result = await fetchFromAPI(`/api/tamu/admin/${guestId}`);
                } catch (secondError) {
                    result = await fetchFromAPI(`/api/admin/tamu/${guestId}`);
                }
            }
            
            const guest = result.data;

            isEditMode = false;
            currentGuestId = guestId;
            guestModalTitle.textContent = 'Detail Tamu';
            saveGuestBtn.style.display = 'none';
            
            populateGuestForm(guest);
            await loadGuestReservationCount(guestId);

            // Make all form inputs readonly for detail view
            const formInputs = guestForm.querySelectorAll('input, select, textarea');
            formInputs.forEach(input => input.setAttribute('readonly', true));

            // Hide password section in detail view
            passwordResetSection.style.display = 'none';
            guestDetailInfoSection.style.display = 'block';
            guestModal.classList.remove('hidden');
        } catch (error) {
            console.error('Error loading guest details:', error);
            alert(`Gagal memuat detail tamu: ${error.message}`);
        }
    }

    async function editGuest(guestId) {
        try {
            // Try different endpoints for getting single guest
            let result;
            try {
                result = await fetchFromAPI(`/api/tamu/${guestId}`);
            } catch (error) {
                try {
                    result = await fetchFromAPI(`/api/tamu/admin/${guestId}`);
                } catch (secondError) {
                    result = await fetchFromAPI(`/api/admin/tamu/${guestId}`);
                }
            }
            
            const guest = result.data;

            isEditMode = true;
            currentGuestId = guestId;
            guestModalTitle.textContent = 'Edit Data Tamu & Reset Password';
            saveGuestBtn.textContent = 'Perbarui';
            saveGuestBtn.style.display = 'block';
            
            populateGuestForm(guest);
            await loadGuestReservationCount(guestId);

            // Remove readonly attributes for edit mode
            const formInputs = guestForm.querySelectorAll('input, select, textarea');
            formInputs.forEach(input => input.removeAttribute('readonly'));

            // Show password reset section in edit mode
            passwordResetSection.style.display = 'block';
            modalGuestNewPasswordInput.value = ''; // Clear password field

            guestDetailInfoSection.style.display = 'block';
            guestModal.classList.remove('hidden');
            modalGuestFullNameInput.focus();
        } catch (error) {
            console.error('Error loading guest details:', error);
            alert(`Gagal memuat detail tamu: ${error.message}`);
        }
    }

    async function handleSaveGuest(e) {
        e.preventDefault();

        const guestData = {
            nama: modalGuestFullNameInput.value.trim(),
            email: modalGuestEmailInput.value.trim(),
            no_hp: modalGuestPhoneNumberInput.value.trim(),
            alamat: modalGuestAddressTextarea.value.trim()
        };

        // Add password if provided in edit mode
        if (isEditMode && modalGuestNewPasswordInput.value.trim()) {
            if (modalGuestNewPasswordInput.value.trim().length < 6) {
                alert('Password baru harus minimal 6 karakter!');
                return;
            }
            guestData.password = modalGuestNewPasswordInput.value.trim();
        }

        if (!guestData.nama || !guestData.email) {
            alert('Nama dan email harus diisi!');
            return;
        }

        if (!isValidEmail(guestData.email)) {
            alert('Format email tidak valid!');
            return;
        }

        try {
            // Try different endpoints for updating guest
            let result;
            const endpoints = [
                `/api/tamu/${currentGuestId}`,
                `/api/tamu/admin/${currentGuestId}`,
                `/api/admin/tamu/${currentGuestId}`
            ];

            let lastError;
            for (const url of endpoints) {
                try {
                    result = await fetchFromAPI(url, {
                        method: 'PUT',
                        body: JSON.stringify(guestData)
                    });
                    break; // Success, exit loop
                } catch (error) {
                    lastError = error;
                    continue; // Try next endpoint
                }
            }

            if (!result) {
                throw lastError || new Error('All endpoints failed');
            }

            const successMessage = modalGuestNewPasswordInput.value.trim() 
                ? 'Data tamu dan password berhasil diperbarui!' 
                : 'Data tamu berhasil diperbarui!';
            
            alert(result.message || successMessage);
            closeModal();
            await loadGuests();
        } catch (error) {
            console.error('Error saving guest:', error);
            alert(`Gagal menyimpan data tamu: ${error.message}`);
        }
    }

    async function deleteGuest(guestId) {
        const guest = allGuests.find(g => g.id_tamu == guestId);
        if (!guest) return;

        if (!confirm(`Apakah Anda yakin ingin menghapus tamu "${guest.nama}"?\n\nPeringatan: Tindakan ini tidak dapat dibatalkan!`)) {
            return;
        }

        try {
            // Try different endpoints for deleting guest
            let result;
            const endpoints = [
                `/api/tamu/${guestId}`,
                `/api/tamu/admin/${guestId}`,
                `/api/admin/tamu/${guestId}`
            ];

            let lastError;
            for (const url of endpoints) {
                try {
                    result = await fetchFromAPI(url, { method: 'DELETE' });
                    break; // Success, exit loop
                } catch (error) {
                    lastError = error;
                    continue; // Try next endpoint
                }
            }

            if (!result) {
                throw lastError || new Error('All endpoints failed');
            }

            alert(result.message || 'Tamu berhasil dihapus!');
            await loadGuests();
        } catch (error) {
            console.error('Error deleting guest:', error);
            alert(`Gagal menghapus tamu: ${error.message}`);
        }
    }

    function closeModal() {
        guestModal.classList.add('hidden');
        guestForm.reset();
        currentGuestId = null;
        isEditMode = false;
        passwordResetSection.style.display = 'none';
        guestDetailInfoSection.style.display = 'none';
    }

    // === UTILITY FUNCTIONS ===
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function showLoading() {
        tableContainer.style.display = 'block';
        noGuestsMessage.style.display = 'none';
        guestsTbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-[var(--text-muted-color)]">Memuat data tamu...</td></tr>`;
    }

    function showError(message) {
        tableContainer.style.display = 'block';
        noGuestsMessage.style.display = 'none';
        guestsTbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-red-400">${message}</td></tr>`;
    }
});