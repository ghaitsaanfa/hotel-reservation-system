document.addEventListener('DOMContentLoaded', async () => {
    console.log('reservasi-saya.js: Page loaded');
    
    // Wait a bit for all scripts to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('reservasi-saya.js: typeof isUserLoggedIn:', typeof isUserLoggedIn);
    console.log('reservasi-saya.js: typeof getLoggedInUser:', typeof getLoggedInUser);
    
    // Pastikan pengguna sudah login
    if (typeof isUserLoggedIn !== 'function') {
        console.error('reservasi-saya.js: isUserLoggedIn function not found');
        alert("Sistem autentikasi tidak ditemukan. Silakan refresh halaman.");
        return;
    }
    
    if (!isUserLoggedIn()) {
        console.log('reservasi-saya.js: User not logged in');
        alert("Anda harus login untuk melihat riwayat reservasi.");
        const targetUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?redirect=${targetUrl}`;
        return;
    }

    console.log('reservasi-saya.js: User is logged in');
    
    if (typeof getLoggedInUser !== 'function') {
        console.error('reservasi-saya.js: getLoggedInUser function not found');
        alert("Sistem autentikasi tidak ditemukan. Silakan refresh halaman.");
        return;
    }
    
    const currentUser = getLoggedInUser();
    console.log('reservasi-saya.js: currentUser:', currentUser);    const reservationsListContainer = document.getElementById('reservations-list-container');
    const loadingMessage = document.getElementById('loading-message');
    const noReservationsMessage = document.getElementById('no-reservations-message');
    const hideCancelledCheckbox = document.getElementById('hideCancelledReservations');

    let allReservations = []; // Store all reservations
    let filteredReservations = []; // Store filtered reservations

    // Fungsi untuk memformat mata uang
    function formatCurrency(amount) {
        if (typeof amount === 'string' && amount.startsWith('Rp')) {
            return amount;
        }
        return new Intl.NumberFormat('id-ID', { 
            style: 'currency', 
            currency: 'IDR', 
            minimumFractionDigits: 0 
        }).format(amount);
    }

    // Fungsi untuk memformat tanggal
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric', 
            month: 'long', 
            year: 'numeric'
        });
    }
      // Fungsi untuk mendapatkan kelas warna status
    function getStatusClass(status) {
        const s = status.toLowerCase();
        if (s.includes("belum bayar")) return 'status-unpaid';
        if (s.includes("dikonfirmasi") || s.includes("confirmed")) return 'status-confirmed';
        if (s.includes("menunggu pembayaran") || s.includes("pending payment") || s.includes("dipesan")) return 'status-pending';
        if (s.includes("selesai") || s.includes("completed") || s.includes("check-out")) return 'status-completed';
        if (s.includes("dibatalkan") || s.includes("cancelled")) return 'status-cancelled';
        if (s.includes("menunggu konfirmasi") || s.includes("check-in")) return 'status-pending';
        return 'text-[var(--text-muted-color)]';
    }    // Fungsi untuk menentukan status pembayaran yang tepat
    function getPaymentStatus(reservation) {
        // Jika ada status pembayaran dari database pembayaran, gunakan itu
        if (reservation.status_pembayaran) {
            return reservation.status_pembayaran;
        }
        
        // Jika tidak ada data pembayaran, cek berdasarkan status reservasi
        const statusReservasi = reservation.status_reservasi.toLowerCase();
        
        if (statusReservasi === 'belum bayar') {
            return 'Belum Bayar';
        } else if (statusReservasi === 'dikonfirmasi' || statusReservasi === 'check-in' || statusReservasi === 'check-out' || statusReservasi === 'selesai') {
            return 'Lunas';
        } else if (statusReservasi === 'menunggu konfirmasi') {
            return 'Menunggu Verifikasi';
        } else if (statusReservasi === 'dibatalkan') {
            return 'Dibatalkan';
        }
        
        // Default jika tidak bisa ditentukan
        return 'Belum Bayar';
    }

    // Fungsi untuk mendapatkan CSS class untuk status pembayaran
    function getPaymentStatusClass(status) {
        const s = status.toLowerCase();
        if (s.includes('lunas')) return 'status-lunas';
        if (s.includes('belum bayar') || s.includes('belum lunas')) return 'status-belum-bayar';
        if (s.includes('menunggu verifikasi') || s.includes('menunggu konfirmasi')) return 'status-pending';
        if (s.includes('dibatalkan')) return 'status-cancelled';
        return 'status-belum-bayar'; // default
    }
    function getRoomImageUrl(tipeKamar) {
        const roomImages = {
            'Standard': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400',
            'Superior': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400',
            'Deluxe': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400',
            'Suite': 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400',
            'Family': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400'
        };

        return roomImages[tipeKamar] || roomImages['Standard'];
    }// Fungsi untuk mengambil data reservasi dari server
    async function fetchUserReservations(userId) {
        try {
            console.log('Fetching reservations for user ID:', userId);
            
            const response = await fetch(`/api/reservasi/tamu/${userId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('API Response:', result);
            
            return result.data || [];
        } catch (error) {
            console.error('Error fetching reservations:', error);
            throw error;
        }
    }    // Fungsi untuk menampilkan reservasi pengguna
    async function displayUserReservations() {
        console.log('displayUserReservations called');
        console.log('reservationsListContainer:', !!reservationsListContainer);
        console.log('currentUser:', currentUser);
        
        if (!reservationsListContainer) {
            console.error('reservationsListContainer not found');
            if (loadingMessage) loadingMessage.textContent = "Gagal memuat kontainer reservasi.";
            return;
        }
          if (!currentUser) {
            console.error('currentUser is null or undefined');
            if (loadingMessage) loadingMessage.textContent = "Gagal memuat data pengguna. Silakan login ulang.";
            return;
        }
        
        // Try to find user ID with various possible keys
        const userId = currentUser.id_tamu || currentUser.id || currentUser.userId || currentUser.user_id;
        
        if (!userId) {
            console.error('User ID not found in currentUser:', currentUser);
            // Show debug info
            const debugInfo = `
                Available keys: ${Object.keys(currentUser).join(', ')}
                currentUser: ${JSON.stringify(currentUser)}
            `;
            console.error('Debug info:', debugInfo);
            if (loadingMessage) loadingMessage.textContent = "ID Tamu tidak ditemukan. Data: " + JSON.stringify(currentUser);
            return;
        }
        
        console.log('Using user ID:', userId);        try {
            console.log('Fetching reservations for user ID:', userId);
            // Fetch data dari database
            const userReservations = await fetchUserReservations(userId);
            
            // Store all reservations
            allReservations = userReservations;
            
            // Apply filter and display
            applyFilterAndDisplay();
            
        } catch (error) {
            console.error('Error fetching reservations:', error);
            if (loadingMessage) {
                loadingMessage.textContent = "Gagal memuat data reservasi. Silakan coba lagi.";
                loadingMessage.style.display = 'block';
            }
        }
    }

    // Event delegation untuk tombol aksi
    reservationsListContainer.addEventListener('click', function(event) {
        const target = event.target;
        const reservationId = target.dataset.id;

        if (target.classList.contains('btn-detail')) {
            showReservationDetail(reservationId);
        } else if (target.classList.contains('btn-cancel')) {
            cancelReservation(reservationId);
        } else if (target.classList.contains('btn-pay')) {
            processPayment(reservationId);
        }
    });    // Fungsi untuk menampilkan detail reservasi
    async function showReservationDetail(reservationId) {
        console.log('🔍 Opening detail for reservation:', reservationId);
        
        // Find reservation data
        const reservation = allReservations.find(res => res.id_reservasi == reservationId);
        if (!reservation) {
            alert('Data reservasi tidak ditemukan.');
            return;
        }        // Show modal
        const modal = document.getElementById('reservationDetailModal');
        const modalLoading = document.getElementById('modalLoading');
        const modalDetails = document.getElementById('modalDetails');
        
        openModal();
        modalLoading.classList.remove('hidden');
        modalDetails.classList.add('hidden');        try {
            // Fetch detailed reservation data from API
            const response = await fetch(`/api/reservasi/detail/${reservationId}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const detailData = await response.json();
            console.log('📋 Detail data received:', detailData);

            // Populate modal with detailed information
            populateReservationModal(detailData.data || reservation);
            
        } catch (error) {
            console.error('❌ Error fetching reservation details:', error);
            // Use basic data if API fails
            populateReservationModal(reservation);
        } finally {
            modalLoading.classList.add('hidden');
            modalDetails.classList.remove('hidden');
        }
    }// Fungsi untuk membatalkan reservasi
    async function cancelReservation(reservationId) {
        if (!confirm(`Apakah Anda yakin ingin membatalkan reservasi ID ${reservationId}?\n\nPerhatian: Pembatalan mungkin dikenakan biaya sesuai kebijakan hotel.`)) {
            return;
        }

        // Ask for cancellation reason
        const alasanPembatalan = prompt('Mohon berikan alasan pembatalan (opsional):');

        try {
            console.log('Cancelling reservation:', reservationId);
            
            const response = await fetch(`/api/reservasi/${reservationId}/cancel`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    alasan_pembatalan: alasanPembatalan
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Cancellation successful:', result);
            
            alert(`Reservasi ID ${reservationId} telah berhasil dibatalkan.\n\nStatus: Dibatalkan\nWaktu: ${new Date().toLocaleString('id-ID')}`);
            
            // Refresh the reservations list
            await displayUserReservations();
        } catch (error) {
            console.error('Error cancelling reservation:', error);
            alert(`Gagal membatalkan reservasi: ${error.message}\n\nSilakan coba lagi atau hubungi customer service.`);
        }
    }// Fungsi untuk melakukan pembayaran
    function processPayment(reservationId) {
        console.log('Processing payment for reservation:', reservationId);
        // Redirect to payment page with reservation ID
        window.location.href = `/tamu/pembayaran.html?reservation=${reservationId}`;
    }// Panggil fungsi untuk menampilkan reservasi
    console.log('reservasi-saya.js: Calling displayUserReservations...');
    try {
        await displayUserReservations();
        console.log('reservasi-saya.js: displayUserReservations completed successfully');
    } catch (error) {
        console.error('reservasi-saya.js: Error in displayUserReservations:', error);
        if (loadingMessage) {
            loadingMessage.textContent = "Terjadi kesalahan saat memuat data. Silakan refresh halaman.";
            loadingMessage.style.display = 'block';
        }
    }

    // Jika ada hash di URL (misalnya dari halaman buat-reservasi), scroll ke elemen tersebut
    if(window.location.hash) {
        const targetId = window.location.hash.substring(1);
        const targetElement = document.getElementById(targetId);
        if(targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
            // Tambahkan highlight sementara
            targetElement.classList.add('ring-2', 'ring-[var(--primary-color)]', 'ring-offset-2', 'ring-offset-[var(--background-color)]');
            setTimeout(() => {
                targetElement.classList.remove('ring-2', 'ring-[var(--primary-color)]', 'ring-offset-2', 'ring-offset-[var(--background-color)]');
            }, 3000);
        }
    }    // Function to apply filter and display reservations
    function applyFilterAndDisplay() {
        const hideCancelled = hideCancelledCheckbox && hideCancelledCheckbox.checked;
        
        // Filter reservations based on checkbox
        if (hideCancelled) {
            filteredReservations = allReservations.filter(res => 
                res.status_reservasi.toLowerCase() !== 'dibatalkan'
            );
        } else {
            filteredReservations = allReservations;
        }
        
        // Update count
        updateReservationCount(filteredReservations.length);
        
        displayReservations(filteredReservations);
    }

    // Function to update reservation count
    function updateReservationCount(count) {
        const countElement = document.getElementById('reservationCount');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    // Function to display reservations
    function displayReservations(reservations) {
        if (loadingMessage) loadingMessage.style.display = 'none';
        reservationsListContainer.innerHTML = '';

        if (reservations.length > 0) {
            if (noReservationsMessage) noReservationsMessage.style.display = 'none';            reservations.forEach((res, index) => {
                const reservationCard = `
                    <div class="reservation-card p-6 rounded-xl shadow-lg flex flex-col lg:flex-row gap-6 transition-all duration-300 hover:shadow-2xl" id="reservation-${res.id_reservasi}" style="animation-delay: ${index * 0.1}s">
                        <div class="lg:w-1/3 flex-shrink-0">
                            <div class="relative group">
                                <img src="${getRoomImageUrl(res.tipe_kamar)}" 
                                     alt="Kamar ${res.tipe_kamar}" 
                                     class="w-full h-48 lg:h-56 rounded-xl object-cover shadow-md group-hover:shadow-lg transition-shadow duration-300"
                                     loading="lazy"
                                     onerror="this.src='https://images.unsplash.com/photo-1540518614846-7eded47ee3b7?w=300&h=200&fit=crop&crop=center'">
                                <div class="absolute top-3 left-3 bg-[var(--primary-color)] text-white px-3 py-1 rounded-full text-xs font-semibold">
                                    ${res.tipe_kamar}
                                </div>
                            </div>
                        </div>
                        <div class="flex-1 flex flex-col">
                            <div class="flex flex-col sm:flex-row justify-between items-start mb-4">
                                <div class="flex-1">
                                    <h2 class="text-2xl lg:text-3xl font-bold text-[var(--primary-color)] mb-2">${res.tipe_kamar}</h2>
                                    <div class="flex items-center gap-2 text-[var(--text-muted-color)] mb-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                        </svg>
                                        ${res.no_kamar && ['dikonfirmasi','check-in','selesai','check-out'].includes(res.status_reservasi.toLowerCase()) ? `<span class="font-medium">Kamar ${res.no_kamar}</span>` : ''}
                                    </div>
                                    <div class="flex items-center gap-2 text-[var(--text-muted-color)] text-sm">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path>
                                        </svg>
                                        <span class="font-mono">#${res.id_reservasi}</span>
                                    </div>
                                </div>
                                <div class="mt-3 sm:mt-0 sm:ml-4">
                                    <span class="${getStatusClass(res.status_reservasi)} font-semibold text-xs py-2 px-4 rounded-full border-2 border-current bg-opacity-10 backdrop-blur-sm">
                                        ${res.status_reservasi}
                                    </span>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div class="bg-[var(--input-bg-color)] p-4 rounded-lg border border-[var(--input-border-color)]">
                                    <h4 class="text-[var(--primary-color)] font-semibold mb-3 flex items-center gap-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        Detail Menginap
                                    </h4>
                                    <div class="space-y-2 text-sm">
                                        <div class="flex justify-between">
                                            <span class="text-[var(--text-muted-color)]">Check-in:</span>
                                            <span class="text-[var(--text-color)] font-medium">${formatDate(res.tanggal_checkin)}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-[var(--text-muted-color)]">Check-out:</span>
                                            <span class="text-[var(--text-color)] font-medium">${formatDate(res.tanggal_checkout)}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-[var(--text-muted-color)]">Durasi:</span>
                                            <span class="text-[var(--text-color)] font-medium">${res.durasi_menginap} malam</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-[var(--text-muted-color)]">Jumlah Tamu:</span>
                                            <span class="text-[var(--text-color)] font-medium">${res.jumlah_tamu} orang</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="bg-[var(--input-bg-color)] p-4 rounded-lg border border-[var(--input-border-color)]">
                                    <h4 class="text-[var(--primary-color)] font-semibold mb-3 flex items-center gap-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                        </svg>
                                        Informasi Pembayaran
                                    </h4>                                    <div class="space-y-2 text-sm">
                                        <div class="flex justify-between">
                                            <span class="text-[var(--text-muted-color)]">Subtotal:</span>
                                            <span class="text-[var(--text-color)] font-medium">${formatCurrency(res.subtotal || (res.harga * (res.durasi_menginap || 1)))}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-[var(--text-muted-color)]">PPN (10%):</span>
                                            <span class="text-[var(--text-color)] font-medium">${formatCurrency(res.ppn || ((res.harga * (res.durasi_menginap || 1)) * 0.1))}</span>
                                        </div>
                                        <div class="flex justify-between items-center border-t border-[var(--input-border-color)] pt-2">
                                            <span class="text-[var(--text-muted-color)] font-semibold">Total Biaya:</span>
                                            <span class="text-[var(--primary-color)] font-bold text-lg">${formatCurrency(res.total_biaya)}</span>
                                        </div>
                                        ${res.status_pembayaran ? `
                                            <div class="flex justify-between">
                                                <span class="text-[var(--text-muted-color)]">Status Pembayaran:</span>
                                                <span class="text-[var(--text-color)] font-medium">${res.status_pembayaran}</span>
                                            </div>
                                        ` : ''}
                                        ${res.metode_pembayaran ? `
                                            <div class="flex justify-between">
                                                <span class="text-[var(--text-muted-color)]">Metode Pembayaran:</span>
                                                <span class="text-[var(--text-color)] font-medium">${res.metode_pembayaran}</span>
                                            </div>
                                        ` : ''}
                                        <div class="flex justify-between">
                                            <span class="text-[var(--text-muted-color)]">Tanggal Pesan:</span>
                                            <span class="text-[var(--text-color)] font-medium">${formatDate(res.tanggal_reservasi)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                              
                            <div class="flex flex-wrap gap-3 pt-4 border-t border-[var(--input-border-color)] mt-auto">
                                <button data-id="${res.id_reservasi}" class="btn-detail btn-outline-primary flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-300 hover:transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-2 focus:ring-offset-[var(--background-color)]">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Lihat Detail
                                </button>
                                ${shouldShowPayButton(res) ? 
                                    `<button data-id="${res.id_reservasi}" class="btn-pay btn-primary flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-300 hover:transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-2 focus:ring-offset-[var(--background-color)]">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                                        </svg>
                                        Bayar Sekarang
                                    </button>` : ''}
                                ${!(res.status_reservasi.toLowerCase().includes("selesai") || 
                                    res.status_reservasi.toLowerCase().includes("dibatalkan") ||
                                    res.status_reservasi.toLowerCase().includes("check-in")) ? 
                                    `<button data-id="${res.id_reservasi}" class="btn-cancel btn-danger flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-300 hover:transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[var(--background-color)]">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                        </svg>
                                        Batalkan
                                    </button>` : ''}
                            </div>
                        </div>
                    </div>
                `;
                reservationsListContainer.insertAdjacentHTML('beforeend', reservationCard);
            });        } else {
            if (noReservationsMessage) {
                // Update message based on filter status
                const hideCancelled = hideCancelledCheckbox && hideCancelledCheckbox.checked;
                const messageText = hideCancelled ? 
                    "Tidak ada reservasi aktif" :
                    "Belum Ada Reservasi";
                const messageDesc = hideCancelled ?
                    "Semua reservasi aktif Anda akan muncul di sini. Reservasi yang dibatalkan saat ini disembunyikan." :
                    "Anda belum melakukan pemesanan kamar di hotel kami. Jelajahi kamar-kamar mewah kami dan buat reservasi pertama Anda.";
                
                const messageElement = noReservationsMessage.querySelector('h3');
                const descElement = noReservationsMessage.querySelector('p');
                if (messageElement) {
                    messageElement.textContent = messageText;
                }
                if (descElement) {
                    descElement.textContent = messageDesc;
                }
                
                noReservationsMessage.style.display = 'block';
            }
        }
    }    // Event listener for hideCancelledReservations checkbox
    if (hideCancelledCheckbox) {
        hideCancelledCheckbox.addEventListener('change', applyFilterAndDisplay);
    }

    // Event listener for refresh button
    const refreshButton = document.getElementById('refreshReservations');
    if (refreshButton) {
        refreshButton.addEventListener('click', async () => {
            // Show loading state
            if (loadingMessage) {
                loadingMessage.style.display = 'block';
                loadingMessage.innerHTML = `
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)] mx-auto mb-4"></div>
                    <p class="text-[var(--text-muted-color)] text-lg">Memuat ulang data reservasi...</p>
                `;
            }
            
            // Hide reservations container temporarily
            if (reservationsListContainer) {
                reservationsListContainer.innerHTML = '';
            }
            
            // Hide no reservations message
            if (noReservationsMessage) {
                noReservationsMessage.style.display = 'none';
            }
            
            // Refresh data
            try {
                await displayUserReservations();
            } catch (error) {
                console.error('Error refreshing reservations:', error);
                if (loadingMessage) {
                    loadingMessage.innerHTML = `
                        <div class="text-center py-8">
                            <div class="text-red-500 mb-4">
                                <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                </svg>
                            </div>
                            <p class="text-[var(--text-muted-color)] text-lg">Gagal memuat ulang data. Silakan coba lagi.</p>
                        </div>
                    `;
                }
            }
        });
    }    // Function to determine if "Bayar Sekarang" button should be shown
    function shouldShowPayButton(reservasi) {
        const statusReservasi = reservasi.status_reservasi.toLowerCase();
        const statusPembayaran = getPaymentStatus(reservasi);
        
        // Show button ONLY for "Belum Bayar" status
        if (statusReservasi !== 'belum bayar' && statusPembayaran !== 'Belum Bayar') {
            return false;
        }
        
        // Don't show button if payment is already completed (Lunas)
        if (statusPembayaran === 'Lunas') {
            return false;
        }
        
        // Don't show button if reservation is cancelled
        if (statusReservasi === 'dibatalkan') {
            return false;
        }
        
        // Show button for "Belum Bayar" status and not paid yet
        return statusPembayaran === 'Belum Bayar' || statusPembayaran === 'Belum Lunas';
    }

    // Fungsi untuk mengisi modal dengan data detail reservasi
    function populateReservationModal(reservation) {
        const modalDetails = document.getElementById('modalDetails');
        
        // Get room image
        const getRoomImage = (tipe) => {
            const roomImages = {
                'Standard': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400',
                'Superior': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400',
                'Deluxe': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400',
                'Suite': 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400',
                'Family': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400'
            };
            return roomImages[tipe] || roomImages['Standard'];
        };

        // Get room amenities
        const getRoomAmenities = (tipe) => {
            const amenities = {
                'Standard': ['AC', 'TV', 'Kamar Mandi Pribadi', 'WiFi Gratis'],
                'Superior': ['AC', 'TV LED', 'Kamar Mandi Pribadi', 'WiFi Gratis', 'Mini Bar', 'Balkon'],
                'Deluxe': ['AC', 'TV LED 42"', 'Kamar Mandi Mewah', 'WiFi Gratis', 'Mini Bar', 'Balkon Pribadi', 'Sofa'],
                'Suite': ['AC', 'TV LED 55"', 'Kamar Mandi Mewah', 'WiFi Gratis', 'Mini Bar', 'Balkon Pribadi', 'Ruang Tamu', 'Kitchenette'],
                'Family': ['AC', 'TV LED', 'Kamar Mandi Pribadi', 'WiFi Gratis', 'Kasur Susun', 'Area Bermain', 'Mini Bar']
            };
            return amenities[tipe] || amenities['Standard'];
        };

        const roomImage = getRoomImage(reservation.tipe_kamar);
        const amenities = getRoomAmenities(reservation.tipe_kamar);
        
        // Calculate nights
        const checkinDate = new Date(reservation.tanggal_checkin);
        const checkoutDate = new Date(reservation.tanggal_checkout);
        const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
        
        // Format dates
        const formatDate = (dateString) => {
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            return new Date(dateString).toLocaleDateString('id-ID', options);
        };

        modalDetails.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Room Information -->
                <div class="detail-section">
                    <h3 class="text-lg font-semibold text-[var(--primary-color)] mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                        Informasi Kamar
                    </h3>
                    
                    <div class="mb-4">
                        <img src="${roomImage}" alt="Kamar ${reservation.tipe_kamar}" class="w-full h-48 object-cover rounded-lg mb-3">
                        <h4 class="text-xl font-bold text-[var(--text-color)] mb-2">Kamar ${reservation.tipe_kamar}</h4>
                        ${reservation.no_kamar && ['dikonfirmasi','check-in','selesai','check-out'].includes(reservation.status_reservasi.toLowerCase()) ? `<p class="text-[var(--text-muted-color)] mb-2">Nomor Kamar: ${reservation.no_kamar}</p>` : ''}
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">Tipe Kamar:</span>
                        <span class="detail-value">${reservation.tipe_kamar}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Kapasitas:</span>
                        <span class="detail-value">${reservation.jumlah_tamu} Tamu</span>
                    </div>                    <div class="detail-item">
                        <span class="detail-label">Harga per Malam:</span>
                        <span class="detail-value">${formatCurrency(reservation.harga || 0)}</span>
                    </div>
                      <div class="mt-4">
                        <h5 class="text-sm font-semibold text-[var(--primary-color)] mb-2">Fasilitas Kamar:</h5>
                        <div class="flex flex-wrap gap-2">
                            ${amenities.map(amenity => `
                                <span class="amenity-badge">
                                    ${amenity}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Reservation Details -->
                <div class="detail-section">
                    <h3 class="text-lg font-semibold text-[var(--primary-color)] mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                        Detail Reservasi
                    </h3>
                    
                    <div class="detail-item">
                        <span class="detail-label">ID Reservasi:</span>
                        <span class="detail-value">#${reservation.id_reservasi}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value">
                            <span class="status-badge ${getStatusClass(reservation.status_reservasi)}">
                                ${reservation.status_reservasi}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status Pembayaran:</span>
                        <span class="detail-value">
                            <span class="status-badge ${getPaymentStatusClass(getPaymentStatus(reservation))}">
                                ${getPaymentStatus(reservation)}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Tanggal Pemesanan:</span>
                        <span class="detail-value">${formatDate(reservation.tanggal_reservasi)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Check-in:</span>
                        <span class="detail-value">${formatDate(reservation.tanggal_checkin)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Check-out:</span>
                        <span class="detail-value">${formatDate(reservation.tanggal_checkout)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Durasi Menginap:</span>
                        <span class="detail-value">${nights} malam</span>
                    </div>
                    ${reservation.permintaan_khusus ? `
                    <div class="detail-item">
                        <span class="detail-label">Permintaan Khusus:</span>
                        <span class="detail-value">${reservation.permintaan_khusus}</span>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- Payment Information -->
            <div class="detail-section">
                <h3 class="text-lg font-semibold text-[var(--primary-color)] mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                    </svg>
                    Informasi Pembayaran
                </h3>                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="detail-item">
                        <span class="detail-label">Subtotal:</span>
                        <span class="detail-value">${formatCurrency(reservation.subtotal || ((reservation.harga || 0) * nights))}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Pajak (PPN 10%):</span>
                        <span class="detail-value">${formatCurrency(reservation.ppn || ((reservation.harga || 0) * nights * 0.1))}</span>
                    </div>
                    <div class="detail-item border-t-2 border-[var(--primary-color)] pt-2">
                        <span class="detail-label text-lg font-bold">Total:</span>
                        <span class="detail-value text-lg font-bold text-[var(--primary-color)]">
                            ${formatCurrency(reservation.total_biaya || ((reservation.harga || 0) * nights * 1.1))}
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status Pembayaran:</span>
                        <span class="detail-value">
                            <span class="status-badge ${getPaymentStatusClass(getPaymentStatus(reservation))}">
                                ${getPaymentStatus(reservation)}
                            </span>
                        </span>
                    </div>
                </div>
                
                ${reservation.metode_pembayaran ? `
                <div class="mt-4 p-3 bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 rounded-lg">
                    <p class="text-blue-400 text-sm">
                        <strong>Metode Pembayaran:</strong> ${reservation.metode_pembayaran}
                    </p>
                </div>
                ` : ''}
                
                ${reservation.tanggal_pembayaran ? `
                <div class="mt-4 p-3 bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30 rounded-lg">
                    <p class="text-green-400 text-sm">
                        <strong>Pembayaran berhasil pada:</strong> ${formatDate(reservation.tanggal_pembayaran)}
                    </p>
                </div>
                ` : ''}
                
                ${getPaymentStatus(reservation) === 'Belum Bayar' ? `
                <div class="mt-4 p-3 bg-yellow-500 bg-opacity-10 border border-yellow-500 border-opacity-30 rounded-lg">
                    <p class="text-yellow-400 text-sm">
                        <strong>Info:</strong> Silakan lakukan pembayaran untuk mengkonfirmasi reservasi Anda.
                    </p>
                </div>
                ` : ''}
                
                ${getPaymentStatus(reservation) === 'Menunggu Verifikasi' ? `
                <div class="mt-4 p-3 bg-orange-500 bg-opacity-10 border border-orange-500 border-opacity-30 rounded-lg">
                    <p class="text-orange-400 text-sm">
                        <strong>Info:</strong> Pembayaran Anda sedang dalam proses verifikasi. Mohon tunggu konfirmasi dari pihak hotel.
                    </p>
                </div>
                ` : ''}
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap gap-3 pt-4 border-t border-[var(--input-border-color)] justify-end">
                <button id="closeModalBtn2" class="btn-secondary px-4 py-2 rounded-lg font-medium">
                    Tutup
                </button>
                ${shouldShowPayButton(reservation) ? `
                <button onclick="processPayment('${reservation.id_reservasi}')" class="btn-primary px-4 py-2 rounded-lg font-medium">
                    Bayar Sekarang
                </button>
                ` : ''}
                ${!(reservation.status_reservasi.toLowerCase().includes("selesai") || 
                    reservation.status_reservasi.toLowerCase().includes("dibatalkan") ||
                    reservation.status_reservasi.toLowerCase().includes("check-in")) ? `
                <button onclick="cancelReservation('${reservation.id_reservasi}')" class="btn-danger px-4 py-2 rounded-lg font-medium">
                    Batalkan Reservasi
                </button>
                ` : ''}
            </div>
        `;
    }

    // Event listeners untuk modal
    const modal = document.getElementById('reservationDetailModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    
    // Close modal event listeners
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal?.classList.contains('hidden')) {
            closeModal();
        }
    });
    
    // Delegate event listener for close button in modal content
    document.addEventListener('click', (e) => {
        if (e.target.id === 'closeModalBtn2') {
            closeModal();
        }
    });
    
    function closeModal() {
        const modal = document.getElementById('reservationDetailModal');
        modal?.classList.add('hidden');
        document.body.style.overflow = 'auto'; // Re-enable scrolling
    }
    
    function openModal() {
        const modal = document.getElementById('reservationDetailModal');
        modal?.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Disable background scrolling
    }

    // Patch: pastikan status_pembayaran di detail sama dengan list utama jika tidak ada
    if (!('status_pembayaran' in reservation) && allReservations && Array.isArray(allReservations)) {
        const fromList = allReservations.find(r => r.id_reservasi == reservation.id_reservasi);
        if (fromList && fromList.status_pembayaran) {
            reservation.status_pembayaran = fromList.status_pembayaran;
        }
    }
    // ...existing code...
});
