let allReservasi = [];
let allTamu = [];
let allKamar = [];
let allResepsionis = [];
let currentReservasiId = null;
let isEditMode = false;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Page loaded, checking authentication...');
    
    if (!checkAuthentication()) {
        return;
    }
    
    // Debug date formatting in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        debugDateFormatting();
    }
    
    await loadInitialData();
    setupEventListeners();
});

function checkAuthentication() {
    const token = getAuthToken();
    if (!token) {
        console.log('No auth token found, redirecting to login');
        window.location.href = '/login.html';
        return false;
    }
    
    const user = getLoggedInUser();
    if (!user || user.role !== 'admin') {
        console.log('User is not admin, redirecting to login');
        window.location.href = '/login.html';
        return false;
    }
    
    return true;
}

async function loadInitialData() {
    try {
        showLoading(true);
        await Promise.all([
            loadReservasi(),
            loadTamu(),
            loadKamar(),
            loadResepsionis()
        ]);
        populateDropdowns();
    } catch (error) {
        console.error('Error loading initial data:', error);
        showError('Gagal memuat data awal: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function setupEventListeners() {
    // Filter events - improved event handling
    const filterElements = [
        { id: 'search-id-reservasi', event: 'input' },
        { id: 'search-nama-tamu', event: 'input' },
        { id: 'filter-status-reservasi', event: 'change' },
        { id: 'filter-status-pembayaran', event: 'change' },
        { id: 'filter-tipe-kamar', event: 'change' },
        { id: 'filter-tanggal-checkin', event: 'change' },
        { id: 'filter-tanggal-checkout', event: 'change' }
    ];
    
    filterElements.forEach(({ id, event }) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, debounce(filterReservasi, 300));
        }
    });

    // Button events
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadReservasi());
    }

    const addReservationBtn = document.getElementById('add-reservation-btn');
    if (addReservationBtn) {
        addReservationBtn.addEventListener('click', showAddForm);
    }

    const applyFilterBtn = document.getElementById('apply-filter-btn');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', filterReservasi);
    }

    const resetFilterBtn = document.getElementById('reset-filter-btn');
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', resetFilter);
    }

    // Modal events
    const closeDetailModal = document.getElementById('close-detail-modal');
    if (closeDetailModal) {
        closeDetailModal.addEventListener('click', () => hideModal('detail-modal'));
    }

    const cancelFormBtn = document.getElementById('cancel-form-btn');
    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', () => hideModal('form-modal'));
    }

    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => hideModal('delete-modal'));
    }

    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDelete);
    }

    // Form events
    const reservationForm = document.getElementById('reservation-form');
    if (reservationForm) {
        reservationForm.addEventListener('submit', handleFormSubmit);
    }

    // Form field events
    const formTipeKamar = document.getElementById('form-tipe-kamar');
    if (formTipeKamar) {
        formTipeKamar.addEventListener('change', updateAvailableRooms);
    }

    const formCheckin = document.getElementById('form-checkin');
    const formCheckout = document.getElementById('form-checkout');
    if (formCheckin && formCheckout) {
        formCheckin.addEventListener('change', updateAvailableRooms);
        formCheckout.addEventListener('change', updateAvailableRooms);
    }

    // Modal click outside to close
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Data Loading Functions
async function loadReservasi() {
    showLoading(true);
    hideEmptyState();
    
    try {
        const token = getAuthToken();
        const response = await fetch('/api/reservasi', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch reservasi data');
        }        const result = await response.json();
        allReservasi = result.data || [];
        
        console.log('Loaded reservasi:', allReservasi.length, 'items');
        
        // Debug: Log sample data to verify date fields
        if (allReservasi.length > 0) {
            console.log('Sample reservation data:', {
                id: allReservasi[0].id_reservasi,
                tanggal_reservasi: allReservasi[0].tanggal_reservasi,
                tanggal_checkin: allReservasi[0].tanggal_checkin,
                tanggal_checkout: allReservasi[0].tanggal_checkout,
                formatted_reservasi: formatDateTime(allReservasi[0].tanggal_reservasi),
                formatted_checkin: formatDate(allReservasi[0].tanggal_checkin),
                formatted_checkout: formatDate(allReservasi[0].tanggal_checkout)
            });
        }
        
        if (allReservasi.length === 0) {
            showEmptyState(true);
        } else {
            hideEmptyState();
            displayReservasi(allReservasi);
        }

    } catch (error) {
        console.error('Error loading reservasi:', error);
        showError('Gagal memuat data reservasi: ' + error.message);
        showEmptyState(true);
    } finally {
        showLoading(false);
    }
}

