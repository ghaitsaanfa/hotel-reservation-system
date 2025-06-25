// Global variables
let paymentsData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 10;

// Debug mode
const DEBUG_MODE = true;
function debugLog(message, data = null) {
    if (DEBUG_MODE) {
        console.log(`[KELOLA-PEMBAYARAN] ${message}`, data || '');
    }
}

debugLog('🚀 Script loaded - kelola-pembayaran.js');

// DOM elements
let loadingState, errorState, errorMessage, paymentsTable, paymentsTBody, emptyState;
let searchQuery, filterStatus, filterMethod, applyFilterBtn, resetFilterBtn;
let detailModal, statusModal, detailContent, statusForm, statusPaymentId, newStatus;
let prevPageBtn, nextPageBtn, pageNumbers, showingStart, showingEnd, totalItems;

// Initialize DOM elements
function initializeDOMElements() {
    console.log('🔧 Initializing DOM elements...');
    
    // State elements
    loadingState = document.getElementById('loading-state');
    errorState = document.getElementById('error-state');
    errorMessage = document.getElementById('error-message');
    paymentsTable = document.getElementById('payments-table');
    paymentsTBody = document.getElementById('payments-tbody');
    emptyState = document.getElementById('empty-state');

    // Filter elements
    searchQuery = document.getElementById('search-query');
    filterStatus = document.getElementById('filter-status');
    filterMethod = document.getElementById('filter-method');
    applyFilterBtn = document.getElementById('apply-filter-btn');
    resetFilterBtn = document.getElementById('reset-filter-btn');

    // Modal elements
    detailModal = document.getElementById('detail-modal');
    statusModal = document.getElementById('status-modal');
    detailContent = document.getElementById('detail-content');
    statusForm = document.getElementById('status-form');
    statusPaymentId = document.getElementById('status-payment-id');
    newStatus = document.getElementById('new-status');

    // Pagination elements
    prevPageBtn = document.getElementById('prev-page');
    nextPageBtn = document.getElementById('next-page');
    pageNumbers = document.getElementById('page-numbers');
    showingStart = document.getElementById('showing-start');
    showingEnd = document.getElementById('showing-end');
    totalItems = document.getElementById('total-items');
    
    // Check critical elements
    const criticalElements = {
        loadingState, errorState, errorMessage, paymentsTable, paymentsTBody, emptyState
    };
    
    for (const [name, element] of Object.entries(criticalElements)) {
        if (!element) {
            console.error(`❌ Critical element missing: ${name}`);
        } else {
            console.log(`✅ Found: ${name}`);
        }
    }
    
    console.log('✅ DOM elements initialized');
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Content Loaded');
    console.log('🕒 Current time:', new Date().toLocaleString());
    console.log('🌐 Current URL:', window.location.href);
    console.log('📍 Base URL:', window.location.origin);
    
    // Force hide loading state after 2 seconds if nothing happens
    const forceHideLoading = setTimeout(() => {
        console.warn('⚠️ Force hiding loading state after 2 seconds');
        const loadingElement = document.getElementById('loading-state');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
        showNoAuthMessage();
    }, 2000);
    
    // Clear timeout when loading completes
    const originalShowTableState = showTableState;
    const originalShowEmptyState = showEmptyState;
    const originalShowErrorState = showErrorState;
    
    showTableState = function() {
        clearTimeout(forceHideLoading);
        return originalShowTableState();
    };
    
    showEmptyState = function() {
        clearTimeout(forceHideLoading);
        return originalShowEmptyState();
    };
    
    showErrorState = function(message) {
        clearTimeout(forceHideLoading);
        return originalShowErrorState(message);
    };
    
    setTimeout(() => {
        console.log('🔧 Starting initialization...');
        initializeDOMElements();
        
        // Always try to load data, with better error handling
        loadPayments().then(() => {
            setupEventListeners();
        }).catch((error) => {
            console.error('Failed to load payments:', error);
            setupEventListeners(); // Still setup listeners even if loading fails
        });
    }, 10);
});

