document.addEventListener('DOMContentLoaded', async () => {
    console.log('pembayaran.js: Page loaded');
    
    // Wait for auth scripts to load
    let authCheckAttempts = 0;
    while ((typeof isUserLoggedIn !== 'function' || typeof getLoggedInUser !== 'function') && authCheckAttempts < 50) {
        console.log('pembayaran.js: Waiting for auth functions to load...');
        await new Promise(resolve => setTimeout(resolve, 100));
        authCheckAttempts++;
    }
    
    if (typeof isUserLoggedIn !== 'function') {
        console.error('pembayaran.js: Auth functions not available after waiting');
        alert("Sistem autentikasi tidak tersedia. Silakan refresh halaman.");
        return;
    }
    
    // Check authentication
    if (!isUserLoggedIn()) {
        console.error('pembayaran.js: User not logged in');
        alert("Anda harus login untuk mengakses halaman pembayaran.");
        window.location.href = '/login.html';
        return;
    }

    const currentUser = getLoggedInUser();
    console.log('pembayaran.js: currentUser:', currentUser);
    
    if (!currentUser) {
        console.error('pembayaran.js: No user data found');
        alert("Data pengguna tidak ditemukan. Silakan login ulang.");
        window.location.href = '/login.html';
        return;
    }

    // Get reservation ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const reservationId = urlParams.get('reservation');
    
    console.log('pembayaran.js: reservationId:', reservationId);
    
    if (!reservationId) {
        console.error('pembayaran.js: No reservation ID found');
        alert("ID Reservasi tidak ditemukan.");
        window.location.href = '/tamu/reservasi-saya.html';
        return;
    }

    // DOM elements
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const mainContent = document.getElementById('main-content');
    const reservationDetails = document.getElementById('reservation-details');
    const paymentStatus = document.getElementById('payment-status');
    const paymentForm = document.getElementById('payment-form');
    const paymentInstructions = document.getElementById('payment-instructions');
    const paymentFormElement = document.getElementById('paymentFormElement');
    const submitButton = document.getElementById('submit-payment');

    let currentReservation = null;
    let selectedPaymentMethod = null;

    // Utility functions
    function formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    function showError(message) {
        loadingState.style.display = 'none';
        mainContent.style.display = 'none';
        errorMessage.textContent = message;
        errorState.style.display = 'block';
    }

    function showMainContent() {
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        mainContent.style.display = 'block';
    }    // Fetch reservation details
    async function fetchReservationDetails() {
        try {
            console.log('pembayaran.js: Fetching reservation details for ID:', reservationId);
            console.log('pembayaran.js: Current user:', currentUser);
            
            // First, get all user reservations and find the specific one
            const userId = currentUser.id_tamu || currentUser.id;
            console.log('pembayaran.js: Using userId:', userId);
            
            const url = `/api/reservasi/tamu/${userId}`;
            console.log('pembayaran.js: Fetching from URL:', url);
            
            const response = await fetch(url);
            
            console.log('pembayaran.js: Response status:', response.status);
            console.log('pembayaran.js: Response ok:', response.ok);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('pembayaran.js: Response error text:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('pembayaran.js: User reservations data:', result);
            
            // Find the specific reservation
            const reservations = result.data || [];
            console.log('pembayaran.js: Looking for reservation ID:', reservationId, 'in', reservations.length, 'reservations');
            
            const reservation = reservations.find(r => r.id_reservasi == reservationId);
            
            if (!reservation) {
                console.error('pembayaran.js: Reservation not found. Available reservations:', 
                    reservations.map(r => r.id_reservasi));
                throw new Error(`Reservation ${reservationId} not found or you don't have access to it`);
            }
            
            console.log('pembayaran.js: Found reservation:', reservation);
            return reservation;
        } catch (error) {
            console.error('pembayaran.js: Error fetching reservation:', error);
            throw error;        }
    }

    // Display reservation details
    function displayReservationDetails(reservation) {
        const checkinDate = formatDate(reservation.tanggal_checkin);
        const checkoutDate = formatDate(reservation.tanggal_checkout);
        const duration = Math.ceil((new Date(reservation.tanggal_checkout) - new Date(reservation.tanggal_checkin)) / (1000 * 60 * 60 * 24));
          // Calculate total amount with PPN (price per night * number of nights * 1.1)
        const pricePerNight = parseFloat(reservation.harga) || 0;
        const subtotal = pricePerNight * duration;
        const ppn = subtotal * 0.10; // PPN 10%
        const totalAmount = subtotal + ppn;

        reservationDetails.innerHTML = `
            <h3 class="text-xl font-semibold text-[var(--primary-color)] mb-4">Detail Reservasi</h3>
            <div class="grid md:grid-cols-2 gap-6">
                <div>
                    <div class="mb-4">
                        <h4 class="font-semibold text-[var(--text-color)] mb-2">Informasi Kamar</h4>
                        <p class="text-[var(--text-muted-color)]">
                            <strong>ID Reservasi:</strong> ${reservation.id_reservasi}<br>
                            <strong>Tipe Kamar:</strong> ${reservation.tipe_kamar || 'N/A'}<br>
                            <strong>Nomor Kamar:</strong> ${reservation.no_kamar || 'Belum ditentukan'}<br>
                            <strong>Kapasitas:</strong> ${reservation.kapasitas_maks || 'N/A'} orang
                        </p>
                    </div>
                    <div class="mb-4">
                        <h4 class="font-semibold text-[var(--text-color)] mb-2">Informasi Tamu</h4>
                        <p class="text-[var(--text-muted-color)]">
                            <strong>Nama:</strong> ${reservation.nama_tamu || 'N/A'}<br>
                            <strong>Email:</strong> ${reservation.email_tamu || 'N/A'}<br>
                            <strong>No. HP:</strong> ${reservation.no_hp_tamu || 'N/A'}
                        </p>
                    </div>
                </div>
                <div>
                    <div class="mb-4">
                        <h4 class="font-semibold text-[var(--text-color)] mb-2">Detail Menginap</h4>
                        <p class="text-[var(--text-muted-color)]">
                            <strong>Check-in:</strong> ${checkinDate}<br>
                            <strong>Check-out:</strong> ${checkoutDate}<br>
                            <strong>Durasi:</strong> ${duration} malam<br>
                            <strong>Jumlah Tamu:</strong> ${reservation.jumlah_tamu || 1} orang
                        </p>
                    </div>                    <div class="bg-[var(--input-bg-color)] p-4 rounded-lg">
                        <h4 class="font-semibold text-[var(--text-color)] mb-2">Rincian Biaya</h4>
                        <div class="flex justify-between text-[var(--text-muted-color)] mb-1">
                            <span>Harga per malam:</span>
                            <span>${formatCurrency(pricePerNight)}</span>
                        </div>
                        <div class="flex justify-between text-[var(--text-muted-color)] mb-1">
                            <span>Durasi menginap:</span>
                            <span>${duration} malam</span>
                        </div>
                        <div class="flex justify-between text-[var(--text-muted-color)] mb-1">
                            <span>Subtotal:</span>
                            <span>${formatCurrency(subtotal)}</span>
                        </div>
                        <div class="flex justify-between text-[var(--text-muted-color)] mb-2">
                            <span>PPN (10%):</span>
                            <span>${formatCurrency(ppn)}</span>
                        </div>
                        <hr class="border-[var(--input-border-color)] mb-2">
                        <div class="flex justify-between text-[var(--primary-color)] font-bold text-lg">
                            <span>Total Pembayaran:</span>
                            <span>${formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;        currentReservation = {
            ...reservation,
            subtotal: subtotal,
            ppn: ppn,
            total_amount: totalAmount,
            duration: duration,
            price_per_night: pricePerNight
        };
    }

    // Display payment status
    function displayPaymentStatus(payment) {
        if (!payment) return;

        const statusClass = payment.status_pembayaran === 'Lunas' ? 'status-success' :
                          payment.status_pembayaran === 'Menunggu Verifikasi' ? 'status-pending' : 'status-danger';

        paymentStatus.innerHTML = `
            <h3 class="text-xl font-semibold text-[var(--primary-color)] mb-4">Status Pembayaran</h3>
            <div class="bg-[var(--input-bg-color)] p-4 rounded-lg">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[var(--text-color)]">Status:</span>
                    <span class="${statusClass} font-bold">${payment.status_pembayaran}</span>
                </div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[var(--text-color)]">Metode Pembayaran:</span>
                    <span class="text-[var(--text-muted-color)]">${payment.metode_pembayaran}</span>
                </div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[var(--text-color)]">Jumlah Bayar:</span>
                    <span class="text-[var(--text-muted-color)]">${formatCurrency(payment.jumlah_bayar)}</span>
                </div>
                ${payment.tanggal_bayar ? `
                <div class="flex justify-between items-center">
                    <span class="text-[var(--text-color)]">Tanggal Bayar:</span>
                    <span class="text-[var(--text-muted-color)]">${formatDate(payment.tanggal_bayar)}</span>
                </div>
                ` : ''}
                ${payment.status_pembayaran === 'Lunas' ? `
                <div class="mt-4 p-3 bg-green-600 bg-opacity-20 border border-green-600 rounded-lg">
                    <p class="text-green-400 text-sm">✅ Pembayaran telah dikonfirmasi. Terima kasih!</p>
                </div>
                ` : payment.status_pembayaran === 'Menunggu Verifikasi' ? `
                <div class="mt-4 p-3 bg-yellow-600 bg-opacity-20 border border-yellow-600 rounded-lg">
                    <p class="text-yellow-400 text-sm">⏳ Pembayaran sedang diverifikasi oleh resepsionis.</p>
                </div>
                ` : ''}
            </div>
        `;
        paymentStatus.style.display = 'block';
    }

    // Setup payment method selection
    function setupPaymentMethodSelection() {
        const paymentOptions = document.querySelectorAll('.payment-method-option');
        const paymentDetails = document.getElementById('payment-details');

        paymentOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all options
                paymentOptions.forEach(opt => opt.classList.remove('selected'));
                
                // Add selected class to clicked option
                option.classList.add('selected');
                
                // Get selected method
                selectedPaymentMethod = option.dataset.method;
                console.log('Selected payment method:', selectedPaymentMethod);
                
                // Show payment details
                paymentDetails.style.display = 'block';
                submitButton.disabled = false;
                
                // Update submit button text
                updateSubmitButtonText();
            });
        });
    }

    // Update submit button text based on payment method
    function updateSubmitButtonText() {
        const buttonTexts = {
            'transfer': 'Proses Transfer Bank',
            'ewallet': 'Proses E-Wallet',
            'kartu_kredit': 'Proses Kartu Kredit',
            'tunai': 'Konfirmasi Bayar di Hotel'
        };
        
        submitButton.textContent = buttonTexts[selectedPaymentMethod] || 'Proses Pembayaran';
    }

    // Show payment instructions
    function showPaymentInstructions(method, amount) {
        const instructions = {
            'transfer': `
                <div class="bg-blue-600 bg-opacity-20 border border-blue-600 rounded-lg p-4 mb-4">
                    <h4 class="text-blue-400 font-semibold mb-2">Transfer Bank</h4>
                    <p class="text-[var(--text-muted-color)] text-sm mb-3">Silakan transfer ke rekening berikut:</p>
                    <div class="bg-[var(--input-bg-color)] p-3 rounded border">
                        <p class="text-[var(--text-color)] font-mono">
                            <strong>Bank BCA</strong><br>
                            No. Rekening: <span class="text-[var(--primary-color)]">1234567890</span><br>
                            Atas Nama: <strong>PT Grand Royale Hotel</strong><br>
                            Jumlah: <span class="text-[var(--primary-color)]">${formatCurrency(amount)}</span>
                        </p>
                    </div>
                    <p class="text-[var(--text-muted-color)] text-sm mt-3">
                        Setelah transfer, pembayaran akan diverifikasi oleh resepsionis dalam 1x24 jam.
                    </p>
                </div>
            `,
            'ewallet': `
                <div class="bg-purple-600 bg-opacity-20 border border-purple-600 rounded-lg p-4 mb-4">
                    <h4 class="text-purple-400 font-semibold mb-2">E-Wallet</h4>
                    <p class="text-[var(--text-muted-color)] text-sm mb-3">Pembayaran melalui E-Wallet:</p>
                    <div class="bg-[var(--input-bg-color)] p-3 rounded border">
                        <p class="text-[var(--text-color)]">
                            <strong>Scan QR Code atau Transfer ke:</strong><br>
                            GoPay: <span class="text-[var(--primary-color)]">081234567890</span><br>
                            OVO: <span class="text-[var(--primary-color)]">081234567890</span><br>
                            DANA: <span class="text-[var(--primary-color)]">081234567890</span><br>
                            Jumlah: <span class="text-[var(--primary-color)]">${formatCurrency(amount)}</span>
                        </p>
                    </div>
                    <p class="text-[var(--text-muted-color)] text-sm mt-3">
                        Pembayaran akan diverifikasi secara otomatis dalam beberapa menit.
                    </p>
                </div>
            `,
            'kartu_kredit': `
                <div class="bg-orange-600 bg-opacity-20 border border-orange-600 rounded-lg p-4 mb-4">
                    <h4 class="text-orange-400 font-semibold mb-2">Kartu Kredit</h4>
                    <p class="text-[var(--text-muted-color)] text-sm mb-3">Pembayaran dengan kartu kredit:</p>
                    <div class="bg-[var(--input-bg-color)] p-3 rounded border">
                        <p class="text-[var(--text-color)]">
                            Jumlah: <span class="text-[var(--primary-color)]">${formatCurrency(amount)}</span><br>
                            <small class="text-[var(--text-muted-color)]">Pembayaran akan diproses melalui gateway yang aman</small>
                        </p>
                    </div>
                    <p class="text-[var(--text-muted-color)] text-sm mt-3">
                        Anda akan diarahkan ke halaman pembayaran yang aman untuk memasukkan detail kartu.
                    </p>
                </div>
            `,
            'tunai': `
                <div class="bg-green-600 bg-opacity-20 border border-green-600 rounded-lg p-4 mb-4">
                    <h4 class="text-green-400 font-semibold mb-2">Bayar di Hotel</h4>
                    <p class="text-[var(--text-muted-color)] text-sm mb-3">Pembayaran tunai saat check-in:</p>
                    <div class="bg-[var(--input-bg-color)] p-3 rounded border">
                        <p class="text-[var(--text-color)]">
                            Jumlah: <span class="text-[var(--primary-color)]">${formatCurrency(amount)}</span><br>
                            <strong>Waktu Pembayaran:</strong> Saat check-in<br>
                            <strong>Lokasi:</strong> Front Desk Hotel
                        </p>
                    </div>
                    <p class="text-[var(--text-muted-color)] text-sm mt-3">
                        Reservasi Anda akan dikonfirmasi. Silakan bayar tunai saat tiba di hotel.
                    </p>
                </div>
            `
        };

        const instructionsContent = document.getElementById('instructions-content');
        instructionsContent.innerHTML = instructions[method] || '';
        paymentInstructions.style.display = 'block';
    }

    // Process payment
    async function processPayment(paymentData) {
        try {
            console.log('Processing payment:', paymentData);
            
            const response = await fetch('/api/pembayaran', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(paymentData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Payment processed:', result);
            return result;

        } catch (error) {
            console.error('Error processing payment:', error);
            throw error;
        }
    }

    // Handle form submission
    paymentFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!selectedPaymentMethod) {
            alert('Silakan pilih metode pembayaran.');
            return;
        }

        // Disable form during processing
        paymentFormElement.classList.add('loading');
        submitButton.disabled = true;
        submitButton.textContent = 'Memproses...';

        try {
            const notes = document.getElementById('payment-notes').value;            // Prepare payment data
            const paymentData = {
                id_reservasi: parseInt(reservationId),
                jumlah_bayar: currentReservation.total_amount,
                metode_pembayaran: selectedPaymentMethod === 'transfer' ? 'Transfer Bank' :
                                   selectedPaymentMethod === 'ewallet' ? 'E-Wallet' :
                                   selectedPaymentMethod === 'kartu_kredit' ? 'Kartu Kredit' : 'Tunai',
                status_pembayaran: selectedPaymentMethod === 'tunai' ? 'Belum Lunas' : 'Menunggu Verifikasi'
            };            // Process payment
            const result = await processPayment(paymentData);
            
            console.log('✅ Payment creation successful:', result);

            // Show success message
            alert('Pembayaran berhasil diproses! ID Pembayaran: ' + result.id);

            // Show payment instructions immediately
            showPaymentInstructions(selectedPaymentMethod, currentReservation.total_amount);

            // Hide payment form since payment is now created
            paymentForm.style.display = 'none';

            // Show payment status based on what we just created
            const paymentStatus = {
                status_pembayaran: result.status || (selectedPaymentMethod === 'tunai' ? 'Belum Lunas' : 'Menunggu Verifikasi'),
                metode_pembayaran: selectedPaymentMethod === 'transfer' ? 'Transfer Bank' :
                                 selectedPaymentMethod === 'ewallet' ? 'E-Wallet' :
                                 selectedPaymentMethod === 'kartu_kredit' ? 'Kartu Kredit' : 'Tunai',
                jumlah_bayar: currentReservation.total_amount,
                tanggal_bayar: new Date().toISOString()
            };
            displayPaymentStatus(paymentStatus);

        } catch (error) {
            console.error('Payment processing failed:', error);
            alert('Gagal memproses pembayaran: ' + error.message);
            
            // Re-enable form
            paymentFormElement.classList.remove('loading');
            submitButton.disabled = false;
            updateSubmitButtonText();
        }
    });    // Initialize page
    async function initializePage() {
        try {
            // Fetch reservation details
            const reservation = await fetchReservationDetails();
            
            // Display reservation details
            displayReservationDetails(reservation);

            // Always show payment form since we're not checking for existing payments
            console.log('ℹ️ Showing payment form for reservation:', reservationId);
            paymentForm.style.display = 'block';
            setupPaymentMethodSelection();

            showMainContent();

        } catch (error) {
            console.error('Error initializing page:', error);
            showError('Gagal memuat data pembayaran: ' + error.message);
        }
    }

    // Start initialization
    await initializePage();
});