async function loadTamu() {
    try {
        const token = getAuthToken();
        const response = await fetch('/api/tamu/all', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });        if (response.ok) {
            const result = await response.json();
            allTamu = result.data || [];
            console.log('Loaded tamu:', allTamu.length, 'items');
        }
    } catch (error) {
        console.error('Error loading tamu:', error);
    }
}

async function loadKamar() {
    try {
        const token = getAuthToken();
        const response = await fetch('/api/kamar', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            allKamar = result.data || [];
        }
    } catch (error) {
        console.error('Error loading kamar:', error);
    }
}

async function loadResepsionis() {
    try {
        const token = getAuthToken();
        const response = await fetch('/api/resepsionis', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            allResepsionis = result.data || [];
        }
    } catch (error) {
        console.error('Error loading resepsionis:', error);
    }
}

function populateDropdowns() {
    console.log('Populating dropdowns...', { tamu: allTamu.length, resepsionis: allResepsionis.length });
    
    // Populate Tamu dropdown
    const formTamu = document.getElementById('form-tamu');
    if (formTamu) {
        formTamu.innerHTML = '<option value="">Pilih Tamu</option>';
        if (allTamu.length > 0) {
            allTamu.forEach(tamu => {
                const option = document.createElement('option');
                option.value = tamu.id_tamu;
                option.textContent = `${tamu.nama} (${tamu.email})`;
                formTamu.appendChild(option);
            });
        }
    }

    // Populate Resepsionis dropdown
    const formResepsionis = document.getElementById('form-resepsionis');
    if (formResepsionis) {
        formResepsionis.innerHTML = '<option value="">Pilih Resepsionis (Opsional)</option>';
        if (allResepsionis.length > 0) {
            allResepsionis.forEach(resepsionis => {
                const option = document.createElement('option');
                option.value = resepsionis.id_resepsionis;
                option.textContent = resepsionis.nama;
                formResepsionis.appendChild(option);
            });
        }
    }
}

function updateAvailableRooms() {
    const tipeKamar = document.getElementById('form-tipe-kamar').value;
    const checkin = document.getElementById('form-checkin').value;
    const checkout = document.getElementById('form-checkout').value;
    const formKamar = document.getElementById('form-kamar');
    
    if (!formKamar) return;

    formKamar.innerHTML = '<option value="">Pilih Kamar (Opsional - Auto)</option>';

    if (!tipeKamar) return;

    // Filter rooms by type
    const availableRooms = allKamar.filter(kamar => {
        if (kamar.tipe !== tipeKamar) return false;
        if (kamar.status !== 'Tersedia') return false;

        // If dates are selected, check availability
        if (checkin && checkout) {
            // Check if room is booked for selected dates
            const isBooked = allReservasi.some(reservasi => {
                if (reservasi.id_kamar !== kamar.id_kamar) return false;
                if (!['Dikonfirmasi', 'Check-In'].includes(reservasi.status_reservasi)) return false;
                  const reservasiCheckin = new Date(reservasi.tanggal_checkin);
                const reservasiCheckout = new Date(reservasi.tanggal_checkout);
                const selectedCheckin = new Date(checkin);
                const selectedCheckout = new Date(checkout);

                // Check for overlapping dates: reservations conflict if they overlap
                // Two date ranges overlap if: start1 < end2 AND start2 < end1
                return (reservasiCheckin < selectedCheckout && reservasiCheckout > selectedCheckin);
            });
            
            return !isBooked;
        }

        return true;
    });

    availableRooms.forEach(kamar => {
        const option = document.createElement('option');
        option.value = kamar.id_kamar;
        option.textContent = `${kamar.no_kamar} - ${formatCurrency(kamar.harga)}/malam`;
        formKamar.appendChild(option);
    });
}