// Show message when not authenticated
function showNoAuthMessage() {
    const errorDiv = document.getElementById('error-state');
    const errorMessageDiv = document.getElementById('error-message');
    
    if (errorDiv && errorMessageDiv) {
        errorMessageDiv.innerHTML = `
            <div class="text-center">
                <p class="mb-4">Silakan login terlebih dahulu untuk mengakses halaman ini.</p>
                <div class="flex gap-3 justify-center">
                    <a href="/quick-login-resepsionis.html" class="btn-primary px-4 py-2 rounded-lg text-sm font-semibold">Quick Login</a>
                    <a href="/login.html?role=resepsionis" class="btn-secondary px-4 py-2 rounded-lg text-sm font-semibold">Login Manual</a>
                    <button onclick="loadSampleData()" class="btn-secondary px-4 py-2 rounded-lg text-sm font-semibold">Lihat Sample Data</button>
                </div>
            </div>
        `;
        errorDiv.classList.remove('hidden');
        
        // Hide other states
        const loadingDiv = document.getElementById('loading-state');
        const tableDiv = document.getElementById('payments-table');
        const emptyDiv = document.getElementById('empty-state');
        
        if (loadingDiv) loadingDiv.classList.add('hidden');
        if (tableDiv) tableDiv.classList.add('hidden');
        if (emptyDiv) emptyDiv.classList.add('hidden');
    }
}

// Setup event listeners
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Filter events
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', applyFilters);
        console.log('✅ Apply filter button event added');
    }
    
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', resetFilters);
        console.log('✅ Reset filter button event added');
    }
    
    // Search on Enter key
    if (searchQuery) {
        searchQuery.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
        console.log('✅ Search query enter event added');
    }
    
    // Pagination events
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
        console.log('✅ Previous page button event added');
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));
        console.log('✅ Next page button event added');
    }
    
    // Modal events
    if (detailModal) {
        detailModal.addEventListener('click', function(e) {
            if (e.target === detailModal) closeDetailModal();
        });
        console.log('✅ Detail modal click event added');
    }
    
    if (statusModal) {
        statusModal.addEventListener('click', function(e) {
            if (e.target === statusModal) closeStatusModal();
        });
        console.log('✅ Status modal click event added');
    }
    
    // Close modal buttons
    const closeDetailBtn = document.getElementById('close-detail-modal');
    if (closeDetailBtn) {
        closeDetailBtn.addEventListener('click', closeDetailModal);
        console.log('✅ Close detail modal button event added');
    }
    
    const closeStatusBtn = document.getElementById('close-status-modal');
    if (closeStatusBtn) {
        closeStatusBtn.addEventListener('click', closeStatusModal);
        console.log('✅ Close status modal button event added');
    }
    
    const cancelStatusBtn = document.getElementById('cancel-status-update');
    if (cancelStatusBtn) {
        cancelStatusBtn.addEventListener('click', closeStatusModal);
        console.log('✅ Cancel status update button event added');
    }
    
    // Status form submit
    if (statusForm) {
        statusForm.addEventListener('submit', handleStatusUpdate);
        console.log('✅ Status form submit event added');
    }
    
    console.log('✅ Event listeners setup completed');
}

