/**
 * Hotel Room Management System - Admin Panel
 * Handles CRUD operations for hotel rooms with features:
 * - Display rooms with ID, No. Kamar, Tipe, Harga, Kapasitas, Status, and Actions
 * - Detail view modal for comprehensive room information
 * - Edit and delete functionality with confirmation
 * - Search and filter capabilities (by ID, room number, or type)
 * - Real-time status updates with occupancy information
 */

let allKamar = [];
let currentKamarId = null;

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
    
    // Load data and setup events
    await loadKamar();
    setupEventListeners();
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
    // Update avatars
    const avatarElements = ['userAvatar', 'mobileUserAvatar'];
    avatarElements.forEach(elementId => {
        const avatar = document.getElementById(elementId);
        if (avatar) {
            avatar.textContent = (user.nama || 'Admin').charAt(0).toUpperCase();
        }
    });
}

function setupEventListeners() {
    // Modal controls
    const btnTambahKamar = document.getElementById('btnTambahKamar');
    const closeModal = document.getElementById('closeModal');
    const cancelModal = document.getElementById('cancelModal');
    const kamarForm = document.getElementById('kamarForm');
    
    if (btnTambahKamar) btnTambahKamar.addEventListener('click', openAddKamarModal);
    if (closeModal) closeModal.addEventListener('click', closeKamarModal);
    if (cancelModal) cancelModal.addEventListener('click', closeKamarModal);
    if (kamarForm) kamarForm.addEventListener('submit', handleSubmitKamar);
    
    // Filter controls
    const btnFilter = document.getElementById('btnFilter');
    const btnResetFilter = document.getElementById('btnResetFilter');
    const filterTipe = document.getElementById('filterTipe');
    const filterStatus = document.getElementById('filterStatus');
    const searchKamar = document.getElementById('searchKamar');
    
    if (btnFilter) btnFilter.addEventListener('click', filterKamar);
    if (btnResetFilter) btnResetFilter.addEventListener('click', resetFilter);
    if (filterTipe) filterTipe.addEventListener('change', filterKamar);
    if (filterStatus) filterStatus.addEventListener('change', filterKamar);
    if (searchKamar) searchKamar.addEventListener('input', filterKamar);
    
    // Close modal when clicking outside
    const kamarModal = document.getElementById('kamarModal');
    if (kamarModal) {
        kamarModal.addEventListener('click', (e) => {
            if (e.target === kamarModal) {
                closeKamarModal();
            }
        });
    }
}

async function loadKamar() {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch('/api/kamar', {
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
            throw new Error('Failed to fetch kamar data');
        }        const result = await response.json();
        allKamar = result.data || [];
        
        // Debug: Check for duplicates
        console.log('Total kamar loaded:', allKamar.length);
        const uniqueRooms = new Set();
        const duplicates = [];
        
        allKamar.forEach(kamar => {
            const roomKey = `${kamar.no_kamar}-${kamar.id_kamar}`;
            if (uniqueRooms.has(kamar.no_kamar)) {
                duplicates.push(kamar);
            } else {
                uniqueRooms.add(kamar.no_kamar);
            }
        });
        
        if (duplicates.length > 0) {
            console.warn('Duplikasi kamar ditemukan:', duplicates);
        }
        
        displayKamar(allKamar);
        
        // Update total count
        const totalCount = document.getElementById('totalKamarCount');
        if (totalCount) {
            totalCount.textContent = allKamar.length;
        }

    } catch (error) {
        console.error('Error loading kamar:', error);
        showError('Gagal memuat data kamar');
    }
}