// Display Functions
function displayReservasi(reservasi) {
    const tbody = document.getElementById('reservations-table-body');
    
    if (!tbody) {
        console.error('Table body element not found');
        return;
    }

    if (!reservasi || reservasi.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center py-8 text-gray-400">Tidak ada data reservasi</td></tr>';
        showEmptyState(true);
        return;
    } else {
        showEmptyState(false);
    }    tbody.innerHTML = reservasi.map(item => {
        const checkinDate = formatDate(item.tanggal_checkin);
        const checkoutDate = formatDate(item.tanggal_checkout);
        const bookingDate = formatDateTime(item.tanggal_reservasi);
        
        // Calculate total with PPN (10%)
        const totalWithPPN = calculateTotalCost(item);
        const totalFormatted = formatCurrency(totalWithPPN);// Status badges - consistent with room management style
        const statusReservasiClass = getReservasiStatusClass(item.status_reservasi);
        const statusPembayaranClass = getPembayaranStatusClass(item.status_pembayaran || 'Belum Lunas');        return `
            <tr class="hover:bg-gray-800 transition-colors">
                <td class="px-3 py-3 font-medium text-orange-400">${item.id_reservasi || '-'}</td>
                <td class="px-3 py-3">${item.nama_tamu || '-'}</td>
                <td class="px-3 py-3">${item.tipe_kamar || '-'}</td>
                <td class="px-3 py-3 text-center font-mono">${item.nomor_kamar || item.no_kamar || '-'}</td>
                <td class="px-3 py-3 text-gray-400">${bookingDate}</td>
                <td class="px-3 py-3">${checkinDate}</td>
                <td class="px-3 py-3">${checkoutDate}</td>
                <td class="px-3 py-3 text-center">${item.jumlah_tamu || '-'}</td><td class="px-3 py-3 text-center">
                    <span class="px-2 py-1 rounded-full text-xs ${statusReservasiClass}">
                        ${item.status_reservasi || '-'}
                    </span>
                </td>
                <td class="px-3 py-3 text-center">
                    <span class="px-2 py-1 rounded-full text-xs ${statusPembayaranClass}">
                        ${item.status_pembayaran || 'Belum Lunas'}
                    </span>
                </td>
                <td class="px-3 py-3 text-right font-semibold text-green-400">${totalFormatted}</td>                <td class="px-3 py-3 text-center">
                    <div class="flex justify-center gap-2">
                        <button onclick="showReservasiDetail('${item.id_reservasi}')" 
                                class="bg-blue-500 text-white text-xs px-3 py-1 rounded hover:bg-blue-600 transition-colors" title="Detail">
                            Detail
                        </button>                        <button onclick="showEditForm('${item.id_reservasi}')" 
                                class="btn-primary text-xs px-3 py-1 rounded hover:bg-opacity-80 transition-colors" 
                                title="Edit Reservasi ID: ${item.id_reservasi}">
                            Edit
                        </button>
                        <button onclick="showDeleteConfirmation('${item.id_reservasi}')" 
                                class="bg-red-500 text-white text-xs px-3 py-1 rounded hover:bg-red-600 transition-colors" title="Hapus">
                            Hapus
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Date Helper Functions
function formatDateForInput(dateString) {
    if (!dateString) return '';
    
    try {
        // Handle different date formats
        if (typeof dateString === 'string') {
            // If already in YYYY-MM-DD format, return as is
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                return dateString;
            }
            
            // If in YYYY-MM-DD HH:MM:SS format, extract date part
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateString)) {
                return dateString.split(' ')[0];
            }
            
            // Parse other formats using UTC to avoid timezone issues
            const date = new Date(dateString + 'T00:00:00.000Z');
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        }
        
        if (dateString instanceof Date) {
            return dateString.toISOString().split('T')[0];
        }
        
        return '';
    } catch (error) {
        console.error('Error formatting date for input:', dateString, error);
        return '';
    }
}

function normalizeDateForComparison(dateString) {
    if (!dateString) return '';
    
    try {
        // Handle different date formats consistently
        if (typeof dateString === 'string') {
            // If already in YYYY-MM-DD format, return as is
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                return dateString;
            }
            
            // If in YYYY-MM-DD HH:MM:SS format (MySQL DATETIME), extract date part
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateString)) {
                return dateString.split(' ')[0];
            }
            
            // If in YYYY-MM-DDTHH:MM:SS format (ISO), extract date part
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateString)) {
                return dateString.split('T')[0];
            }
        }
        
        // Handle Date objects
        if (dateString instanceof Date) {
            return dateString.toISOString().split('T')[0];
        }
        
        // Try to parse as a date and format to YYYY-MM-DD
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
        
        return '';
    } catch (error) {
        console.error('Error normalizing date:', dateString, error);
        return '';
    }
}

// Additional date utility functions
function formatDateForDisplay(dateString) {
    if (!dateString) return '-';
    
    try {
        // Extract date part if datetime string
        let dateOnly = dateString;
        if (typeof dateString === 'string' && dateString.includes(' ')) {
            dateOnly = dateString.split(' ')[0];
        }
        
        // Parse with explicit format to avoid timezone issues
        const parts = dateOnly.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // Month is 0-indexed
            const day = parseInt(parts[2]);
            
            const date = new Date(year, month, day);
            return date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric'
            });
        }
        
        return dateOnly;
    } catch (error) {
        console.error('Error formatting date for display:', dateString, error);
        return dateString;
    }
}

function isValidDateString(dateString) {
    if (!dateString || typeof dateString !== 'string') return false;
    
    // Check YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString.split(' ')[0])) return false;
    
    // Validate actual date
    const parts = dateString.split(' ')[0].split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
}

// Debug function to test date formatting
function debugDateFormatting() {
    const testDates = [
        '2024-01-15',
        '2024-01-15 00:00:00',
        '2024-12-25',
        '2024-12-25 12:30:00'
    ];
    
    console.log('=== Date formatting debug test ===');
    testDates.forEach(dateStr => {
        console.log(`Original: ${dateStr}`);
        console.log(`  formatDateForInput: ${formatDateForInput(dateStr)}`);
        console.log(`  normalizeDateForComparison: ${normalizeDateForComparison(dateStr)}`);
        console.log(`  formatDate: ${formatDate(dateStr)}`);
        console.log(`  formatDateForDisplay: ${formatDateForDisplay(dateStr)}`);
        console.log('---');
    });
}

// Status Helper Functions - Consistent with Room Management
function getReservasiStatusClass(status) {
    const statusClasses = {
        'Belum Bayar': 'bg-red-500/20 text-red-400',
        'Menunggu Konfirmasi': 'bg-yellow-500/20 text-yellow-400',
        'Dikonfirmasi': 'bg-cyan-500/20 text-cyan-400',
        'Check-In': 'bg-green-500/20 text-green-400',
        'Check-Out': 'bg-gray-500/20 text-gray-400',
        'Dibatalkan': 'bg-red-500/20 text-red-400'
    };
    return statusClasses[status] || 'bg-gray-500/20 text-gray-400';
}

function getPembayaranStatusClass(status) {
    const statusClasses = {
        'Belum Lunas': 'bg-red-500/20 text-red-400',
        'Lunas': 'bg-green-500/20 text-green-400',
        'Menunggu Verifikasi': 'bg-yellow-500/20 text-yellow-400'
    };
    return statusClasses[status] || 'bg-red-500/20 text-red-400';
}

function calculateTotalCost(reservasi) {
    if (!reservasi.tanggal_checkin || !reservasi.tanggal_checkout || !reservasi.harga) {
        return 0;
    }

    const checkin = new Date(reservasi.tanggal_checkin);
    const checkout = new Date(reservasi.tanggal_checkout);
    const diffTime = Math.abs(checkout - checkin);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const subtotal = diffDays * parseFloat(reservasi.harga);
    const ppn = subtotal * 0.10; // PPN 10%
    return subtotal + ppn;
}

function calculateSubtotal(reservasi) {
    if (!reservasi.tanggal_checkin || !reservasi.tanggal_checkout || !reservasi.harga) {
        return 0;
    }

    const checkin = new Date(reservasi.tanggal_checkin);
    const checkout = new Date(reservasi.tanggal_checkout);
    const diffTime = Math.abs(checkout - checkin);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays * parseFloat(reservasi.harga);
}

function calculatePPN(reservasi) {
    const subtotal = calculateSubtotal(reservasi);
    return subtotal * 0.10; // PPN 10%
}

// Filter Functions - Modified logic to show previous day reservations
function filterReservasi() {
    const searchId = document.getElementById('search-id-reservasi')?.value.toLowerCase().trim() || '';
    const searchNama = document.getElementById('search-nama-tamu')?.value.toLowerCase().trim() || '';
    const filterStatusReservasi = document.getElementById('filter-status-reservasi')?.value || '';
    const filterStatusPembayaran = document.getElementById('filter-status-pembayaran')?.value || '';
    const filterTipeKamar = document.getElementById('filter-tipe-kamar')?.value || '';
    const filterCheckin = document.getElementById('filter-tanggal-checkin')?.value || '';
    const filterCheckout = document.getElementById('filter-tanggal-checkout')?.value || '';

    console.log('Filter criteria:', { 
        searchId,
        searchNama,
        filterStatusReservasi,
        filterStatusPembayaran,
        filterTipeKamar,
        filterCheckin, 
        filterCheckout,
        totalReservations: allReservasi.length 
    });

    const filtered = allReservasi.filter(reservasi => {
        // ID filter - partial match
        const matchId = !searchId || (reservasi.id_reservasi && 
            reservasi.id_reservasi.toString().toLowerCase().includes(searchId));
        
        // Name filter - partial match
        const matchNama = !searchNama || (reservasi.nama_tamu && 
            reservasi.nama_tamu.toLowerCase().includes(searchNama));
        
        // Status filters - exact match
        const matchStatusReservasi = !filterStatusReservasi || 
            reservasi.status_reservasi === filterStatusReservasi;
        
        const matchStatusPembayaran = !filterStatusPembayaran || 
            (reservasi.status_pembayaran || 'Belum Lunas') === filterStatusPembayaran;
        
        // Room type filter - exact match
        const matchTipeKamar = !filterTipeKamar || (reservasi.tipe && 
            reservasi.tipe.toLowerCase() === filterTipeKamar.toLowerCase());
        
        // Date filters - modified logic to show previous day
        let matchDateFilter = true;
        
        if (filterCheckin || filterCheckout) {
            const reservasiCheckin = normalizeDateForComparison(reservasi.tanggal_checkin);
            const reservasiCheckout = normalizeDateForComparison(reservasi.tanggal_checkout);
            
            if (filterCheckin && filterCheckout) {
                // Both dates specified - find reservations one day before each filter date
                if (filterCheckin > filterCheckout) {
                    console.warn('Invalid date range: check-in date is after check-out date');
                    matchDateFilter = false;
                } else {
                    // Get previous day for both filter dates
                    const filterCheckinPrevDay = getPreviousDay(filterCheckin);
                    const filterCheckoutPrevDay = getPreviousDay(filterCheckout);
                    
                    // Show reservations that overlap with the previous day range
                    matchDateFilter = reservasiCheckin <= filterCheckoutPrevDay && reservasiCheckout >= filterCheckinPrevDay;
                }
            } else if (filterCheckin) {
                // Only check-in date specified - find reservations that check in one day before
                const filterCheckinPrevDay = getPreviousDay(filterCheckin);
                matchDateFilter = reservasiCheckin === filterCheckinPrevDay;
            } else if (filterCheckout) {
                // Only check-out date specified - find reservations that check out one day before
                const filterCheckoutPrevDay = getPreviousDay(filterCheckout);
                matchDateFilter = reservasiCheckout === filterCheckoutPrevDay;
            }
        }

        const matches = matchId && matchNama && matchStatusReservasi && 
                       matchStatusPembayaran && matchTipeKamar && matchDateFilter;

        // Enhanced debug logging for date filtering
        if ((filterCheckin || filterCheckout) && reservasi.id_reservasi <= 5) {
            console.log(`Date filter check for reservation ${reservasi.id_reservasi}:`, {
                reservation: {
                    checkin_original: reservasi.tanggal_checkin,
                    checkout_original: reservasi.tanggal_checkout,
                    checkin_normalized: normalizeDateForComparison(reservasi.tanggal_checkin),
                    checkout_normalized: normalizeDateForComparison(reservasi.tanggal_checkout)
                },
                filters: { 
                    checkin: filterCheckin, 
                    checkout: filterCheckout,
                    checkin_prev_day: filterCheckin ? getPreviousDay(filterCheckin) : null,
                    checkout_prev_day: filterCheckout ? getPreviousDay(filterCheckout) : null
                },
                result: {
                    dateMatch: matchDateFilter,
                    overallMatch: matches
                }
            });
        }

        return matches;
    });

    console.log(`Filtered results: ${filtered.length} out of ${allReservasi.length} reservations`);
    
    if (filtered.length === 0 && allReservasi.length > 0) {
        // Show empty state for no filter results
        displayReservasi([]);
        showEmptyState(true);
    } else {
        displayReservasi(filtered);
        showEmptyState(false);
    }
}

// Helper function to get previous day in YYYY-MM-DD format
function getPreviousDay(dateString) {
    if (!dateString) return '';
    
    try {
        // Parse the date string (YYYY-MM-DD format)
        const parts = dateString.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Month is 0-indexed
        const day = parseInt(parts[2]);
        
        // Create date object
        const date = new Date(year, month, day);
        
        // Subtract one day
        date.setDate(date.getDate() - 1);
        
        // Format back to YYYY-MM-DD
        const prevYear = date.getFullYear();
        const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
        const prevDay = String(date.getDate()).padStart(2, '0');
        
        return `${prevYear}-${prevMonth}-${prevDay}`;
    } catch (error) {
        console.error('Error getting previous day:', dateString, error);
        return dateString;
    }
}

function resetFilter() {
    // Clear all filter inputs
    const filterElements = [
        'search-id-reservasi',
        'search-nama-tamu', 
        'filter-status-reservasi',
        'filter-status-pembayaran',
        'filter-tipe-kamar',
        'filter-tanggal-checkin',
        'filter-tanggal-checkout'
    ];
    
    filterElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });
    
    // Display all reservations
    displayReservasi(allReservasi);
    showEmptyState(allReservasi.length === 0);
    
    console.log('Filters reset, showing all reservations:', allReservasi.length);
}

// Modal Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function showReservasiDetail(reservasiId) {
    const reservasi = allReservasi.find(r => r.id_reservasi == reservasiId);
    if (!reservasi) {
        showError('Data reservasi tidak ditemukan');
        return;
    }

    // Populate detail modal
    document.getElementById('detail-id-reservasi').textContent = reservasi.id_reservasi || '-';
    document.getElementById('detail-nama-tamu').textContent = reservasi.nama_tamu || '-';
    document.getElementById('detail-email-tamu').textContent = reservasi.email_tamu || '-';
    document.getElementById('detail-hp-tamu').textContent = reservasi.no_hp_tamu || '-';
    document.getElementById('detail-no-kamar').textContent = reservasi.nomor_kamar || reservasi.no_kamar || '-';
    document.getElementById('detail-tipe-kamar').textContent = reservasi.tipe || '-';
    document.getElementById('detail-harga-kamar').textContent = formatCurrency(reservasi.harga || 0);
    document.getElementById('detail-tanggal-reservasi').textContent = formatDateTime(reservasi.tanggal_reservasi);
    document.getElementById('detail-checkin').textContent = formatDate(reservasi.tanggal_checkin);
    document.getElementById('detail-checkout').textContent = formatDate(reservasi.tanggal_checkout);
    document.getElementById('detail-jumlah-tamu').textContent = reservasi.jumlah_tamu || '-';
    
    // Status badges
    const statusReservasiElement = document.getElementById('detail-status-reservasi');
    const statusPembayaranElement = document.getElementById('detail-status-pembayaran');
    const totalBiayaElement = document.getElementById('detail-total-biaya');
      if (statusReservasiElement) {
        const statusClass = getReservasiStatusClass(reservasi.status_reservasi);
        statusReservasiElement.innerHTML = `<span class="px-2 py-1 rounded-full text-xs ${statusClass}">${reservasi.status_reservasi || '-'}</span>`;
    }
    
    if (statusPembayaranElement) {
        const statusClass = getPembayaranStatusClass(reservasi.status_pembayaran || 'Belum Lunas');
        statusPembayaranElement.innerHTML = `<span class="px-2 py-1 rounded-full text-xs ${statusClass}">${reservasi.status_pembayaran || 'Belum Lunas'}</span>`;
    }if (totalBiayaElement) {
        const subtotal = calculateSubtotal(reservasi);
        const ppn = calculatePPN(reservasi);
        const total = calculateTotalCost(reservasi);
        totalBiayaElement.innerHTML = `
            <div class="text-sm text-[var(--text-muted-color)]">
                <div>Subtotal: ${formatCurrency(subtotal)}</div>
                <div>PPN (10%): ${formatCurrency(ppn)}</div>
                <div class="font-semibold text-[var(--text-color)]">Total: ${formatCurrency(total)}</div>
            </div>
        `;
    }
    
    document.getElementById('detail-resepsionis').textContent = reservasi.nama_resepsionis || '-';

    showModal('detail-modal');
}

function showAddForm() {
    isEditMode = false;
    currentReservasiId = null;
    
    document.getElementById('form-modal-title').textContent = 'Tambah Reservasi';
    document.getElementById('form-submit-btn').textContent = 'Simpan';
    document.getElementById('edit-only-fields').style.display = 'none';
    
    // Reset form
    document.getElementById('reservation-form').reset();
    
    // Set minimum date to today using local date to avoid timezone issues
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const checkinInput = document.getElementById('form-checkin');
    const checkoutInput = document.getElementById('form-checkout');
    
    if (checkinInput) {
        checkinInput.min = todayStr;
    }
    if (checkoutInput) {
        checkoutInput.min = todayStr;
    }
    
    updateAvailableRooms();
    showModal('form-modal');
}

function showEditForm(reservasiId) {
    const reservasi = allReservasi.find(r => r.id_reservasi == reservasiId);
    if (!reservasi) {
        showError('Data reservasi tidak ditemukan');
        return;
    }

    console.log('Opening edit form for reservation:', reservasi);

    isEditMode = true;
    currentReservasiId = reservasiId;
    
    // Update modal title and button
    document.getElementById('form-modal-title').textContent = 'Edit Reservasi';
    document.getElementById('form-submit-btn').textContent = 'Update';
    document.getElementById('edit-only-fields').style.display = 'block';
    
    // Show modal first
    showModal('form-modal');
    
    // Ensure dropdowns are populated before setting values
    if (allTamu.length === 0 || allResepsionis.length === 0) {
        console.log('Dropdowns not ready, reloading data...');
        Promise.all([
            loadTamu(),
            loadResepsionis(),
            loadKamar()
        ]).then(() => {
            populateDropdowns();
            setTimeout(() => fillEditForm(reservasi), 100);
        });
    } else {
        populateDropdowns();
        fillEditForm(reservasi);
    }
}

function fillEditForm(reservasi) {
    console.log('Filling edit form with data:', reservasi);
    
    // Clear form first, but don't reset to avoid clearing dropdown options
    const form = document.getElementById('reservation-form');
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (input.type !== 'submit' && input.type !== 'button') {
            input.value = '';
        }
    });
    
    // Populate form with existing data
    document.getElementById('form-id-reservasi').value = reservasi.id_reservasi || '';
    
    // Set tamu with validation
    const tamuField = document.getElementById('form-tamu');
    if (tamuField && reservasi.id_tamu) {
        tamuField.value = reservasi.id_tamu;
        console.log('Set tamu field to:', reservasi.id_tamu, 'Available options:', tamuField.options.length);
    }
      // Set tipe kamar (use 'tipe_kamar' field from database)
    const tipeKamarField = document.getElementById('form-tipe-kamar');
    if (tipeKamarField && reservasi.tipe_kamar) {
        tipeKamarField.value = reservasi.tipe_kamar;
        console.log('Set tipe kamar field to:', reservasi.tipe_kamar);
        // Trigger change event to update available rooms
        tipeKamarField.dispatchEvent(new Event('change'));
    }
    
    // Format dates properly for input[type="date"]
    const formattedCheckin = formatDateForInput(reservasi.tanggal_checkin);
    const formattedCheckout = formatDateForInput(reservasi.tanggal_checkout);
    
    console.log('Edit form date formatting:', {
        original: {
            checkin: reservasi.tanggal_checkin,
            checkout: reservasi.tanggal_checkout
        },
        formatted: {
            checkin: formattedCheckin,
            checkout: formattedCheckout
        }
    });
    
    document.getElementById('form-checkin').value = formattedCheckin;
    document.getElementById('form-checkout').value = formattedCheckout;
    document.getElementById('form-jumlah-tamu').value = reservasi.jumlah_tamu || 1;
    document.getElementById('form-status-reservasi').value = reservasi.status_reservasi || '';
    
    // Set resepsionis with validation
    const resepsionisField = document.getElementById('form-resepsionis');
    if (resepsionisField && reservasi.id_resepsionis) {
        resepsionisField.value = reservasi.id_resepsionis;
        console.log('Set resepsionis field to:', reservasi.id_resepsionis, 'Available options:', resepsionisField.options.length);
    }
      // Wait for room dropdown to be updated, then set kamar value
    setTimeout(() => {
        updateAvailableRooms();
        
        // Set kamar value after rooms are updated
        setTimeout(() => {
            const kamarField = document.getElementById('form-kamar');
            if (kamarField && reservasi.id_kamar) {
                kamarField.value = reservasi.id_kamar;
                console.log('Set kamar field to:', reservasi.id_kamar, 'Available options:', kamarField.options.length);
                
                // Verify if the option exists
                const optionExists = Array.from(kamarField.options).some(option => option.value == reservasi.id_kamar);
                if (!optionExists) {
                    console.warn('Kamar option not found in dropdown, room may have been reassigned:', reservasi.id_kamar);
                    // Clear the field if option doesn't exist - this allows for auto-assignment
                    kamarField.value = '';
                }
            }
        }, 500); // Increased timeout to ensure dropdown update completes
    }, 200);
    
    console.log('Edit form filled with all data');
}

function showDeleteConfirmation(reservasiId) {
    currentReservasiId = reservasiId;
    document.getElementById('delete-reservation-id').textContent = reservasiId;
    showModal('delete-modal');
}

// CRUD Functions
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    console.log('Form submission data:', data);
    console.log('Is edit mode:', isEditMode);
    
    // Validation
    if (!data.id_tamu || !data.tipe_kamar || !data.tanggal_checkin || !data.tanggal_checkout) {
        console.error('Validation failed:', {
            id_tamu: data.id_tamu,
            tipe_kamar: data.tipe_kamar,
            tanggal_checkin: data.tanggal_checkin,
            tanggal_checkout: data.tanggal_checkout
        });
        showError('Mohon lengkapi data yang diperlukan');
        return;
    }

    // Date validation
    const checkin = new Date(data.tanggal_checkin);
    const checkout = new Date(data.tanggal_checkout);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkin < today && !isEditMode) {
        showError('Tanggal check-in tidak boleh di masa lalu');
        return;
    }

    if (checkout <= checkin) {
        showError('Tanggal check-out harus setelah tanggal check-in');
        return;
    }    try {
        const token = getAuthToken();
        let url, method;
        
        if (isEditMode) {
            url = `/api/reservasi/${currentReservasiId}`;
            method = 'PUT';
            console.log('Edit mode - using PUT to:', url);
        } else {
            method = 'POST';
            // Use auto-assignment if no specific room selected
            if (!data.id_kamar) {
                url = '/api/reservasi'; // This uses auto-assignment
                console.log('Create mode - using auto-assignment POST to:', url);
            } else {
                url = '/api/reservasi/manual'; // This uses manual room selection
                console.log('Create mode - using manual room selection POST to:', url);
            }
        }        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        console.log('Server response:', result);

        if (!response.ok) {
            throw new Error(result.error || 'Gagal menyimpan data');
        }

        showSuccess(isEditMode ? 'Data reservasi berhasil diupdate' : 'Reservasi berhasil dibuat');
        hideModal('form-modal');
        await loadReservasi();
        
    } catch (error) {
        console.error('Error saving reservation:', error);
        showError(error.message);
    }
}

async function confirmDelete() {
    if (!currentReservasiId) return;

    try {
        const token = getAuthToken();
        const response = await fetch(`/api/reservasi/${currentReservasiId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Gagal menghapus reservasi');
        }

        showSuccess('Reservasi berhasil dihapus');
        hideModal('delete-modal');
        await loadReservasi();
        
    } catch (error) {
        console.error('Error deleting reservation:', error);
        showError(error.message);
    }
}

// Utility Functions
function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return 'Rp 0';
    }
    
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        minimumFractionDigits: 0 
    }).format(numAmount);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        // Handle both datetime and date formats from MySQL
        let dateObj;
        
        if (typeof dateString === 'string') {
            // If it's a datetime string (YYYY-MM-DD HH:MM:SS), parse it directly
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateString)) {
                dateObj = new Date(dateString);
            }
            // If it's a date string (YYYY-MM-DD), parse it carefully to avoid timezone issues
            else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                const parts = dateString.split('-');
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1; // Month is 0-indexed
                const day = parseInt(parts[2]);
                dateObj = new Date(year, month, day);
            }
            // Try parsing other formats
            else {
                dateObj = new Date(dateString);
            }
        } else if (dateString instanceof Date) {
            dateObj = dateString;
        } else {
            return '-';
        }
        
        // Validate the date
        if (isNaN(dateObj.getTime())) {
            console.error('Invalid date:', dateString);
            return '-';
        }
        
        // Format the date
        return dateObj.toLocaleDateString('id-ID', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
        
    } catch (error) {
        console.error('Error formatting date:', dateString, error);
        return '-';
    }
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    
    try {
        // Handle datetime formats from MySQL
        let dateObj;
        
        if (typeof dateString === 'string') {
            // If it's a datetime string (YYYY-MM-DD HH:MM:SS), parse it directly
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateString)) {
                dateObj = new Date(dateString);
            }
            // Try parsing other formats
            else {
                dateObj = new Date(dateString);
            }
        } else if (dateString instanceof Date) {
            dateObj = dateString;
        } else {
            return '-';
        }
        
        // Validate the date
        if (isNaN(dateObj.getTime())) {
            console.error('Invalid datetime:', dateString);
            return '-';
        }
        
        // Format the datetime
        return dateObj.toLocaleDateString('id-ID', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
    } catch (error) {
        console.error('Error formatting datetime:', dateString, error);
        return '-';
    }
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    alert('Success: ' + message);
}

function showLoading(show = true) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
}

function showEmptyState(show = true) {
    const emptyState = document.getElementById('empty-state');
    const tableContainer = document.getElementById('reservations-table-container');
    
    if (emptyState) {
        emptyState.style.display = show ? 'block' : 'none';
    }
    if (tableContainer) {
        tableContainer.style.display = show ? 'none' : 'block';
    }
}

function hideEmptyState() {
    showEmptyState(false);
}

// Add debounce utility function for better performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