// Load payments data
async function loadPayments() {
    console.log('📡 Loading payments...');
    showLoadingState();
    
    try {
        // Check if token exists
        const token = localStorage.getItem('token');
        console.log('🔑 Token exists:', !!token);
        console.log('🔑 Token preview:', token ? token.substring(0, 20) + '...' : 'null');
        
        if (!token) {
            console.warn('⚠️ No token found');
            showNoAuthMessage();
            return;
        }
        
        console.log('🌐 Making API request to /api/pembayaran...');
        
        const response = await fetch('/api/pembayaran', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

        if (response.status === 401) {
            console.warn('⚠️ Unauthorized (401), clearing token');
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            showNoAuthMessage();
            return;
        }
        
        if (response.status === 403) {
            console.warn('⚠️ Forbidden (403), insufficient permissions');
            showErrorState('Anda tidak memiliki izin untuk mengakses data pembayaran.');
            return;
        }

        if (!response.ok) {
            console.error('❌ HTTP Error:', response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }

        console.log('📦 Parsing response JSON...');
        const result = await response.json();
        console.log('📊 Raw API response:', result);
        console.log('📊 Data array:', result.data);
        console.log('📊 Number of payments:', result.data?.length || 0);
        
        if (!result.data) {
            console.warn('⚠️ No data property in response');
            showErrorState('Response tidak memiliki data yang valid.');
            return;
        }
        
        paymentsData = result.data || [];
        filteredData = [...paymentsData];
        
        console.log('💾 Data stored in paymentsData:', paymentsData.length, 'items');
        console.log('💾 Sample data item:', paymentsData[0]);
        
        if (paymentsData.length === 0) {
            console.log('📊 No data found - showing empty state');
            showEmptyState();
        } else {
            console.log('📊 Rendering table with', paymentsData.length, 'payments');
            renderPaymentsTable();
            showTableState();
        }
        
        console.log('✅ loadPayments completed successfully');
        
    } catch (error) {
        console.error('❌ Error loading payments:', error);
        console.error('❌ Error stack:', error.stack);
        
        const errorMessage = `Gagal memuat data pembayaran: ${error.message}`;
        showErrorState(errorMessage);
        
        // Add detailed error info and retry options
        setTimeout(() => {
            const errorDiv = document.getElementById('error-state');
            if (errorDiv && !errorDiv.querySelector('.detailed-error')) {
                const detailDiv = document.createElement('div');
                detailDiv.className = 'detailed-error mt-4 p-3 bg-red-900/20 border border-red-600 rounded text-sm';
                detailDiv.innerHTML = `
                    <p><strong>Detail Error:</strong> ${error.message}</p>
                    <div class="flex gap-2 mt-3">
                        <button onclick="loadPayments()" class="btn-primary px-3 py-1 rounded text-xs">Coba Lagi</button>
                        <button onclick="loadSampleData()" class="btn-secondary px-3 py-1 rounded text-xs">Load Sample Data</button>
                        <a href="/quick-login-resepsionis.html" class="btn-secondary px-3 py-1 rounded text-xs">Login Ulang</a>
                    </div>
                `;
                errorDiv.appendChild(detailDiv);
            }
        }, 100);
    }
}

// Load sample data function
function loadSampleData() {
    console.log('📊 Loading sample data...');
    
    const samplePayments = [
        {
            id_pembayaran: 1,
            id_reservasi: 101,
            nama_tamu: 'Ahmad Wijaya',
            no_kamar: '201',
            tipe_kamar: 'Deluxe',
            jumlah_bayar: 1500000,
            metode_pembayaran: 'Transfer Bank',
            status_pembayaran: 'Menunggu Verifikasi',
            tanggal_bayar: '2025-06-21'
        },
        {
            id_pembayaran: 2,
            id_reservasi: 102,
            nama_tamu: 'Siti Nurhaliza',
            no_kamar: '105',
            tipe_kamar: 'Standard',
            jumlah_bayar: 800000,
            metode_pembayaran: 'Tunai',
            status_pembayaran: 'Belum Lunas',
            tanggal_bayar: '2025-06-21'
        },
        {
            id_pembayaran: 3,
            id_reservasi: 103,
            nama_tamu: 'Budi Santoso',
            no_kamar: '301',
            tipe_kamar: 'Suite',
            jumlah_bayar: 2200000,
            metode_pembayaran: 'Kartu Kredit',
            status_pembayaran: 'Lunas',
            tanggal_bayar: '2025-06-20'
        },
        {
            id_pembayaran: 4,
            id_reservasi: 104,
            nama_tamu: 'Maya Sari',
            no_kamar: '203',
            tipe_kamar: 'Deluxe',
            jumlah_bayar: 950000,
            metode_pembayaran: 'E-Wallet',
            status_pembayaran: 'Menunggu Verifikasi',
            tanggal_bayar: '2025-06-21'
        },
        {
            id_pembayaran: 5,
            id_reservasi: 105,
            nama_tamu: 'Andi Pratama',
            no_kamar: '107',
            tipe_kamar: 'Standard',
            jumlah_bayar: 1200000,
            metode_pembayaran: 'Kartu Debit',
            status_pembayaran: 'Lunas',
            tanggal_bayar: '2025-06-20'
        }
    ];
    
    paymentsData = samplePayments;
    filteredData = [...paymentsData];
    
    renderPaymentsTable();
    showTableState();
    
    // Show success message
    const errorDiv = document.getElementById('error-state');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
    
    console.log('✅ Sample data loaded successfully');
}

// Show different states
function showLoadingState() {
    console.log('🔄 showLoadingState called');
    
    if (!loadingState || !errorState || !paymentsTable || !emptyState) {
        console.warn('⚠️ Some DOM elements are null, re-initializing...');
        initializeDOMElements();
    }
    
    try {
        if (loadingState && loadingState.classList) {
            loadingState.classList.remove('hidden');
        }
        if (errorState && errorState.classList) {
            errorState.classList.add('hidden');
        }
        if (paymentsTable && paymentsTable.classList) {
            paymentsTable.classList.add('hidden');
        }
        if (emptyState && emptyState.classList) {
            emptyState.classList.add('hidden');
        }
        console.log('✅ Loading state shown');
    } catch (error) {
        console.error('❌ Error in showLoadingState:', error);
    }
}

function showErrorState(message = 'Terjadi kesalahan saat memuat data.') {
    console.log('🔄 showErrorState called:', message);
    
    if (!loadingState || !errorState || !errorMessage || !paymentsTable || !emptyState) {
        console.warn('⚠️ Some DOM elements are null, re-initializing...');
        initializeDOMElements();
    }
    
    try {
        if (loadingState && loadingState.classList) {
            loadingState.classList.add('hidden');
        }
        if (errorState && errorState.classList) {
            errorState.classList.remove('hidden');
        }
        if (paymentsTable && paymentsTable.classList) {
            paymentsTable.classList.add('hidden');
        }
        if (emptyState && emptyState.classList) {
            emptyState.classList.add('hidden');
        }
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        console.log('✅ Error state shown');
    } catch (error) {
        console.error('❌ Error in showErrorState:', error);
    }
}

function showEmptyState() {
    console.log('🔄 showEmptyState called');
    
    if (!loadingState || !errorState || !paymentsTable || !emptyState) {
        console.warn('⚠️ Some DOM elements are null, re-initializing...');
        initializeDOMElements();
    }
    
    try {
        if (loadingState && loadingState.classList) {
            loadingState.classList.add('hidden');
        }
        if (errorState && errorState.classList) {
            errorState.classList.add('hidden');
        }
        if (paymentsTable && paymentsTable.classList) {
            paymentsTable.classList.add('hidden');
        }
        if (emptyState && emptyState.classList) {
            emptyState.classList.remove('hidden');
        }
        console.log('✅ Empty state shown');
    } catch (error) {
        console.error('❌ Error in showEmptyState:', error);
    }
}

function showTableState() {
    console.log('🔄 showTableState called');
    
    if (!loadingState || !errorState || !paymentsTable || !emptyState) {
        console.warn('⚠️ Some DOM elements are null, re-initializing...');
        initializeDOMElements();
    }
    
    try {
        if (loadingState && loadingState.classList) {
            loadingState.classList.add('hidden');
        }
        if (errorState && errorState.classList) {
            errorState.classList.add('hidden');
        }
        if (paymentsTable && paymentsTable.classList) {
            paymentsTable.classList.remove('hidden');
        }
        if (emptyState && emptyState.classList) {
            emptyState.classList.add('hidden');
        }
        console.log('✅ Table state shown');
    } catch (error) {
        console.error('❌ Error in showTableState:', error);
    }
}

// Render payments table
function renderPaymentsTable() {
    console.log('🔄 renderPaymentsTable called');
    console.log('📊 Filtered data length:', filteredData.length);
    
    try {
        if (filteredData.length === 0) {
            console.log('📊 No filtered data - showing empty state');
            showEmptyState();
            return;
        }

        console.log('📊 Showing table state...');
        showTableState();
        
        // Calculate pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = filteredData.slice(startIndex, endIndex);
        
        console.log('📊 Pagination:', { currentPage, startIndex, endIndex, pageDataLength: pageData.length });
        
        if (!paymentsTBody) {
            console.error('❌ paymentsTBody element not found');
            return;
        }
        
        // Clear existing data
        paymentsTBody.innerHTML = '';
        
        // Render rows
        pageData.forEach(payment => {
            const row = createPaymentRow(payment);
            paymentsTBody.appendChild(row);
        });
        
        console.log('📊 Rendering pagination...');
        renderPagination();
        
        console.log('✅ renderPaymentsTable completed successfully');
        
    } catch (error) {
        console.error('❌ Error in renderPaymentsTable:', error);
        showErrorState('Error rendering table: ' + error.message);
    }
}

// Create table row for payment
function createPaymentRow(payment) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-[var(--table-row-hover-bg)] transition-colors';
    
    // Format date
    const paymentDate = new Date(payment.tanggal_bayar).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
    });
      // Calculate total reservation cost using the same logic as reservation management
    let totalReservationCost = 0;
    let formattedTotalCost = 'N/A';
    let paymentStatus = '';
    
    // Try to get room price from different fields
    const roomPrice = payment.harga_kamar || payment.harga || 0;
    
    if (payment.tanggal_checkin && payment.tanggal_checkout && roomPrice > 0) {
        const costs = calculateReservationCosts(
            payment.tanggal_checkin,
            payment.tanggal_checkout,
            roomPrice,
            payment.total_biaya
        );
        totalReservationCost = costs.finalTotal;
        formattedTotalCost = safeFormatCurrency(totalReservationCost);
        
        // Use database status directly instead of calculating
        // Database only has "Lunas" and "Belum Lunas" status
        const dbStatus = payment.status_pembayaran || 'Belum Lunas';
        if (dbStatus.toLowerCase().includes('lunas')) {
            paymentStatus = '<span class="text-green-600 text-xs">✓ Lunas</span>';
        } else {
            paymentStatus = '<span class="text-orange-600 text-xs">Belum Lunas</span>';
        }
    } else {
        // Fallback - use database status if cost calculation fails
        const dbStatus = payment.status_pembayaran || 'Belum Lunas';
        if (dbStatus.toLowerCase().includes('lunas')) {
            paymentStatus = '<span class="text-green-600 text-xs">✓ Lunas</span>';
        } else {
            paymentStatus = '<span class="text-orange-600 text-xs">Belum Lunas</span>';
        }
    }
    
    // Format payment amount
    const formattedPaymentAmount = safeFormatCurrency(payment.jumlah_bayar);
    
    // Get status badge class
    const statusClass = getStatusBadgeClass(payment.status_pembayaran);
    
    // Get method badge class
    const methodClass = getMethodBadgeClass(payment.metode_pembayaran);
    
    row.innerHTML = `
        <td class="px-4 py-3 font-medium">#${payment.id_pembayaran}</td>
        <td class="px-4 py-3">
            <div>
                <div class="font-medium text-[var(--text-color)]">${payment.nama_tamu || 'N/A'}</div>
                <div class="text-sm text-[var(--text-muted-color)]">Reservasi #${payment.id_reservasi}</div>
            </div>
        </td>
        <td class="px-4 py-3">
            <div class="font-medium">${payment.tipe_kamar || ''}</div>
        </td>
        <td class="px-4 py-3">
            <div class="text-center">
                <div class="font-semibold text-[var(--primary-color)] text-lg">${formattedTotalCost}</div>
            </div>
        </td>
        <td class="px-4 py-3">
            <span class="method-badge ${methodClass}">${payment.metode_pembayaran}</span>
        </td>
        <td class="px-4 py-3 text-center">
            <span class="status-badge ${statusClass}">${payment.status_pembayaran}</span>
        </td>
        <td class="px-4 py-3">${paymentDate}</td>
        <td class="px-4 py-3 text-center">
            <div class="action-buttons">
                <button onclick="showPaymentDetail(${payment.id_pembayaran})" class="btn-action btn-detail btn-text" title="Lihat Detail">
                    Detail
                </button>
                <button onclick="showStatusModal(${payment.id_pembayaran}, '${payment.status_pembayaran}')" class="btn-action btn-update-status btn-text" title="Ubah Status">
                    Ubah Status
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// Get status badge class
function getStatusBadgeClass(status) {
    switch (status) {
        case 'Lunas':
            return 'status-lunas';
        case 'Belum Lunas':
            return 'status-belum-lunas';
        case 'Menunggu Verifikasi':
            return 'status-menunggu-verifikasi';
        default:
            return 'status-belum-lunas';
    }
}

// Get method badge class
function getMethodBadgeClass(method) {
    switch (method) {
        case 'Tunai':
            return 'method-tunai';
        case 'Transfer Bank':
            return 'method-transfer';
        case 'Kartu Kredit':
        case 'Kartu Debit':
            return 'method-kartu';
        case 'E-Wallet':
            return 'method-ewallet';
        default:
            return 'method-tunai';
    }
}

// Show payment detail
async function showPaymentDetail(paymentId) {
    console.log('📋 Showing payment detail for ID:', paymentId);
    
    try {
        const response = await fetch(`/api/pembayaran/${paymentId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch payment details');
        }
          const result = await response.json();
        const payment = result.data;
        
        // Calculate reservation costs for complete cost breakdown
        let costs = null;
        let formattedTotalCost = 'N/A';
        let costBreakdownHTML = '';
        
        // Try to get room price from different fields
        const roomPrice = payment.harga_kamar || payment.harga || 0;
        
        if (payment.tanggal_checkin && payment.tanggal_checkout && roomPrice > 0) {
            costs = calculateReservationCosts(
                payment.tanggal_checkin,
                payment.tanggal_checkout,
                roomPrice,
                payment.total_biaya
            );
            formattedTotalCost = safeFormatCurrency(costs.finalTotal);
            
            // Create cost breakdown HTML
            costBreakdownHTML = `
                <div class="bg-[var(--input-bg-color)] p-3 rounded-lg mt-2">
                    <h5 class="font-medium text-[var(--text-color)] mb-2">Rincian Biaya</h5>
                    <div class="space-y-1 text-sm">
                        <div class="flex justify-between">
                            <span>Subtotal (${costs.nights} malam × ${safeFormatCurrency(costs.roomPricePerNight)}):</span>
                            <span>${safeFormatCurrency(costs.subtotal)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>PPN 10%:</span>
                            <span>${safeFormatCurrency(costs.ppnAmount)}</span>
                        </div>
                        <hr class="border-[var(--input-border-color)]">
                        <div class="flex justify-between font-semibold">
                            <span>Total Biaya:</span>
                            <span class="text-[var(--primary-color)]">${safeFormatCurrency(costs.finalTotal)}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Format dates
        const paymentDate = new Date(payment.tanggal_bayar).toLocaleString('id-ID');
        const checkinDate = new Date(payment.tanggal_checkin).toLocaleDateString('id-ID');
        const checkoutDate = new Date(payment.tanggal_checkout).toLocaleDateString('id-ID');
        const formattedAmount = safeFormatCurrency(payment.jumlah_bayar);
          detailContent.innerHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-semibold text-[var(--text-color)] mb-2">Informasi Pembayaran</h4>
                        <div class="space-y-2 text-sm">
                            <div><span class="font-medium">ID Pembayaran:</span> #${payment.id_pembayaran}</div>
                            <div><span class="font-medium">Jumlah Bayar:</span> ${formattedAmount}</div>
                            <div><span class="font-medium">Metode:</span> ${payment.metode_pembayaran}</div>
                            <div><span class="font-medium">Status:</span> <span class="status-badge ${getStatusBadgeClass(payment.status_pembayaran)}">${payment.status_pembayaran}</span></div>
                            <div><span class="font-medium">Tanggal Bayar:</span> ${paymentDate}</div>
                        </div>
                    </div>
                    <div>
                        <h4 class="font-semibold text-[var(--text-color)] mb-2">Informasi Tamu</h4>
                        <div class="space-y-2 text-sm">
                            <div><span class="font-medium">Nama:</span> ${payment.nama_tamu || 'N/A'}</div>
                            <div><span class="font-medium">Email:</span> ${payment.email_tamu || 'N/A'}</div>
                            <div><span class="font-medium">No. HP:</span> ${payment.no_hp_tamu || 'N/A'}</div>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-semibold text-[var(--text-color)] mb-2">Informasi Reservasi</h4>
                        <div class="space-y-2 text-sm">
                            <div><span class="font-medium">ID Reservasi:</span> #${payment.id_reservasi}</div>
                            <div><span class="font-medium">Check-in:</span> ${checkinDate}</div>
                            <div><span class="font-medium">Check-out:</span> ${checkoutDate}</div>
                            <div><span class="font-medium">Jumlah Tamu:</span> ${payment.jumlah_tamu || 'N/A'}</div>
                            ${costs ? `<div><span class="font-medium">Lama Menginap:</span> ${costs.nights} malam</div>` : ''}
                        </div>
                    </div>
                    <div>
                        <h4 class="font-semibold text-[var(--text-color)] mb-2">Informasi Kamar</h4>
                        <div class="space-y-2 text-sm">
                            <div><span class="font-medium">Tipe Kamar:</span> ${payment.tipe_kamar || 'N/A'}</div>
                            <div><span class="font-medium">Harga per Malam:</span> ${costs ? safeFormatCurrency(costs.roomPricePerNight) : (payment.harga_kamar ? safeFormatCurrency(payment.harga_kamar) : 'N/A')}</div>
                            <div><span class="font-medium">Total Reservasi:</span> <span class="text-[var(--primary-color)] font-semibold">${formattedTotalCost}</span></div>
                        </div>
                        ${costBreakdownHTML}
                    </div>
                </div>
                ${payment.nama_resepsionis ? `
                <div>
                    <h4 class="font-semibold text-[var(--text-color)] mb-2">Diproses Oleh</h4>
                    <div class="text-sm">
                        <span class="font-medium">${payment.nama_resepsionis}</span>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        detailModal.classList.remove('hidden');
        
    } catch (error) {
        console.error('❌ Error showing payment detail:', error);
        alert('Gagal memuat detail pembayaran');
    }
}

