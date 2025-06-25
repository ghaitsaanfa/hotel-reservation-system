document.addEventListener('DOMContentLoaded', () => {
    // Authentication check
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
    }    // DOM elements
    const paymentsTbody = document.getElementById('payments-tbody');
    const loadingIndicator = document.getElementById('loading-indicator');
    const emptyState = document.getElementById('empty-state');
    const paymentsTableContainer = document.getElementById('payments-table-container');
    
    // Filter elements
    const searchPaymentIdInput = document.getElementById('search-payment-id');
    const searchReservationIdInput = document.getElementById('search-reservation-id-payment');
    const searchGuestNameInput = document.getElementById('search-guest-name-payment');
    const filterPaymentMethodSelect = document.getElementById('filter-payment-method');
    const filterPaymentStatusSelect = document.getElementById('filter-payment-status');
    const applyFilterBtn = document.getElementById('apply-payment-filter-btn');
    const resetFilterBtn = document.getElementById('reset-payment-filter-btn');
    const refreshBtn = document.getElementById('refresh-btn');

    // Detail Modal elements
    const paymentDetailModal = document.getElementById('paymentDetailModal');
    const closePaymentDetailModalBtn = document.getElementById('closePaymentDetailModalBtn');

    // Global variables
    let allPayments = [];
    let filteredPayments = [];

    // Initialize
    init();

    async function init() {
        await loadPayments();
        setupEventListeners();
    }    // Setup event listeners
    function setupEventListeners() {
        // Filter controls
        if (applyFilterBtn) applyFilterBtn.addEventListener('click', applyFilters);
        if (resetFilterBtn) resetFilterBtn.addEventListener('click', resetFilters);
        if (refreshBtn) refreshBtn.addEventListener('click', loadPayments);
        
        // Modal controls
        if (closePaymentDetailModalBtn) closePaymentDetailModalBtn.addEventListener('click', closeDetailModal);

        // Close modals when clicking outside
        if (paymentDetailModal) {
            paymentDetailModal.addEventListener('click', (e) => {
                if (e.target === paymentDetailModal) closeDetailModal();
            });
        }
    }

    // Load payments from API
    async function loadPayments() {
        try {
            showLoading();
            const token = getAuthToken();
            const response = await fetch('/api/pembayaran', {
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
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            allPayments = result.data || [];
            filteredPayments = [...allPayments];
            renderPaymentsTable();
            
        } catch (error) {
            console.error('Error loading payments:', error);
            showError('Gagal memuat data pembayaran: ' + error.message);
        }
    }    // Render payments table
    function renderPaymentsTable() {
        if (!paymentsTbody) return;

        // Hide loading indicator
        if (loadingIndicator) loadingIndicator.style.display = 'none';

        if (filteredPayments.length === 0) {
            // Show empty state
            if (paymentsTableContainer) paymentsTableContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        // Show table and hide empty state
        if (paymentsTableContainer) paymentsTableContainer.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';

        paymentsTbody.innerHTML = filteredPayments.map(payment => `
            <tr class="hover:bg-[var(--table-row-hover-bg)] transition-colors">
                <td class="px-3 py-4 font-medium text-[var(--text-color)] text-center">${payment.id_pembayaran || '-'}</td>
                <td class="px-3 py-4 text-[var(--text-color)] text-center">${payment.id_reservasi || '-'}</td>
                <td class="px-3 py-4 text-[var(--text-color)] text-center">${payment.nama_tamu || '-'}</td>
                <td class="px-3 py-4 text-[var(--text-color)] text-center">${formatDateTime(payment.tanggal_bayar)}</td>
                <td class="px-3 py-4 text-[var(--text-color)] font-medium text-center">${formatCurrency(payment.jumlah_bayar)}</td>
                <td class="px-3 py-4 text-center">
                    <span class="status-badge ${getPaymentMethodClass(payment.metode_pembayaran)} text-xs">${payment.metode_pembayaran || '-'}</span>
                </td>
                <td class="px-3 py-4 text-center">
                    <span class="status-badge ${getPaymentStatusClass(payment.status_pembayaran)} text-xs">${payment.status_pembayaran || '-'}</span>
                </td>
                <td class="px-3 py-4 text-[var(--text-color)] text-center">${payment.nama_resepsionis || 'Sistem'}</td>
                <td class="px-3 py-4 text-center">
                    <button onclick="viewPaymentDetail(${payment.id_pembayaran})" class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors">
                        Detail
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Get payment method class for styling
    function getPaymentMethodClass(method) {
        switch(method) {
            case 'Tunai': return 'status-metode-tunai';
            case 'Kartu Kredit': return 'status-metode-kartu-kredit';
            case 'Transfer Bank': return 'status-metode-transfer-bank';
            case 'E-Wallet': return 'status-metode-e-wallet';
            default: return '';
        }
    }

    // Get status class for styling
    function getPaymentStatusClass(status) {
        switch(status) {
            case 'Belum Lunas': return 'status-pembayaran-belum-lunas';
            case 'Lunas': return 'status-pembayaran-lunas';
            case 'Menunggu Verifikasi': return 'status-pembayaran-menunggu-verifikasi';
            default: return '';
        }
    }

    // Apply filters
    function applyFilters() {
        const searchPaymentId = searchPaymentIdInput?.value.toLowerCase() || '';
        const searchReservationId = searchReservationIdInput?.value.toLowerCase() || '';
        const searchGuestName = searchGuestNameInput?.value.toLowerCase() || '';
        const filterMethod = filterPaymentMethodSelect?.value || '';
        const filterStatus = filterPaymentStatusSelect?.value || '';

        filteredPayments = allPayments.filter(payment => {
            const matchPaymentId = !searchPaymentId || (payment.id_pembayaran && payment.id_pembayaran.toString().toLowerCase().includes(searchPaymentId));
            const matchReservationId = !searchReservationId || (payment.id_reservasi && payment.id_reservasi.toString().toLowerCase().includes(searchReservationId));
            const matchGuestName = !searchGuestName || (payment.nama_tamu && payment.nama_tamu.toLowerCase().includes(searchGuestName));
            const matchMethod = !filterMethod || payment.metode_pembayaran === filterMethod;
            const matchStatus = !filterStatus || payment.status_pembayaran === filterStatus;

            return matchPaymentId && matchReservationId && matchGuestName && matchMethod && matchStatus;
        });

        renderPaymentsTable();
    }

    // Reset filters
    function resetFilters() {
        if (searchPaymentIdInput) searchPaymentIdInput.value = '';
        if (searchReservationIdInput) searchReservationIdInput.value = '';
        if (searchGuestNameInput) searchGuestNameInput.value = '';
        if (filterPaymentMethodSelect) filterPaymentMethodSelect.value = '';
        if (filterPaymentStatusSelect) filterPaymentStatusSelect.value = '';
        
        filteredPayments = [...allPayments];
        renderPaymentsTable();
    }

    // View payment detail
    window.viewPaymentDetail = async function(paymentId) {
        try {
            const token = getAuthToken();
            const response = await fetch(`/api/pembayaran/${paymentId}`, {
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
                throw new Error('Gagal mengambil detail pembayaran');
            }

            const result = await response.json();
            const payment = result.data;

            // Populate detail modal
            document.getElementById('detail-modal-payment-id').textContent = payment.id_pembayaran || '-';
            document.getElementById('detail-modal-payment-res-id').textContent = payment.id_reservasi || '-';
            document.getElementById('detail-modal-payment-guest-name').textContent = payment.nama_tamu || '-';
            document.getElementById('detail-modal-payment-date').textContent = formatDateTime(payment.tanggal_bayar);
            document.getElementById('detail-modal-payment-amount').textContent = formatCurrency(payment.jumlah_bayar);
            document.getElementById('detail-modal-payment-method').textContent = payment.metode_pembayaran || '-';
            document.getElementById('detail-modal-payment-status').textContent = payment.status_pembayaran || '-';
            document.getElementById('detail-modal-payment-processed-by').textContent = payment.nama_resepsionis || 'Sistem';

            // Show modal
            paymentDetailModal.classList.remove('hidden');
            paymentDetailModal.classList.add('flex');

        } catch (error) {
            console.error('Error loading payment detail:', error);
            showError(error.message);
        }
    };

    // Modal functions
    function closeDetailModal() {
        paymentDetailModal.classList.add('hidden');
        paymentDetailModal.classList.remove('flex');
    }

    // Utility functions
    function showLoading() {
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        if (paymentsTableContainer) paymentsTableContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', { 
            style: 'currency', 
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    }

    function formatDateTime(dateTimeString) {
        if (!dateTimeString) return '-';
        const date = new Date(dateTimeString);
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function showError(message) {
        console.error(message);
        alert('Error: ' + message);
    }

    function showSuccess(message) {
        console.log(message);
        alert('Success: ' + message);
    }

    function handleAuthError() {
        alert('Sesi Anda telah berakhir. Silakan login kembali.');
        logoutUser();
        window.location.href = '/login.html?role=admin';
    }
});
