document.addEventListener('DOMContentLoaded', () => {
    // === AUTHENTICATION CHECK ===
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
    const receptionistsTbody = document.getElementById('receptionists-tbody');
    const noReceptionistsMessage = document.getElementById('no-receptionists-message');
    const tableContainer = document.querySelector('.table-container');
    
    // Filter elements
    const searchReceptionistNameInput = document.getElementById('search-receptionist-name');
    const searchReceptionistEmailInput = document.getElementById('search-receptionist-email');
    const searchReceptionistUsernameInput = document.getElementById('search-receptionist-username');
    const applyFilterBtn = document.getElementById('apply-receptionist-filter-btn');
    const resetFilterBtn = document.getElementById('reset-receptionist-filter-btn');

    // Mobile menu
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    // Modal elements
    const receptionistModal = document.getElementById('receptionistModal');
    const receptionistModalTitle = document.getElementById('receptionistModalTitle');
    const closeReceptionistModalBtn = document.getElementById('closeReceptionistModalBtn');
    const cancelReceptionistModalBtn = document.getElementById('cancelReceptionistModalBtn');
    const receptionistForm = document.getElementById('receptionistForm');
    const saveReceptionistBtn = document.getElementById('saveReceptionistBtn');
    
    const modalReceptionistIdInput = document.getElementById('modalReceptionistId');
    const modalReceptionistFullNameInput = document.getElementById('modalReceptionistFullName');
    const modalReceptionistEmailInput = document.getElementById('modalReceptionistEmail');
    const modalReceptionistUsernameInput = document.getElementById('modalReceptionistUsername');
    const modalReceptionistPasswordInput = document.getElementById('modalReceptionistPassword');
    const modalReceptionistPhoneNumberInput = document.getElementById('modalReceptionistPhoneNumber');
    const passwordSection = document.getElementById('passwordSection');
    
    const receptionistDetailInfoSection = document.getElementById('receptionistDetailInfoSection');
    const detailReceptionistId = document.getElementById('detail-receptionist-id');

    // === GLOBAL STATE ===
    let allReceptionists = [];
    let currentReceptionistId = null;
    let isEditMode = false;

    // === INITIALIZATION ===
    init();

    async function init() {
        await loadReceptionists();
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
    }

    async function loadReceptionists() {
        showLoading();
        try {
            // Try different endpoints to get all receptionists
            let result;
            try {
                result = await fetchFromAPI('/api/resepsionis');
            } catch (error) {
                try {
                    result = await fetchFromAPI('/api/resepsionis/admin/all');
                } catch (secondError) {
                    try {
                        result = await fetchFromAPI('/api/admin/resepsionis');
                    } catch (thirdError) {
                        // Try with search parameters if needed
                        result = await fetchFromAPI('/api/resepsionis/search?nama=&email=&username=');
                    }
                }
            }
            
            allReceptionists = result.data || [];
            applyFilters(); // Apply filters right after loading
        } catch (error) {
            console.error('Error loading receptionists:', error);
            showError(`Gagal memuat data resepsionis: ${error.message}`);
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
        [searchReceptionistNameInput, searchReceptionistEmailInput, searchReceptionistUsernameInput].forEach(input => {
            input.addEventListener('input', applyFilters);
        });

        applyFilterBtn.addEventListener('click', applyFilters);
        resetFilterBtn.addEventListener('click', resetFilters);

        // Modal events
        closeReceptionistModalBtn.addEventListener('click', closeModal);
        cancelReceptionistModalBtn.addEventListener('click', closeModal);
        receptionistForm.addEventListener('submit', handleSaveReceptionist);

        receptionistModal.addEventListener('click', (e) => {
            if (e.target === receptionistModal) closeModal();
        });

        // Event Delegation for table actions (Detail/Edit/Delete)
        receptionistsTbody.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const id = button.dataset.id;

            if (action === 'detail') {
                viewReceptionistDetail(id);
            } else if (action === 'edit') {
                editReceptionist(id);
            } else if (action === 'delete') {
                deleteReceptionist(id);
            }
        });
    }

    // === FILTERING LOGIC ===
    function applyFilters() {
        const receptionistName = searchReceptionistNameInput.value.toLowerCase().trim();
        const receptionistEmail = searchReceptionistEmailInput.value.toLowerCase().trim();
        const receptionistUsername = searchReceptionistUsernameInput.value.toLowerCase().trim();

        const filteredReceptionists = allReceptionists.filter(receptionist => {
            const nameMatch = !receptionistName || receptionist.nama.toLowerCase().includes(receptionistName);
            const emailMatch = !receptionistEmail || (receptionist.email && receptionist.email.toLowerCase().includes(receptionistEmail));
            const usernameMatch = !receptionistUsername || receptionist.username.toLowerCase().includes(receptionistUsername);
            return nameMatch && emailMatch && usernameMatch;
        });

        renderReceptionistsTable(filteredReceptionists);
    }

    function resetFilters() {
        searchReceptionistNameInput.value = '';
        searchReceptionistEmailInput.value = '';
        searchReceptionistUsernameInput.value = '';
        renderReceptionistsTable(allReceptionists);
    }

    // === DOM RENDERING ===
    function renderReceptionistsTable(receptionists) {
        if (receptionists.length === 0) {
            receptionistsTbody.innerHTML = '';
            noReceptionistsMessage.style.display = 'block';
            tableContainer.style.display = 'none';
        } else {
            noReceptionistsMessage.style.display = 'none';
            tableContainer.style.display = 'block';
            receptionistsTbody.innerHTML = receptionists.map(receptionist => {
                return `
                <tr class="border-b border-[var(--secondary-color)] hover:bg-[var(--table-row-hover-bg)] transition-colors">
                    <td class="px-3 py-4 font-medium text-[var(--primary-color)]">${receptionist.id_resepsionis}</td>
                    <td class="px-3 py-4">${receptionist.nama || '-'}</td>
                    <td class="px-3 py-4">${receptionist.email || '-'}</td>
                    <td class="px-3 py-4">${receptionist.username || '-'}</td>
                    <td class="px-3 py-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                            <button data-action="detail" data-id="${receptionist.id_resepsionis}" class="text-blue-400 hover:text-blue-300 text-sm font-medium" title="Detail">
                                Detail
                            </button>
                            <button data-action="edit" data-id="${receptionist.id_resepsionis}" class="text-[var(--primary-color)] hover:text-[var(--primary-color)]/80 text-sm font-medium" title="Edit">
                                Edit
                            </button>
                            <button data-action="delete" data-id="${receptionist.id_resepsionis}" class="text-red-400 hover:text-red-300 text-sm font-medium" title="Hapus">
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
    function populateReceptionistForm(receptionist) {
        modalReceptionistIdInput.value = receptionist.id_resepsionis;
        modalReceptionistFullNameInput.value = receptionist.nama;
        modalReceptionistEmailInput.value = receptionist.email || '';
        modalReceptionistUsernameInput.value = receptionist.username;
        modalReceptionistPhoneNumberInput.value = receptionist.no_hp || '';
        
        detailReceptionistId.textContent = receptionist.id_resepsionis;
    }

    async function viewReceptionistDetail(receptionistId) {
        try {
            // Try different endpoints for getting single receptionist
            let result;
            try {
                result = await fetchFromAPI(`/api/resepsionis/${receptionistId}`);
            } catch (error) {
                try {
                    result = await fetchFromAPI(`/api/resepsionis/admin/${receptionistId}`);
                } catch (secondError) {
                    result = await fetchFromAPI(`/api/admin/resepsionis/${receptionistId}`);
                }
            }
            
            const receptionist = result.data;

            isEditMode = false;
            currentReceptionistId = receptionistId;
            receptionistModalTitle.textContent = 'Detail Resepsionis';
            saveReceptionistBtn.style.display = 'none';
            
            populateReceptionistForm(receptionist);

            // Make all form inputs readonly for detail view
            const formInputs = receptionistForm.querySelectorAll('input, select, textarea');
            formInputs.forEach(input => input.setAttribute('readonly', true));

            // Hide password section in detail view
            passwordSection.style.display = 'none';
            receptionistDetailInfoSection.style.display = 'block';
            receptionistModal.classList.remove('hidden');
        } catch (error) {
            console.error('Error loading receptionist details:', error);
            alert(`Gagal memuat detail resepsionis: ${error.message}`);
        }
    }

    async function editReceptionist(receptionistId) {
        try {
            // Try different endpoints for getting single receptionist
            let result;
            try {
                result = await fetchFromAPI(`/api/resepsionis/${receptionistId}`);
            } catch (error) {
                try {
                    result = await fetchFromAPI(`/api/resepsionis/admin/${receptionistId}`);
                } catch (secondError) {
                    result = await fetchFromAPI(`/api/admin/resepsionis/${receptionistId}`);
                }
            }
            
            const receptionist = result.data;

            isEditMode = true;
            currentReceptionistId = receptionistId;
            receptionistModalTitle.textContent = 'Edit Data Resepsionis & Reset Password';
            saveReceptionistBtn.textContent = 'Perbarui';
            saveReceptionistBtn.style.display = 'block';
            
            populateReceptionistForm(receptionist);

            // Remove readonly attributes for edit mode
            const formInputs = receptionistForm.querySelectorAll('input, select, textarea');
            formInputs.forEach(input => input.removeAttribute('readonly'));

            // Show password reset section in edit mode
            passwordSection.style.display = 'block';
            modalReceptionistPasswordInput.value = ''; // Clear password field

            receptionistDetailInfoSection.style.display = 'block';
            receptionistModal.classList.remove('hidden');
            modalReceptionistFullNameInput.focus();
        } catch (error) {
            console.error('Error loading receptionist details:', error);
            alert(`Gagal memuat detail resepsionis: ${error.message}`);
        }
    }

    async function handleSaveReceptionist(e) {
        e.preventDefault();

        const receptionistData = {
            nama: modalReceptionistFullNameInput.value.trim(),
            email: modalReceptionistEmailInput.value.trim(),
            username: modalReceptionistUsernameInput.value.trim(),
            no_hp: modalReceptionistPhoneNumberInput.value.trim()
        };

        // Add password if provided in edit mode
        if (isEditMode && modalReceptionistPasswordInput.value.trim()) {
            if (modalReceptionistPasswordInput.value.trim().length < 6) {
                alert('Password baru harus minimal 6 karakter!');
                return;
            }
            receptionistData.password = modalReceptionistPasswordInput.value.trim();
        }

        if (!receptionistData.nama || !receptionistData.email || !receptionistData.username) {
            alert('Nama, email, dan username harus diisi!');
            return;
        }

        if (!isValidEmail(receptionistData.email)) {
            alert('Format email tidak valid!');
            return;
        }

        try {
            // Try different endpoints for updating receptionist
            let result;
            const endpoints = [
                `/api/resepsionis/${currentReceptionistId}`,
                `/api/resepsionis/admin/${currentReceptionistId}`,
                `/api/admin/resepsionis/${currentReceptionistId}`
            ];

            let lastError;
            for (const url of endpoints) {
                try {
                    result = await fetchFromAPI(url, {
                        method: 'PUT',
                        body: JSON.stringify(receptionistData)
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

            const successMessage = modalReceptionistPasswordInput.value.trim() 
                ? 'Data resepsionis dan password berhasil diperbarui!' 
                : 'Data resepsionis berhasil diperbarui!';
            
            alert(result.message || successMessage);
            closeModal();
            await loadReceptionists();
        } catch (error) {
            console.error('Error saving receptionist:', error);
            alert(`Gagal menyimpan data resepsionis: ${error.message}`);
        }
    }

    async function deleteReceptionist(receptionistId) {
        const receptionist = allReceptionists.find(r => r.id_resepsionis == receptionistId);
        if (!receptionist) return;

        if (!confirm(`Apakah Anda yakin ingin menghapus resepsionis "${receptionist.nama}"?\n\nPeringatan: Tindakan ini tidak dapat dibatalkan!`)) {
            return;
        }

        try {
            // Try different endpoints for deleting receptionist
            let result;
            const endpoints = [
                `/api/resepsionis/${receptionistId}`,
                `/api/resepsionis/admin/${receptionistId}`,
                `/api/admin/resepsionis/${receptionistId}`
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

            alert(result.message || 'Resepsionis berhasil dihapus!');
            await loadReceptionists();
        } catch (error) {
            console.error('Error deleting receptionist:', error);
            alert(`Gagal menghapus resepsionis: ${error.message}`);
        }
    }

    function closeModal() {
        receptionistModal.classList.add('hidden');
        receptionistForm.reset();
        currentReceptionistId = null;
        isEditMode = false;
        passwordSection.style.display = 'none';
        receptionistDetailInfoSection.style.display = 'none';
    }

    // === UTILITY FUNCTIONS ===
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function showLoading() {
        tableContainer.style.display = 'block';
        noReceptionistsMessage.style.display = 'none';
        receptionistsTbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-[var(--text-muted-color)]">Memuat data resepsionis...</td></tr>`;
    }

    function showError(message) {
        tableContainer.style.display = 'block';
        noReceptionistsMessage.style.display = 'none';
        receptionistsTbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-red-400">${message}</td></tr>`;
    }
});