// Show status modal
function showStatusModal(paymentId, currentStatus) {
    console.log('🔄 Showing status modal for payment ID:', paymentId, 'Current status:', currentStatus);
    
    statusPaymentId.value = paymentId;
    newStatus.value = currentStatus;
    statusModal.classList.remove('hidden');
}

// Handle status update
async function handleStatusUpdate(e) {
    e.preventDefault();
    console.log('💾 Handling status update...');
    
    const paymentId = statusPaymentId.value;
    const status = newStatus.value;
    
    if (!paymentId || !status) {
        alert('Data tidak lengkap');
        return;
    }
    
    try {
        const response = await fetch(`/api/pembayaran/${paymentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                status_pembayaran: status,
                id_resepsionis: localStorage.getItem('userId') // Assuming we store user ID
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update payment status');
        }
        
        console.log('✅ Status updated successfully');
        closeStatusModal();
        loadPayments(); // Reload data
        alert('Status pembayaran berhasil diubah');
        
    } catch (error) {
        console.error('❌ Error updating status:', error);
        alert('Gagal mengubah status pembayaran');
    }
}

// Apply filters
function applyFilters() {
    console.log('🔍 Applying filters...');
    
    const query = searchQuery?.value.toLowerCase() || '';
    const statusFilter = filterStatus?.value || '';
    const methodFilter = filterMethod?.value || '';
    
    console.log('Filter values:', { query, statusFilter, methodFilter });
    
    filteredData = paymentsData.filter(payment => {
        const matchesQuery = !query || 
            (payment.nama_tamu && payment.nama_tamu.toLowerCase().includes(query)) ||
            (payment.id_reservasi && payment.id_reservasi.toString().includes(query)) ||
            (payment.no_kamar && payment.no_kamar.toLowerCase().includes(query));
        
        const matchesStatus = !statusFilter || payment.status_pembayaran === statusFilter;
        const matchesMethod = !methodFilter || payment.metode_pembayaran === methodFilter;
        
        return matchesQuery && matchesStatus && matchesMethod;
    });
    
    console.log('Filtered results:', filteredData.length);
    currentPage = 1;
    renderPaymentsTable();
}

// Reset filters
function resetFilters() {
    console.log('🔄 Resetting filters...');
    
    if (searchQuery) searchQuery.value = '';
    if (filterStatus) filterStatus.value = '';
    if (filterMethod) filterMethod.value = '';
    
    filteredData = [...paymentsData];
    currentPage = 1;
    renderPaymentsTable();
}

// Pagination functions
function renderPagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
    
    // Update showing text
    if (showingStart) showingStart.textContent = filteredData.length > 0 ? startIndex + 1 : 0;
    if (showingEnd) showingEnd.textContent = endIndex;
    if (totalItems) totalItems.textContent = filteredData.length;
    
    // Update pagination buttons
    if (prevPageBtn) {
        prevPageBtn.disabled = currentPage <= 1;
    }
    if (nextPageBtn) {
        nextPageBtn.disabled = currentPage >= totalPages;
    }
    
    // Render page numbers
    if (pageNumbers) {
        pageNumbers.innerHTML = '';
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
                const pageBtn = document.createElement('button');
                pageBtn.textContent = i;
                pageBtn.className = `px-3 py-2 border rounded-md text-sm ${i === currentPage ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]' : 'border-[var(--border-color)] hover:bg-[var(--table-row-hover-bg)]'}`;
                pageBtn.addEventListener('click', () => changePage(i));
                pageNumbers.appendChild(pageBtn);
            } else if (Math.abs(i - currentPage) === 3) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.className = 'px-2 py-2 text-sm text-[var(--text-muted-color)]';
                pageNumbers.appendChild(dots);
            }
        }
    }
}

