document.addEventListener('DOMContentLoaded', async () => {
    console.log('kamar.js: Script loaded with new date-based room selection');
    
    // DOM elements
    const checkinInput = document.getElementById('checkin-date');
    const checkoutInput = document.getElementById('checkout-date');
    const searchButton = document.getElementById('search-rooms-btn');
    const dateErrorMessage = document.getElementById('date-error-message');
    const loadingElement = document.getElementById('loading-message');
    const noDatesMessage = document.getElementById('no-dates-message');
    const roomsContainer = document.getElementById('room-list-container');
    const bookingSummary = document.getElementById('booking-summary');
    const summaryContent = document.getElementById('summary-content');
    const totalPriceElement = document.getElementById('total-price');
    const proceedBookingBtn = document.getElementById('proceed-booking-btn');
    const summaryCheckin = document.getElementById('summary-checkin');
    const summaryCheckout = document.getElementById('summary-checkout');
    const summaryNights = document.getElementById('summary-nights');

    // Booking state
    let selectedRooms = {};
    let checkinDate = '';
    let checkoutDate = '';
    let numberOfNights = 0;

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    checkinInput.min = today;
    checkoutInput.min = today;    // Function to get room image based on type
    function getRoomImage(tipe) {
        const roomType = tipe.toLowerCase();
        
        // Map room types to their specific images
        const imageMap = {
            'standard': '/images/rooms/standard.svg',
            'superior': '/images/rooms/superior.svg', 
            'deluxe': '/images/rooms/deluxe.svg',
            'suite': '/images/rooms/suite.svg',
            'family': '/images/rooms/family.svg'
        };
        
        return imageMap[roomType] || '/images/rooms/standard.svg';
    }

    // Function to format price
    function formatPrice(price) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(price);
    }

    // Function to get room amenities based on type
    function getRoomAmenities(tipe) {
        const amenities = {
            'Standard': ['AC', 'TV', 'Kamar Mandi Pribadi', 'WiFi Gratis'],
            'Superior': ['AC', 'TV LED', 'Kamar Mandi Pribadi', 'WiFi Gratis', 'Mini Bar', 'Balkon'],
            'Deluxe': ['AC', 'TV LED 42"', 'Kamar Mandi Mewah', 'WiFi Gratis', 'Mini Bar', 'Balkon Pribadi', 'Sofa'],
            'Suite': ['AC', 'TV LED 55"', 'Kamar Mandi Mewah', 'WiFi Gratis', 'Mini Bar', 'Balkon Pribadi', 'Ruang Tamu', 'Kitchenette'],
            'Family': ['AC', 'TV LED', 'Kamar Mandi Pribadi', 'WiFi Gratis', 'Kasur Susun', 'Area Bermain', 'Mini Bar']
        };
        return amenities[tipe] || ['AC', 'TV', 'Kamar Mandi Pribadi', 'WiFi Gratis'];
    }

    // Function to create room type card HTML
    function createRoomTypeCard(roomType) {
        const amenities = getRoomAmenities(roomType.tipe);
        const amenitiesList = amenities.map(amenity => `<li class="text-sm text-[var(--text-muted-color)]">${amenity}</li>`).join('');
        
        const formattedPrice = formatPrice(roomType.harga);
        const imageUrl = getRoomImage(roomType.tipe);

        return `
            <div class="hover-card room-type-card flex flex-col gap-4 pb-6 rounded-xl overflow-hidden border shadow-xl bg-[var(--card-bg-color)] border-[var(--secondary-color)] hover:border-[var(--primary-color)] transition-all duration-300" data-room-type="${roomType.tipe}">
                <div class="relative">
                    <div class="w-full bg-center bg-no-repeat aspect-[4/3] bg-cover" style="background-image: url('${imageUrl}');"></div>
                    <div class="absolute bottom-0 left-0 bg-gradient-to-t from-black/70 to-transparent w-full p-4">
                        <p class="text-[var(--primary-color)] text-2xl font-bold">${roomType.tipe} Room</p>
                    </div>
                </div>
                <div class="px-6 flex flex-col flex-grow">
                    <p class="text-[var(--text-muted-color)] text-sm font-normal leading-relaxed mb-3 h-20 overflow-hidden">
                        ${roomType.deskripsi_kamar || 'Luxurious accommodations with modern amenities and elegant design.'}
                    </p>
                    <div class="mb-4">
                        <h3 class="text-[var(--primary-color)] text-sm font-semibold mb-2">Fasilitas:</h3>
                        <ul class="list-disc list-inside text-[var(--text-muted-color)] text-xs space-y-0.5">
                            ${amenitiesList}
                        </ul>
                    </div>
                    <div class="mb-4">
                        <h3 class="text-[var(--primary-color)] text-sm font-semibold mb-1">Info Kamar:</h3>
                        <ul class="list-disc list-inside text-[var(--text-muted-color)] text-xs space-y-0.5">
                            <li>Kapasitas: ${roomType.kapasitas_maks} orang</li>
                            <li>Available: <span class="text-green-500">${roomType.available_count} kamar</span></li>
                            <li>Total: ${roomType.total_rooms} kamar</li>
                        </ul>
                    </div>
                    <p class="text-[var(--primary-color)] text-xl font-semibold mb-4 mt-auto">${formattedPrice} <span class="text-xs text-[var(--text-muted-color)] font-normal">/ malam</span></p>
                    
                    <!-- Room quantity selector -->
                    <div class="flex items-center gap-4 mb-4">
                        <label class="text-sm font-medium text-[var(--text-color)]">Jumlah:</label>
                        <div class="flex items-center gap-2">
                            <button class="quantity-btn minus-btn w-8 h-8 bg-[var(--secondary-color)] text-[var(--text-color)] rounded-full flex items-center justify-center hover:bg-[var(--primary-color)] transition-colors" data-room-type="${roomType.tipe}" data-action="minus">-</button>
                            <span class="quantity-display w-8 text-center text-[var(--text-color)] font-medium" data-room-type="${roomType.tipe}">0</span>
                            <button class="quantity-btn plus-btn w-8 h-8 bg-[var(--secondary-color)] text-[var(--text-color)] rounded-full flex items-center justify-center hover:bg-[var(--primary-color)] transition-colors" data-room-type="${roomType.tipe}" data-action="plus" data-max-quantity="${roomType.available_count}">+</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Function to validate dates
    function validateDates() {
        const checkin = checkinInput.value;
        const checkout = checkoutInput.value;

        if (!checkin || !checkout) {
            showDateError('Please select both check-in and check-out dates.');
            return false;
        }

        const checkinDate = new Date(checkin);
        const checkoutDate = new Date(checkout);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (checkinDate < today) {
            showDateError('Check-in date cannot be in the past.');
            return false;
        }

        if (checkoutDate <= checkinDate) {
            showDateError('Check-out date must be after check-in date.');
            return false;
        }

        hideDateError();
        return true;
    }

    // Function to show date error
    function showDateError(message) {
        dateErrorMessage.textContent = message;
        dateErrorMessage.classList.remove('hidden');
    }

    // Function to hide date error
    function hideDateError() {
        dateErrorMessage.classList.add('hidden');
    }

    // Function to calculate number of nights
    function calculateNights(checkin, checkout) {
        const checkinDate = new Date(checkin);
        const checkoutDate = new Date(checkout);
        const timeDiff = checkoutDate.getTime() - checkinDate.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    // Function to fetch available room types
    async function fetchAvailableRoomTypes() {
        try {
            const checkin = checkinInput.value;
            const checkout = checkoutInput.value;

            console.log('Fetching available room types for:', checkin, 'to', checkout);

            loadingElement.style.display = 'block';
            roomsContainer.style.display = 'none';
            noDatesMessage.style.display = 'none';

            const response = await fetch(`/api/kamar/types/available?checkin=${checkin}&checkout=${checkout}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('Available room types received:', data);

            // Store dates and calculate nights
            checkinDate = checkin;
            checkoutDate = checkout;
            numberOfNights = calculateNights(checkin, checkout);

            // Update summary dates
            updateSummaryDates();

            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                displayRoomTypes(data.data);
            } else {
                showNoRoomsMessage();
            }

        } catch (error) {
            console.error('Error fetching room types:', error);
            showErrorMessage(error.message);
        } finally {
            loadingElement.style.display = 'none';
        }
    }

    // Function to display room types
    function displayRoomTypes(roomTypes) {
        const roomCards = roomTypes.map(roomType => createRoomTypeCard(roomType)).join('');
        roomsContainer.innerHTML = roomCards;
        roomsContainer.style.display = 'grid';
        
        // Reset selected rooms
        selectedRooms = {};
        updateBookingSummary();
    }

    // Function to show no rooms message
    function showNoRoomsMessage() {
        roomsContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-[var(--text-muted-color)] text-lg">No rooms available for the selected dates. Please try different dates.</p>
            </div>
        `;
        roomsContainer.style.display = 'grid';
    }

    // Function to show error message
    function showErrorMessage(message) {
        roomsContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-red-500 text-lg">Error: ${message}</p>
                <p class="text-[var(--text-muted-color)] text-sm mt-2">Please try again or select different dates.</p>
            </div>
        `;
        roomsContainer.style.display = 'grid';
    }

    // Function to update summary dates
    function updateSummaryDates() {
        if (summaryCheckin && summaryCheckout && summaryNights) {
            summaryCheckin.textContent = new Date(checkinDate).toLocaleDateString('id-ID');
            summaryCheckout.textContent = new Date(checkoutDate).toLocaleDateString('id-ID');
            summaryNights.textContent = `${numberOfNights} malam`;
        }
    }

    // Function to update booking summary
    function updateBookingSummary() {
        const hasSelectedRooms = Object.keys(selectedRooms).length > 0 && 
                                 Object.values(selectedRooms).some(room => room.quantity > 0);

        if (hasSelectedRooms) {
            let summaryHTML = '';
            let totalCost = 0;

            Object.entries(selectedRooms).forEach(([roomType, room]) => {
                if (room.quantity > 0) {
                    const roomTotal = room.price * room.quantity * numberOfNights;
                    totalCost += roomTotal;

                    summaryHTML += `
                        <div class="flex justify-between items-center py-2 border-b border-[var(--secondary-color)] last:border-b-0">
                            <div>
                                <span class="text-[var(--text-color)] font-medium">${roomType}</span>
                                <span class="text-[var(--text-muted-color)] text-sm ml-2">(${room.quantity} kamar × ${numberOfNights} malam)</span>
                            </div>
                            <span class="text-[var(--primary-color)] font-semibold">${formatPrice(roomTotal)}</span>
                        </div>
                    `;
                }
            });

            summaryContent.innerHTML = summaryHTML;
            totalPriceElement.textContent = formatPrice(totalCost);
            proceedBookingBtn.disabled = false;
            bookingSummary.style.display = 'block';
        } else {
            bookingSummary.style.display = 'none';
        }
    }

    // Function to handle quantity changes
    function handleQuantityChange(roomType, action, maxQuantity) {
        if (!selectedRooms[roomType]) {
            // Get room data from the displayed card
            const roomCard = document.querySelector(`[data-room-type="${roomType}"]`);
            const priceText = roomCard.querySelector('.text-xl').textContent;
            const price = parseInt(priceText.replace(/[^\d]/g, ''));
            
            selectedRooms[roomType] = {
                quantity: 0,
                price: price,
                maxQuantity: maxQuantity
            };
        }

        const room = selectedRooms[roomType];
        
        if (action === 'plus' && room.quantity < maxQuantity) {
            room.quantity++;
        } else if (action === 'minus' && room.quantity > 0) {
            room.quantity--;
        }

        // Update display
        const quantityDisplay = document.querySelector(`[data-room-type="${roomType}"].quantity-display`);
        if (quantityDisplay) {
            quantityDisplay.textContent = room.quantity;
        }

        // Update summary
        updateBookingSummary();
    }

    // Function to handle booking proceed
    function handleProceedBooking() {
        console.log('Proceeding to booking with:', {
            checkinDate,
            checkoutDate,
            selectedRooms,
            numberOfNights
        });
        
        // Check if user is logged in
        if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
            const currentUser = getLoggedInUser();
            if (currentUser && currentUser.role === 'tamu') {
                // Create booking data
                const bookingData = {
                    checkin: checkinDate,
                    checkout: checkoutDate,
                    rooms: selectedRooms,
                    nights: numberOfNights
                };
                
                // Store booking data in sessionStorage for the booking page
                sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
                
                // Redirect to booking page
                window.location.href = '/tamu/buat-reservasi.html';
                return;
            }
        }
        
        // User not logged in, redirect to login
        alert('Silakan login sebagai tamu untuk melakukan pemesanan.');
        // Store booking data for after login
        const bookingData = {
            checkin: checkinDate,
            checkout: checkoutDate,
            rooms: selectedRooms,
            nights: numberOfNights
        };
        sessionStorage.setItem('pendingBookingData', JSON.stringify(bookingData));
        
        const targetUrl = encodeURIComponent('/tamu/buat-reservasi.html');
        window.location.href = `/login.html?role=tamu&redirect=${targetUrl}`;
    }

    // Event listeners
    checkinInput.addEventListener('change', () => {
        if (checkinInput.value) {
            // Set minimum checkout date to day after checkin
            const checkinDate = new Date(checkinInput.value);
            checkinDate.setDate(checkinDate.getDate() + 1);
            checkoutInput.min = checkinDate.toISOString().split('T')[0];
        }
        
        // Clear results if dates are changed
        roomsContainer.style.display = 'none';
        bookingSummary.style.display = 'none';
        noDatesMessage.style.display = 'block';
    });

    checkoutInput.addEventListener('change', () => {
        // Clear results if dates are changed
        roomsContainer.style.display = 'none';
        bookingSummary.style.display = 'none';
        noDatesMessage.style.display = 'block';
    });

    searchButton.addEventListener('click', () => {
        if (validateDates()) {
            fetchAvailableRoomTypes();
        }
    });

    // Event delegation for quantity buttons
    if (roomsContainer) {
        roomsContainer.addEventListener('click', function(event) {
            const button = event.target.closest('.quantity-btn');
            if (button) {
                const roomType = button.getAttribute('data-room-type');
                const action = button.getAttribute('data-action');
                const maxQuantity = parseInt(button.getAttribute('data-max-quantity')) || 999;
                
                handleQuantityChange(roomType, action, maxQuantity);
            }
        });
    }

    // Proceed booking button
    if (proceedBookingBtn) {
        proceedBookingBtn.addEventListener('click', handleProceedBooking);
    }

    // Mobile menu toggle (if exists)
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    console.log('kamar.js: New date-based room selection initialized');
});
