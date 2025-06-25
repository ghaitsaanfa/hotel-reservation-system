document.addEventListener('DOMContentLoaded', async () => {
    console.log('buat-reservasi.js: Script loaded with multi-room support');

    // Check if user is logged in
    if (typeof isUserLoggedIn !== 'function' || !isUserLoggedIn()) {
        alert("Anda harus login untuk membuat reservasi.");
        const targetUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?redirect=${targetUrl}`;
        return;
    }

    const currentUser = getLoggedInUser();
    if (!currentUser || currentUser.role !== 'tamu') {
        alert("Hanya tamu yang dapat membuat reservasi.");
        window.location.href = '/login.html?role=tamu';
        return;
    }

    // DOM Elements
    const roomDetailsPlaceholder = document.getElementById('room-details-placeholder');
    const roomDetailsContent = document.getElementById('room-details-content');
    const reservationForm = document.getElementById('reservation-form');
    const formMessage = document.getElementById('form-message');
    const guestNameInput = document.getElementById('guest-name');
    const guestEmailInput = document.getElementById('guest-email');
    const guestPhoneInput = document.getElementById('guest-phone');
    const specialRequestsInput = document.getElementById('special-requests');

    // New elements for multi-room display
    const selectedRoomsContainer = document.getElementById('selected-rooms-container');
    const bookingSummaryContainer = document.getElementById('booking-summary-container');
    const totalCostDisplay = document.getElementById('total-cost-display');

    // Global variables
    let bookingData = null;
    let totalCost = 0;

    // Format currency function
    function formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }    // Get room image based on type - consistent with kamar.js
    function getRoomImage(tipe) {
        const roomImages = {
            'Standard': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400',
            'Superior': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400',
            'Deluxe': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400',
            'Suite': 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400',
            'Family': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400'
        };
        
        return roomImages[tipe] || roomImages['Standard'];
    }

    // Get room amenities based on type
    function getRoomAmenities(tipe) {
        const amenities = {
            'Standard': ['AC', 'TV', 'Kamar Mandi Pribadi', 'WiFi Gratis'],
            'Superior': ['AC', 'TV LED', 'Kamar Mandi Pribadi', 'WiFi Gratis', 'Mini Bar', 'Balkon'],
            'Deluxe': ['AC', 'TV LED 43"', 'Kamar Mandi Pribadi', 'WiFi Gratis', 'Mini Bar', 'Balkon', 'Sofa', 'Meja Kerja'],
            'Suite': ['AC', 'TV LED 55"', 'Kamar Mandi Pribadi', 'WiFi Gratis', 'Mini Bar', 'Balkon', 'Ruang Tamu', 'Meja Kerja', 'Bathub', 'Room Service 24 Jam']
        };
        return amenities[tipe] || amenities['Standard'];
    }

    // Get room amenities based on type
    function getRoomAmenities(tipe) {
        const amenities = {
            'Standard': ['AC', 'TV', 'Kamar Mandi Pribadi', 'WiFi Gratis'],
            'Superior': ['AC', 'TV LED', 'Kamar Mandi Pribadi', 'WiFi Gratis', 'Mini Bar', 'Balkon'],
            'Deluxe': ['AC', 'TV LED 42"', 'Kamar Mandi Mewah', 'WiFi Gratis', 'Mini Bar', 'Balkon Pribadi', 'Sofa'],
            'Suite': ['AC', 'TV LED 55"', 'Kamar Mandi Mewah', 'WiFi Gratis', 'Mini Bar', 'Balkon Pribadi', 'Ruang Tamu', 'Kitchenette'],
            'Family': ['AC', 'TV LED', 'Kamar Mandi Pribadi', 'WiFi Gratis', 'Kasur Susun', 'Area Bermain', 'Mini Bar']
        };
        return amenities[tipe] || ['AC', 'TV', 'Kamar Mandi Pribadi', 'WiFi Gratis'];
    }    // Load booking data from sessionStorage or URL parameters
    function loadBookingData() {
        // Try to get booking data from sessionStorage
        const storedBookingData = sessionStorage.getItem('bookingData');
        
        if (storedBookingData) {
            const singleRoomBooking = JSON.parse(storedBookingData);
            sessionStorage.removeItem('bookingData'); // Clean up
            
            console.log('📋 Loaded single room booking data:', singleRoomBooking);
            
            // Convert single room booking to the expected format
            if (singleRoomBooking.roomId && singleRoomBooking.checkinDate && singleRoomBooking.checkoutDate) {                bookingData = {
                    checkin: singleRoomBooking.checkinDate,
                    checkout: singleRoomBooking.checkoutDate,
                    nights: singleRoomBooking.nights || 1,
                    rooms: {
                        [singleRoomBooking.roomType]: {
                            quantity: 1,
                            price: singleRoomBooking.roomPrice,
                            roomId: singleRoomBooking.roomId,
                            roomNumber: singleRoomBooking.roomNumber,
                            roomType: singleRoomBooking.roomType, // Ensure room type is preserved
                            imageUrl: singleRoomBooking.imageUrl || getRoomImage(singleRoomBooking.roomType) // Use stored or generate image URL
                        }
                    }
                };
                
                console.log('🏨 Converted booking data with image:', bookingData);
                return true;
            }
        }
        
        // Try to get multi-room booking data
        const pendingBookingData = sessionStorage.getItem('pendingBookingData');
        if (pendingBookingData) {
            bookingData = JSON.parse(pendingBookingData);
            sessionStorage.removeItem('pendingBookingData'); // Clean up
            console.log('Loaded multi-room booking data:', bookingData);
            return true;
        }

        // Fallback: check for old single-room booking via URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('id_kamar');
        
        if (roomId) {
            console.log('Found single room ID in URL, redirecting to room selection...');
            alert('Silakan pilih tanggal dan kamar melalui halaman seleksi kamar.');
            window.location.href = '/tamu/kamar.html';
            return false;
        }

        // No booking data found
        console.log('No booking data found');
        return false;
    }

    // Display selected rooms
    function displaySelectedRooms() {
        if (!bookingData || !bookingData.rooms) {
            showNoRoomsMessage();
            return;
        }

        let roomsHTML = '';
        totalCost = 0;

        // Display booking dates
        const checkinDate = new Date(bookingData.checkin).toLocaleDateString('id-ID');
        const checkoutDate = new Date(bookingData.checkout).toLocaleDateString('id-ID');
        const nights = bookingData.nights;

        roomsHTML += `
            <div class="bg-[var(--input-bg-color)] border border-[var(--input-border-color)] rounded-lg p-4 mb-6">
                <h3 class="text-lg font-semibold text-[var(--primary-color)] mb-3">Booking Details</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <span class="text-[var(--text-muted-color)]">Check-in:</span>
                        <span class="text-[var(--text-color)] font-medium ml-2">${checkinDate}</span>
                    </div>
                    <div>
                        <span class="text-[var(--text-muted-color)]">Check-out:</span>
                        <span class="text-[var(--text-color)] font-medium ml-2">${checkoutDate}</span>
                    </div>
                    <div>
                        <span class="text-[var(--text-muted-color)]">Duration:</span>
                        <span class="text-[var(--text-color)] font-medium ml-2">${nights} malam</span>
                    </div>
                </div>
            </div>
        `;        // Display selected room types
        Object.entries(bookingData.rooms).forEach(([roomType, room]) => {
            if (room.quantity > 0) {
                const roomTotal = room.price * room.quantity * nights;
                totalCost += roomTotal;
                
                // Use the stored image URL or generate it from room type
                const imageUrl = room.imageUrl || getRoomImage(roomType);
                const amenities = getRoomAmenities(roomType);
                const amenitiesList = amenities.slice(0, 4).join(', '); // Show first 4 amenities

                console.log(`🖼️  Displaying room ${roomType} with image: ${imageUrl}`);

                roomsHTML += `
                    <div class="bg-[var(--card-bg-color)] border border-[var(--input-border-color)] rounded-lg p-6 mb-4">
                        <div class="flex flex-col md:flex-row gap-4">                            <div class="md:w-1/3">
                                <img src="${imageUrl}" 
                                     alt="Kamar ${roomType}" 
                                     class="w-full h-40 object-cover rounded-lg"
                                     onerror="this.src='https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400'; console.log('🔄 Fallback image loaded for ${roomType}');"
                                     onload="console.log('✅ Image loaded successfully: ${imageUrl}');">
                            </div>
                            <div class="md:w-2/3">
                                <div class="flex items-center gap-2 mb-2">
                                    <h4 class="text-xl font-semibold text-[var(--primary-color)]">Kamar ${roomType}</h4>
                                    ${room.roomNumber ? `<span class="text-sm text-[var(--text-muted-color)] bg-[var(--input-bg-color)] px-2 py-1 rounded">No. ${room.roomNumber}</span>` : ''}
                                </div>
                                <p class="text-[var(--text-muted-color)] text-sm mb-3">
                                    <span class="font-medium">Fasilitas:</span> ${amenitiesList}
                                </p>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p class="text-[var(--text-muted-color)]">Jumlah kamar: <span class="text-[var(--text-color)] font-medium">${room.quantity}</span></p>
                                        <p class="text-[var(--text-muted-color)]">Harga per malam: <span class="text-[var(--text-color)] font-medium">${formatCurrency(room.price)}</span></p>
                                    </div>
                                    <div>
                                        <p class="text-[var(--text-muted-color)]">Durasi: <span class="text-[var(--text-color)] font-medium">${nights} malam</span></p>
                                        <p class="text-[var(--primary-color)] font-semibold">Subtotal: ${formatCurrency(roomTotal)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        // Display total cost
        const tax = totalCost * 0.1; // 10% tax
        const grandTotal = totalCost + tax;

        roomsHTML += `
            <div class="bg-[var(--input-bg-color)] border border-[var(--input-border-color)] rounded-lg p-4 mt-6">
                <h3 class="text-lg font-semibold text-[var(--primary-color)] mb-3">Cost Summary</h3>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-[var(--text-muted-color)]">Subtotal:</span>
                        <span class="text-[var(--text-color)]">${formatCurrency(totalCost)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-[var(--text-muted-color)]">Pajak (10%):</span>
                        <span class="text-[var(--text-color)]">${formatCurrency(tax)}</span>
                    </div>
                    <div class="flex justify-between text-lg font-semibold pt-2 border-t border-[var(--input-border-color)]">
                        <span class="text-[var(--primary-color)]">Total:</span>
                        <span class="text-[var(--primary-color)]">${formatCurrency(grandTotal)}</span>
                    </div>
                </div>
            </div>
        `;

        selectedRoomsContainer.innerHTML = roomsHTML;
        
        // Store total for form submission
        totalCost = grandTotal;
        
        // Show content, hide placeholder
        roomDetailsPlaceholder.style.display = 'none';
        roomDetailsContent.style.display = 'block';
    }

    // Show no rooms message
    function showNoRoomsMessage() {
        roomDetailsPlaceholder.innerHTML = `
            <div class="text-center py-12">
                <p class="text-[var(--text-muted-color)] text-lg mb-4">No rooms selected for booking.</p>
                <a href="/tamu/kamar.html" class="btn-primary px-6 py-3 rounded-lg text-white font-semibold hover:bg-[#e08220] transition-colors">
                    Select Rooms
                </a>
            </div>
        `;
    }    // Handle form submission
    async function handleFormSubmission(event) {
        event.preventDefault();

        if (!bookingData) {
            showFormMessage('Error: No booking data found.', 'error');
            return;
        }

        // Validate form inputs
        const guestName = guestNameInput.value.trim();
        const guestEmail = guestEmailInput.value.trim();
        const guestPhone = guestPhoneInput.value.trim();

        if (!guestName) {
            showFormMessage('Nama lengkap harus diisi.', 'error');
            guestNameInput.focus();
            return;
        }

        if (!guestEmail) {
            showFormMessage('Alamat email harus diisi.', 'error');
            guestEmailInput.focus();
            return;
        }

        if (!guestPhone) {
            showFormMessage('Nomor telepon harus diisi.', 'error');
            guestPhoneInput.focus();
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(guestEmail)) {
            showFormMessage('Format email tidak valid.', 'error');
            guestEmailInput.focus();
            return;
        }// Prepare reservations data (one reservation per room)
        const reservations = [];        Object.entries(bookingData.rooms).forEach(([roomType, room]) => {
            if (room.quantity > 0) {
                for (let i = 0; i < room.quantity; i++) {
                    const reservationData = {
                        id_tamu: currentUser.id || currentUser.id_tamu,
                        tipe_kamar: roomType, // Use room type instead of specific room ID
                        tanggal_checkin: bookingData.checkin,
                        tanggal_checkout: bookingData.checkout,
                        jumlah_dewasa: 2, // Default to 2, could be made configurable
                        jumlah_anak: 0,
                        nama_tamu: guestName,
                        email_tamu: guestEmail,
                        telepon_tamu: guestPhone,
                        permintaan_khusus: specialRequestsInput.value.trim() || null,
                        status_reservasi: 'Belum Bayar'
                    };
                    
                    console.log(`📝 Creating reservation ${i + 1} for ${roomType}:`, reservationData);
                    reservations.push(reservationData);
                }
            }
        });
        
        if (reservations.length === 0) {
            throw new Error('No valid reservations to create.');
        }        try {
            showFormMessage('Memproses reservasi...', 'info');

            // Submit each reservation
            const results = [];
            for (const [index, reservation] of reservations.entries()) {
                console.log(`🚀 Sending reservation ${index + 1}/${reservations.length}:`, reservation);
                
                const response = await fetch('/api/reservasi', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token || ''}`
                    },
                    body: JSON.stringify(reservation)
                });

                console.log(`📡 Response ${index + 1}:`, {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error(`❌ Error response ${index + 1}:`, errorData);
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                console.log(`✅ Success ${index + 1}:`, result);
                results.push(result);
            }

            console.log('🎉 All reservations created successfully:', results);
            
            showFormMessage(`Reservasi berhasil dibuat! ${results.length} kamar telah dipesan.`, 'success');
            
            // Redirect to reservations page after a delay
            setTimeout(() => {
                window.location.href = '/tamu/reservasi-saya.html';
            }, 2000);

        } catch (error) {
            console.error('💥 Error creating reservations:', error);
            showFormMessage(`Gagal membuat reservasi: ${error.message}`, 'error');
        }
    }

    // Show form message
    function showFormMessage(message, type) {
        formMessage.textContent = message;
        formMessage.className = `text-sm mt-4 ${type === 'error' ? 'text-red-500' : type === 'success' ? 'text-green-500' : 'text-[var(--primary-color)]'}`;
        formMessage.style.display = 'block';
    }

    // Initialize
    if (loadBookingData()) {
        displaySelectedRooms();
        
        // Pre-fill guest information if available
        if (currentUser.nama_lengkap) guestNameInput.value = currentUser.nama_lengkap;
        if (currentUser.email) guestEmailInput.value = currentUser.email;
        if (currentUser.telepon) guestPhoneInput.value = currentUser.telepon;
        
        // Add form submission handler
        if (reservationForm) {
            reservationForm.addEventListener('submit', handleFormSubmission);
        }
    }

    console.log('buat-reservasi.js: Multi-room booking system initialized');
});
