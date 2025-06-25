document.addEventListener('DOMContentLoaded', async () => {
    // Ensure shared auth functions are available
    if (typeof isUserLoggedIn !== 'function' || 
        typeof getLoggedInUser !== 'function' ||
        typeof getAuthToken !== 'function' ||
        typeof logoutUser !== 'function') {
        console.error('Required authentication functions from shared/auth.js are not available.');
        alert('Error: Aplikasi tidak dapat memuat dengan benar. Fungsi autentikasi hilang.');
        return;
    }

    if (!isUserLoggedIn()) {
        alert("Akses ditolak. Anda harus login sebagai tamu.");
        const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?role=tamu&redirect=${redirectUrl}`;
        return;
    }

    const currentUser = getLoggedInUser();
    if (!currentUser || currentUser.role !== 'tamu') {
        alert("Akses ditolak. Halaman ini hanya untuk tamu.");
        logoutUser(); 
        const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?role=tamu&redirect=${redirectUrl}`;
        return;
    }

    // Force update login/logout buttons after successful authentication check
    console.log('kamar.js: Authentication successful, forcing UI update');
    if (typeof updateLoginLogoutButtons === 'function') {
        updateLoginLogoutButtons();
    } else {
        console.error('kamar.js: updateLoginLogoutButtons function not available');
    }    // DOM Elements
    const checkinDateInput = document.getElementById('checkin-date');
    const checkoutDateInput = document.getElementById('checkout-date');
    const roomTypeSelect = document.getElementById('room-type');
    const guestCountSelect = document.getElementById('guest-count');
    const applyFilterBtn = document.getElementById('apply-filter');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const roomsGrid = document.getElementById('rooms-grid');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    // Debug: Check if elements are found
    console.log('🔍 DOM Elements Check:');
    console.log('- loadingState:', loadingState);
    console.log('- emptyState:', emptyState);
    console.log('- roomsGrid:', roomsGrid);
    
    if (!loadingState || !emptyState || !roomsGrid) {
        console.error('❌ Critical DOM elements not found!');
        alert('Error: Required page elements not found. Please refresh the page.');
        return;
    }

    // Set minimum dates to today
    const today = new Date().toISOString().split('T')[0];
    checkinDateInput.min = today;
    checkoutDateInput.min = today;

    // Update checkout minimum date when checkin changes
    checkinDateInput.addEventListener('change', () => {
        const checkinDate = new Date(checkinDateInput.value);
        checkinDate.setDate(checkinDate.getDate() + 1);
        checkoutDateInput.min = checkinDate.toISOString().split('T')[0];
        
        if (checkoutDateInput.value && new Date(checkoutDateInput.value) <= new Date(checkinDateInput.value)) {
            checkoutDateInput.value = '';
        }
    });

    // Mobile menu toggle
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }    // Load all rooms initially
    console.log('🚀 Starting initial room load...');
    console.log('🔍 Initial state check:');
    console.log('- loadingState classes:', loadingState.className);
    console.log('- loadingState display:', getComputedStyle(loadingState).display);
    console.log('- roomsGrid classes:', roomsGrid.className);
    console.log('- roomsGrid display:', getComputedStyle(roomsGrid).display);
    
    await loadAllRooms();
    
    // Fallback: Force hide loading after 3 seconds if still visible
    setTimeout(() => {
        if (loadingState && !loadingState.classList.contains('hidden')) {
            console.log('⚠️ Fallback: Force hiding loading state after timeout');
            hideLoading();
        }
    }, 3000);

    // Filter functionality
    applyFilterBtn.addEventListener('click', async () => {
        const checkinDate = checkinDateInput.value;
        const checkoutDate = checkoutDateInput.value;
        const roomType = roomTypeSelect.value;
        const guestCount = parseInt(guestCountSelect.value);        if (!checkinDate || !checkoutDate) {
            alert('Silakan pilih tanggal check-in dan check-out terlebih dahulu.');
            return;
        }

        if (new Date(checkinDate) >= new Date(checkoutDate)) {
            alert('Tanggal check-out harus setelah tanggal check-in.');
            return;
        }

        // Add visual feedback to button
        const originalText = applyFilterBtn.textContent;
        applyFilterBtn.disabled = true;
        applyFilterBtn.textContent = 'Mencari...';

        try {
            await loadAvailableRooms(checkinDate, checkoutDate, roomType, guestCount);
        } finally {
            // Restore button state
            applyFilterBtn.disabled = false;
            applyFilterBtn.textContent = originalText;
        }
    });    async function loadAllRooms() {
        try {
            console.log('🔄 Loading all rooms...');

            const response = await fetch('/api/kamar/all');
            
            if (!response.ok) {
                console.error('❌ Response not ok:', response.status, response.statusText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('📊 API Response:', result);

            if (result.data && Array.isArray(result.data)) {
                // Group by tipe kamar, only show one card per type
                const tipeMap = {};
                result.data.forEach(room => {
                    if (!tipeMap[room.tipe]) {
                        tipeMap[room.tipe] = room;
                    }
                });
                const representativeRooms = Object.values(tipeMap);
                console.log('✅ Found room types:', representativeRooms.length);
                displayRooms(representativeRooms, false); // false = not filtered by availability
            } else {
                console.error('❌ Invalid data format:', result);
                throw new Error(result.message || 'Failed to load rooms');
            }
        } catch (error) {
            console.error('❌ Error loading rooms:', error);
            hideLoading(); // Ensure loading is hidden on error
            showEmpty();
        }
    }async function loadAvailableRooms(checkinDate, checkoutDate, roomType = '', guestCount = 1) {
        try {
            // Show loading briefly only for search operations
            showLoading();
            console.log('🔍 Mencari kamar tersedia...', { checkinDate, checkoutDate, roomType, guestCount });

            const params = new URLSearchParams({
                checkin: checkinDate,
                checkout: checkoutDate
            });

            if (roomType) params.append('tipe', roomType);

            console.log('📡 Sending request to:', `/api/kamar/available?${params}`);
            const response = await fetch(`/api/kamar/available?${params}`);
            
            console.log('📡 Response status:', response.status);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('📡 Response error:', errorText);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log('📡 Response data:', result);

            // Add minimum loading time for better UX (300ms)
            await new Promise(resolve => setTimeout(resolve, 300));

            if (result.data && Array.isArray(result.data)) {
                // Filter by guest count
                const filteredRooms = result.data.filter(room => 
                    parseInt(room.kapasitas_maks) >= guestCount
                );
                
                console.log('🏨 Filtered rooms:', filteredRooms.length);
                displayRooms(filteredRooms, true, { checkinDate, checkoutDate }); // true = filtered by availability
            } else {
                console.error('❌ Invalid response format:', result);
                throw new Error(result.message || 'Failed to load available rooms');
            }
        } catch (error) {
            console.error('❌ Error loading available rooms:', error);
            // Always hide loading state in case of error
            hideLoading();
            showEmpty();
        }
    }    function displayRooms(rooms, isFiltered = false, filterData = null) {
        console.log('📋 Displaying rooms:', rooms.length);
        console.log('🎯 displayRooms called with isFiltered:', isFiltered);
        hideLoading();
        hideEmpty();

        if (rooms.length === 0) {
            console.log('📭 No rooms to display, showing empty state');
            showEmpty();
            return;
        }

        if (roomsGrid) {
            roomsGrid.innerHTML = '';
            roomsGrid.classList.remove('hidden');
            roomsGrid.style.display = 'grid';

            // Group by tipe kamar, only show one card per tipe
            const tipeMap = {};
            rooms.forEach(room => {
                if (!tipeMap[room.tipe]) {
                    tipeMap[room.tipe] = [];
                }
                tipeMap[room.tipe].push(room);
            });
            Object.entries(tipeMap).forEach(([tipe, tipeRooms]) => {
                // Only show if at least one available (for filtered), or always show one per tipe (for unfiltered)
                if (isFiltered) {
                    if (tipeRooms.length > 0) {
                        const repRoom = { ...tipeRooms[0], no_kamar: undefined };
                        const card = createRoomCard(repRoom, true, filterData);
                        roomsGrid.appendChild(card);
                    }
                } else {
                    // Unfiltered: show one card per tipe
                    const repRoom = { ...tipeRooms[0], no_kamar: undefined };
                    const card = createRoomCard(repRoom, false, filterData);
                    roomsGrid.appendChild(card);
                }
            });
            console.log('✅ Room display complete - roomsGrid classes:', roomsGrid.className);
        } else {
            console.error('❌ roomsGrid element not found in displayRooms()');
        }
    }

    function createRoomCard(room, isFiltered, filterData) {
        const card = document.createElement('div');
        card.className = 'room-card';

        // Calculate nights and total price if filtered
        let nights = 1;
        let totalPrice = room.harga;
        let priceBreakdown = '';

        if (isFiltered && filterData) {
            const checkin = new Date(filterData.checkinDate);
            const checkout = new Date(filterData.checkoutDate);
            nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
            totalPrice = room.harga * nights;
            
            priceBreakdown = `
                <div class="mt-2 p-3 bg-[var(--input-bg-color)] rounded-lg">
                    <div class="text-sm text-[var(--text-muted-color)] mb-1">
                        <span>${nights} malam × ${formatCurrency(room.harga)}</span>
                    </div>
                    <div class="text-lg font-bold text-[var(--primary-color)]">
                        Total: ${formatCurrency(totalPrice)}
                    </div>
                </div>
            `;
        }

        // Room image (placeholder)
        const roomImages = {
            'Standard': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400',
            'Superior': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400',
            'Deluxe': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400',
            'Suite': 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400',
            'Family': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400'
        };

        const roomImage = roomImages[room.tipe] || roomImages['Standard'];

        // Room features based on type
        const roomFeatures = getRoomFeatures(room.tipe);

        card.innerHTML = `
            <div class="room-image" style="background-image: url('${roomImage}');">
                <div class="absolute top-4 right-4 bg-[var(--primary-color)] text-white px-3 py-1 rounded-full text-sm font-semibold">
                    ${room.tipe}
                </div>
                ${isFiltered ? '<div class="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">✓ Tersedia</div>' : ''}
            </div>
            <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-bold text-[var(--text-color)] mb-1">${room.tipe}</h3>
                        <p class="text-[var(--text-muted-color)] text-sm">Kapasitas: ${room.kapasitas_maks} tamu</p>
                    </div>
                    <div class="text-right">
                        <div class="room-price">${formatCurrency(room.harga)}</div>
                        <p class="text-[var(--text-muted-color)] text-sm">per malam</p>
                    </div>
                </div>
                <p class="text-[var(--text-muted-color)] text-sm mb-4">
                    ${room.deskripsi_kamar || `Kamar ${room.tipe} dengan fasilitas lengkap dan kenyamanan terbaik untuk pengalaman menginap yang tak terlupakan.`}
                </p>
                <div class="room-features">
                    ${roomFeatures.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
                </div>
                ${priceBreakdown}
                <button class="booking-button btn-primary" 
                        onclick="bookRoom(${room.id_kamar}, '', '${room.tipe}', ${room.harga}, ${isFiltered}, ${filterData ? `'${btoa(JSON.stringify(filterData))}'` : 'null'})">
                    ${isFiltered ? 'Pesan Kamar Ini' : 'Pilih Tanggal & Pesan'}
                </button>
            </div>
        `;

        return card;
    }

    function getRoomFeatures(roomType) {
        const features = {
            'Standard': ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam'],
            'Superior': ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam', 'Mini Bar'],
            'Deluxe': ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam', 'Mini Bar', 'Balkon'],
            'Suite': ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam', 'Mini Bar', 'Balkon', 'Ruang Tamu'],
            'Family': ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam', 'Mini Bar', 'Ruang Keluarga', 'Extra Bed']
        };
        return features[roomType] || features['Standard'];
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }    function showLoading() {
        console.log('🔄 Showing loading state');
        if (loadingState) {
            loadingState.classList.remove('hidden');
            loadingState.style.display = 'block';
        }
        if (emptyState) {
            emptyState.classList.add('hidden');
            emptyState.style.display = 'none';
        }
        if (roomsGrid) {
            roomsGrid.classList.add('hidden');
            roomsGrid.style.display = 'none';
        }
    }    function hideLoading() {
        console.log('✅ Hiding loading state');
        if (loadingState) {
            // Force hide using multiple methods
            loadingState.classList.add('hidden');
            loadingState.style.display = 'none';
            loadingState.style.visibility = 'hidden';
            loadingState.setAttribute('aria-hidden', 'true');
            console.log('✅ Loading state hidden - classes:', loadingState.className);
            console.log('✅ Loading state hidden - computed display:', getComputedStyle(loadingState).display);
        } else {
            console.error('❌ loadingState element not found in hideLoading()');
        }
    }

    function showEmpty() {
        console.log('📭 Showing empty state');
        hideLoading();
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.style.display = 'block';
        }
        if (roomsGrid) {
            roomsGrid.classList.add('hidden');
            roomsGrid.style.display = 'none';
        }
    }    function hideEmpty() {
        console.log('📭 Hiding empty state');
        if (emptyState) {
            emptyState.classList.add('hidden');
            emptyState.style.display = 'none';
        }
    }    // Global function for booking
    window.bookRoom = function(roomId, roomNumber, roomType, roomPrice, isFiltered, filterDataStr) {
        try {
            console.log('🎯 bookRoom called with:', { roomId, roomNumber, roomType, roomPrice, isFiltered });
              const bookingData = {
                roomId: roomId,
                roomNumber: roomNumber,
                roomType: roomType,
                roomPrice: roomPrice,
                guestInfo: currentUser,
                imageUrl: getRoomImage(roomType) // Add the correct image URL
            };

            if (isFiltered && filterDataStr && filterDataStr !== 'null') {
                try {
                    const filterData = JSON.parse(atob(filterDataStr));
                    bookingData.checkinDate = filterData.checkinDate;
                    bookingData.checkoutDate = filterData.checkoutDate;
                    
                    // Calculate nights
                    const checkin = new Date(filterData.checkinDate);
                    const checkout = new Date(filterData.checkoutDate);
                    const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
                    bookingData.nights = nights;
                } catch (parseError) {
                    console.error('Error parsing filter data:', parseError);
                }
            }console.log('💾 Storing booking data:', bookingData);
            
            // Store booking data in sessionStorage
            sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
            
            // Redirect to booking page
            if (isFiltered) {
                window.location.href = '/tamu/buat-reservasi.html';
            } else {
                // If not filtered, need to select dates first
                alert('Silakan pilih tanggal check-in dan check-out terlebih dahulu.');
                
                // Scroll to filter section
                const filterSection = document.querySelector('.filter-section') || document.querySelector('#rooms-container').previousElementSibling;
                if (filterSection) {
                    filterSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        } catch (error) {
            console.error('❌ Error in bookRoom:', error);
            alert('Terjadi kesalahan. Silakan coba lagi.');
        }
    };    // Function to get room image based on type - using same images as display
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
});