function displayKamar(kamarList) {
    const tbody = document.getElementById('kamarTableBody');
    
    if (!tbody) {
        console.error('Table body element not found');
        return;
    }
    
    // Clear existing content
    tbody.innerHTML = '';
    
    if (!kamarList || kamarList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8 text-[var(--text-muted-color)]">Tidak ada data kamar</td>
            </tr>
        `;
        return;
    }

    // Debug: Log kamar yang akan ditampilkan
    console.log('Displaying kamar:', kamarList.length, 'rooms');

    // Ensure unique kamar by ID to prevent duplicates
    const uniqueKamar = Array.from(
        new Map(kamarList.map(k => [k.id_kamar, k])).values()
    );

    if (uniqueKamar.length !== kamarList.length) {
        console.warn('Duplicate kamar removed:', kamarList.length - uniqueKamar.length);
    }    tbody.innerHTML = uniqueKamar.map(kamar => `
        <tr class="border-b border-[var(--input-border-color)] hover:bg-[var(--table-row-hover-bg)]">
            <td class="py-3 px-4 text-[var(--text-muted-color)] text-sm">${kamar.id_kamar}</td>
            <td class="py-3 px-4 font-medium text-[var(--text-color)]">${kamar.no_kamar}</td>
            <td class="py-3 px-4 text-[var(--text-color)]">${kamar.tipe}</td>
            <td class="py-3 px-4 text-[var(--text-color)]">${kamar.kapasitas_maks} orang</td>
            <td class="py-3 px-4 text-[var(--text-color)]">${formatCurrency(kamar.harga)}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-1 rounded-full text-xs ${getStatusClass(kamar.status)}">
                    ${kamar.status}
                </span>
            </td>
            <td class="py-3 px-4">
                <div class="flex gap-2 flex-wrap">
                    <button onclick="viewKamarDetail(${kamar.id_kamar})" class="bg-blue-500 text-white text-xs px-3 py-1 rounded hover:bg-blue-600 transition-colors">
                        Detail
                    </button>
                    <button onclick="editKamar(${kamar.id_kamar})" class="btn-primary text-xs px-3 py-1 rounded hover:bg-opacity-80 transition-colors">
                        Edit
                    </button>
                    <button onclick="deleteKamar(${kamar.id_kamar})" class="bg-red-500 text-white text-xs px-3 py-1 rounded hover:bg-red-600 transition-colors">
                        Hapus
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterKamar() {
    const tipeFilter = document.getElementById('filterTipe').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const searchQuery = document.getElementById('searchKamar').value.toLowerCase();

    let filteredKamar = allKamar.filter(kamar => {
        const matchTipe = !tipeFilter || kamar.tipe === tipeFilter;
        const matchStatus = !statusFilter || kamar.status === statusFilter;
        const matchSearch = !searchQuery || 
            kamar.no_kamar.toLowerCase().includes(searchQuery) ||
            kamar.id_kamar.toString().includes(searchQuery) ||
            kamar.tipe.toLowerCase().includes(searchQuery);
        
        return matchTipe && matchStatus && matchSearch;
    });

    displayKamar(filteredKamar);
}

function resetFilter() {
    document.getElementById('filterTipe').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('searchKamar').value = '';
    displayKamar(allKamar);
}

function openAddKamarModal() {
    const modalTitle = document.getElementById('modalTitle');
    const kamarForm = document.getElementById('kamarForm');
    const kamarId = document.getElementById('kamarId');
    const kamarModal = document.getElementById('kamarModal');
    
    if (modalTitle) modalTitle.textContent = 'Tambah Kamar';
    if (kamarForm) kamarForm.reset();
    if (kamarId) kamarId.value = '';
    if (kamarModal) {
        kamarModal.classList.remove('hidden');
        kamarModal.classList.add('flex');
    }
}

function editKamar(id) {
    const kamar = allKamar.find(k => k.id_kamar === id);
    if (!kamar) return;

    const modalTitle = document.getElementById('modalTitle');
    const kamarId = document.getElementById('kamarId');
    const noKamar = document.getElementById('noKamar');
    const tipeKamar = document.getElementById('tipeKamar');
    const hargaKamar = document.getElementById('hargaKamar');
    const kapasitasKamar = document.getElementById('kapasitasKamar');
    const statusKamar = document.getElementById('statusKamar');
    const deskripsiKamar = document.getElementById('deskripsiKamar');
    const kamarModal = document.getElementById('kamarModal');

    if (modalTitle) modalTitle.textContent = 'Edit Kamar';
    if (kamarId) kamarId.value = kamar.id_kamar;
    if (noKamar) noKamar.value = kamar.no_kamar;
    if (tipeKamar) tipeKamar.value = kamar.tipe;
    if (hargaKamar) hargaKamar.value = kamar.harga;
    if (kapasitasKamar) kapasitasKamar.value = kamar.kapasitas_maks;
    if (statusKamar) statusKamar.value = kamar.status;
    if (deskripsiKamar) deskripsiKamar.value = kamar.deskripsi_kamar;
    
    if (kamarModal) {
        kamarModal.classList.remove('hidden');
        kamarModal.classList.add('flex');
    }
}

function closeKamarModal() {
    const kamarModal = document.getElementById('kamarModal');
    if (kamarModal) {
        kamarModal.classList.add('hidden');
        kamarModal.classList.remove('flex');
    }
}

async function handleSubmitKamar(e) {
    e.preventDefault();
    
    const formData = {
        no_kamar: document.getElementById('noKamar').value,
        tipe: document.getElementById('tipeKamar').value,
        harga: parseFloat(document.getElementById('hargaKamar').value),
        kapasitas_maks: document.getElementById('kapasitasKamar').value,
        status: document.getElementById('statusKamar').value,
        deskripsi_kamar: document.getElementById('deskripsiKamar').value
    };

    const kamarId = document.getElementById('kamarId').value;
    const isEdit = kamarId !== '';

    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        const url = isEdit ? `/api/kamar/${kamarId}` : '/api/kamar';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleAuthError();
                return;
            }
            const error = await response.json();
            throw new Error(error.error || 'Gagal menyimpan data kamar');
        }

        showSuccess(isEdit ? 'Kamar berhasil diupdate' : 'Kamar berhasil ditambahkan');
        closeKamarModal();
        await loadKamar();

    } catch (error) {
        console.error('Error saving kamar:', error);
        showError(error.message);
    }
}

function deleteKamar(id) {
    if (confirm('Apakah Anda yakin ingin menghapus kamar ini?')) {
        confirmDelete(id);
    }
}