function changePage(page) {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderPaymentsTable();
}

// Modal functions
function closeDetailModal() {
    console.log('❌ Closing detail modal');
    if (detailModal) {
        detailModal.classList.add('hidden');
    }
}

function closeStatusModal() {
    console.log('❌ Closing status modal');
    if (statusModal) {
        statusModal.classList.add('hidden');
    }
    if (statusForm) {
        statusForm.reset();
    }
}

// Helper function to safely convert to number
function safeNumber(value, fallback = 0) {
    const num = parseFloat(value);
    return isNaN(num) ? fallback : num;
}

// Helper function to safely format currency
function safeFormatCurrency(amount) {
    const safeAmount = safeNumber(amount, 0);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(safeAmount);
}

// Helper function to calculate reservation costs with PPN (copied from manajemen-reservasi.js)
function calculateReservationCosts(checkinDate, checkoutDate, roomPrice, existingTotal = null) {
    try {
        console.log('💰 calculateReservationCosts called with:', {
            checkinDate,
            checkoutDate,
            roomPrice,
            existingTotal,
            typeof_roomPrice: typeof roomPrice
        });
        
        // Validate input parameters first
        if (!checkinDate || !checkoutDate) {
            console.warn('⚠️ Missing dates for cost calculation');
            return {
                nights: 1,
                roomPricePerNight: 0,
                subtotal: 0,
                ppnRate: 0.10,
                ppnAmount: 0,
                calculatedTotal: 0,
                finalTotal: existingTotal || 0,
                isUsingDatabaseTotal: !!existingTotal
            };
        }

        // Parse dates safely
        let checkin, checkout;
        
        // Handle different date formats
        if (typeof checkinDate === 'string') {
            // Extract date part if it's a datetime string
            const checkinStr = checkinDate.includes(' ') ? checkinDate.split(' ')[0] : 
                             checkinDate.includes('T') ? checkinDate.split('T')[0] : checkinDate;
            checkin = new Date(checkinStr + 'T00:00:00');
        } else {
            checkin = new Date(checkinDate);
        }
        
        if (typeof checkoutDate === 'string') {
            // Extract date part if it's a datetime string
            const checkoutStr = checkoutDate.includes(' ') ? checkoutDate.split(' ')[0] : 
                              checkoutDate.includes('T') ? checkoutDate.split('T')[0] : checkoutDate;
            checkout = new Date(checkoutStr + 'T00:00:00');
        } else {
            checkout = new Date(checkoutDate);
        }
        
        // Validate parsed dates
        if (isNaN(checkin.getTime()) || isNaN(checkout.getTime())) {
            console.warn('⚠️ Invalid dates for cost calculation:', { checkinDate, checkoutDate });
            return {
                nights: 1,
                roomPricePerNight: parseFloat(roomPrice) || 0,
                subtotal: parseFloat(roomPrice) || 0,
                ppnRate: 0.10,
                ppnAmount: (parseFloat(roomPrice) || 0) * 0.10,
                calculatedTotal: (parseFloat(roomPrice) || 0) * 1.10,
                finalTotal: existingTotal || (parseFloat(roomPrice) || 0) * 1.10,
                isUsingDatabaseTotal: !!existingTotal
            };
        }
        
        // Calculate nights (checkout - checkin)
        const timeDiff = checkout.getTime() - checkin.getTime();
        const nights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        // Ensure valid values with proper fallbacks
        const validNights = Math.max(nights, 1);
        const validRoomPrice = parseFloat(roomPrice) || 0;
        
        // Calculate costs
        const subtotal = validRoomPrice * validNights;
        const ppnRate = 0.10; // 10% PPN
        const ppnAmount = subtotal * ppnRate;
        const calculatedTotal = subtotal + ppnAmount;
        
        // Use existing total from database if available and reasonable
        let finalTotal = calculatedTotal;
        let isUsingDatabaseTotal = false;
        
        if (existingTotal && !isNaN(parseFloat(existingTotal)) && parseFloat(existingTotal) > 0) {
            finalTotal = parseFloat(existingTotal);
            isUsingDatabaseTotal = Math.abs(finalTotal - calculatedTotal) > 1;
        }
        
        // Final validation - ensure no NaN values
        const result = {
            nights: isNaN(validNights) ? 1 : validNights,
            roomPricePerNight: isNaN(validRoomPrice) ? 0 : validRoomPrice,
            subtotal: isNaN(subtotal) ? 0 : subtotal,
            ppnRate: ppnRate,
            ppnAmount: isNaN(ppnAmount) ? 0 : ppnAmount,
            calculatedTotal: isNaN(calculatedTotal) ? 0 : calculatedTotal,
            finalTotal: isNaN(finalTotal) ? 0 : finalTotal,
            isUsingDatabaseTotal: isUsingDatabaseTotal,
            // Additional fields for payment management
            totalWithoutPPN: isNaN(subtotal) ? 0 : subtotal,
            totalWithPPN: isNaN(finalTotal) ? 0 : finalTotal,
            paymentAmountDue: isNaN(finalTotal) ? 0 : finalTotal
        };
        
        console.log('💰 Cost calculation result (for payment management):', result);
        return result;
        
    } catch (error) {
        console.error('❌ Error in calculateReservationCosts:', error);
        // Return safe fallback values
        const fallbackPrice = parseFloat(roomPrice) || 0;
        const fallbackSubtotal = fallbackPrice;
        const fallbackPPN = fallbackPrice * 0.10;
        const fallbackTotal = fallbackPrice * 1.10;
        
        return {
            nights: 1,
            roomPricePerNight: fallbackPrice,
            subtotal: fallbackSubtotal,
            ppnRate: 0.10,
            ppnAmount: fallbackPPN,
            calculatedTotal: fallbackTotal,
            finalTotal: existingTotal || fallbackTotal,
            isUsingDatabaseTotal: !!existingTotal,
            totalWithoutPPN: fallbackSubtotal,
            totalWithPPN: existingTotal || fallbackTotal,
            paymentAmountDue: existingTotal || fallbackTotal
        };
    }
}