async function confirmDelete(id) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        const response = await fetch(`/api/kamar/${id}`, {
            method: 'DELETE',
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
            const error = await response.json();
            throw new Error(error.error || 'Gagal menghapus kamar');
        }

        showSuccess('Kamar berhasil dihapus');
        await loadKamar();

    } catch (error) {
        console.error('Error deleting kamar:', error);
        showError(error.message);
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function getStatusClass(status) {
    const statusClasses = {
        'Tersedia': 'bg-green-500/20 text-green-400',
        'Maintenance': 'bg-yellow-500/20 text-yellow-400',
        'Tidak Tersedia': 'bg-red-500/20 text-red-400'
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
    alert('Error: ' + message);
}

function showSuccess(message) {
    console.log(message);
    alert('Success: ' + message);
}

// Function to view kamar detail
function viewKamarDetail(id) {
    const kamar = allKamar.find(k => k.id_kamar === id);
    if (!kamar) return;

    let detailInfo = `
        <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-[var(--text-color)] mb-2">ID Kamar</label>
                    <p class="text-sm text-[var(--text-muted-color)]">${kamar.id_kamar}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-[var(--text-color)] mb-2">No. Kamar</label>
                    <p class="text-sm text-[var(--text-color)] font-medium">${kamar.no_kamar}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-[var(--text-color)] mb-2">Tipe Kamar</label>
                    <p class="text-sm text-[var(--text-color)]">${kamar.tipe}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-[var(--text-color)] mb-2">Harga per Malam</label>
                    <p class="text-sm text-[var(--text-color)] font-medium">${formatCurrency(kamar.harga)}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-[var(--text-color)] mb-2">Kapasitas Maksimal</label>
                    <p class="text-sm text-[var(--text-color)]">${kamar.kapasitas_maks} orang</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-[var(--text-color)] mb-2">Status</label>
                    <p class="mt-1">
                        <span class="px-2 py-1 rounded-full text-xs ${getStatusClass(kamar.status)}">
                            ${kamar.status}
                        </span>
                    </p>
                </div>
            </div>
            ${kamar.deskripsi_kamar ? `
                <div>
                    <label class="block text-sm font-medium text-[var(--text-color)] mb-2">Deskripsi</label>
                    <p class="text-sm text-[var(--text-muted-color)] bg-[var(--input-bg-color)] p-3 rounded border border-[var(--input-border-color)]">${kamar.deskripsi_kamar}</p>
                </div>
            ` : ''}
            ${kamar.tamu_info ? `
                <div>
                    <label class="block text-sm font-medium text-[var(--text-color)] mb-2">Informasi Tamu</label>
                    <p class="text-sm text-blue-400 bg-blue-500/10 p-3 rounded border border-blue-500/20">${kamar.tamu_info}</p>
                </div>
            ` : ''}
            ${kamar.reservasi_info ? `
                <div>
                    <label class="block text-sm font-medium text-[var(--text-color)] mb-2">Informasi Reservasi</label>
                    <p class="text-sm text-orange-400 bg-orange-500/10 p-3 rounded border border-orange-500/20">${kamar.reservasi_info}</p>
                </div>
            ` : ''}
        </div>
    `;

    // Create and show detail modal using consistent styling
    const detailModal = document.createElement('div');
    detailModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    detailModal.innerHTML = `
        <div class="dashboard-card max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-[var(--primary-color)]">Detail Kamar ${kamar.no_kamar}</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-[var(--text-muted-color)] hover:text-[var(--primary-color)]">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>            </div>
            ${detailInfo}
        </div>
    `;
    
    document.body.appendChild(detailModal);
    
    // Close modal when clicking outside
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) {
            detailModal.remove();
        }
    });
}

function editKamar(id) {
    const kamar = allKamar.find(k => k.id_kamar === id);
    if (!kamar) return;

    const modalTitle = document.getElementById('modalTitle');
    const kamarId = document.getElementById('kamarId');
    const noKamar = document.getElementById('noKamar');
    const tipeKamar = document.getElementById('tipeKamar');
    const hargaKamar = document.getElementById('hargaKamar');
    const kapasitasKamar = document.getElementById('kapasitasKamar');
    const statusKamar = document.getElementById('statusKamar');
    const deskripsiKamar = document.getElementById('deskripsiKamar');
    const kamarModal = document.getElementById('kamarModal');

    if (modalTitle) modalTitle.textContent = 'Edit Kamar';
    if (kamarId) kamarId.value = kamar.id_kamar;
    if (noKamar) noKamar.value = kamar.no_kamar;
    if (tipeKamar) tipeKamar.value = kamar.tipe;
    if (hargaKamar) hargaKamar.value = kamar.harga;
    if (kapasitasKamar) kapasitasKamar.value = kamar.kapasitas_maks;
    if (statusKamar) statusKamar.value = kamar.status;
    if (deskripsiKamar) deskripsiKamar.value = kamar.deskripsi_kamar;
    
    if (kamarModal) {
        kamarModal.classList.remove('hidden');
        kamarModal.classList.add('flex');
    }
}
