document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth functions to load
    let authCheckAttempts = 0;
    while ((typeof isUserLoggedIn !== 'function' || typeof getLoggedInUser !== 'function') && authCheckAttempts < 50) {
        console.log('Waiting for auth functions to load...');
        await new Promise(resolve => setTimeout(resolve, 100));
        authCheckAttempts++;
    }

    // Check if reservation API is loaded
    if (!window.reservationAPI) {
        console.error('❌ Reservation API not loaded! Please check if the API script is included.');
        alert('Error: API tidak dapat dimuat. Silakan refresh halaman.');
        return;
    }
    
    if (typeof isUserLoggedIn !== 'function' || !isUserLoggedIn()) {
        alert("Akses ditolak. Anda harus login sebagai resepsionis.");
        const targetUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?role=resepsionis&redirect=${targetUrl}`;
        return;
    }

    const currentUser = getLoggedInUser();
    if (!currentUser || currentUser.role !== 'resepsionis') {
        alert("Akses ditolak. Anda harus login sebagai resepsionis.");
        window.location.href = '/login.html';
        return;
    }

    const reservationsTbody = document.getElementById('reservations-tbody');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const emptyState = document.getElementById('empty-state');
    const errorMessage = document.getElementById('error-message');
    const reservationsTable = document.getElementById('reservations-table');
    
    const searchQueryInput = document.getElementById('search-query');
    const filterStatusSelect = document.getElementById('filter-status');
    const filterCheckinDateInput = document.getElementById('filter-checkin-date');
    const applyFilterBtn = document.getElementById('apply-filter-btn');
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    const addNewReservationBtn = document.getElementById('add-new-reservation-btn');

    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    // Global variable to store all reservations from database
    let allReservations = [];
    
    // Load reservations from database
    async function loadReservations() {
        try {
            showLoading();
            console.log('🔄 Loading reservations...');
            
            const response = await window.reservationAPI.fetchAllReservations();
            console.log('✅ API Response received:', response);
            console.log('📊 Response type:', typeof response);
            console.log('📋 Response keys:', Object.keys(response || {}));
              // Check if response has data (either response.data or response directly)
            if (response && (response.data || Array.isArray(response))) {
                allReservations = response.data || response;
                console.log('✅ All reservations loaded:', allReservations.length, 'items');
                console.log('📝 First reservation sample:', allReservations[0]);
                  // 🔍 DEBUG: Analyze date formats from API (with error handling)
                if (allReservations.length > 0) {
                    console.log('🔍 DATE DEBUG: Analyzing date formats from API...');
                    allReservations.slice(0, 3).forEach((res, index) => {
                        console.log(`📅 Reservation ${index +1 } (ID: ${res.id_reservasi}):`);
                        console.log(`  tanggal_checkin: "${res.tanggal_checkin}" (type: ${typeof res.tanggal_checkin})`);
                        console.log(`  tanggal_checkout: "${res.tanggal_checkout}" (type: ${typeof res.tanggal_checkout})`);
                        
                        // Test different parsing methods with error handling
                        if (res.tanggal_checkin) {
                            try {
                                const directDate = new Date(res.tanggal_checkin);
                                if (!isNaN(directDate.getTime())) {
                                    console.log(`  Direct parsing: ${directDate.toISOString()} -> Local: ${directDate.getFullYear()}-${(directDate.getMonth()+1).toString().padStart(2,'0')}-${directDate.getDate().toString().padStart(2,'0')}`);
                                } else {
                                    console.log(`  Direct parsing: Invalid date`);
                                }
                                
                                // Extract date string
                                const dateStr = String(res.tanggal_checkin).split(' ')[0] || String(res.tanggal_checkin).split('T')[0];
                                const dateParts = dateStr.split('-');
                                
                                if (dateParts.length === 3) {
                                    const [year, month, day] = dateParts.map(Number);
                                    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                                        const manualDate = new Date(year, month - 1, day);
                                        if (!isNaN(manualDate.getTime())) {
                                            console.log(`  Manual parsing: ${manualDate.toISOString()} -> Local: ${manualDate.getFullYear()}-${(manualDate.getMonth()+1).toString().padStart(2,'0')}-${manualDate.getDate().toString().padStart(2,'0')}`);
                                            
                                            const resultStr = `${manualDate.getFullYear()}-${(manualDate.getMonth()+1).toString().padStart(2,'0')}-${manualDate.getDate().toString().padStart(2,'0')}`;
                                            console.log(`  Expected date: ${dateStr}, Manual result: ${resultStr} - ${dateStr === resultStr ? '✅ Correct' : '❌ Wrong'}`);
                                        } else {
                                            console.log(`  Manual parsing: Invalid date from parts`);
                                        }
                                    } else {
                                        console.log(`  Manual parsing: Invalid date parts - year: ${year}, month: ${month}, day: ${day}`);
                                    }
                                } else {
                                    console.log(`  Manual parsing: Invalid date format - "${dateStr}"`);
                                }
                            } catch (error) {
                                console.log(`  Date parsing error:`, error.message);
                            }
                        }
                        console.log('---');
                    });
                }
                
                displayReservations(allReservations);
                hideLoading();
            } else if (response && response.success === false) {
                throw new Error(response.message || 'Failed to load reservations');
            } else {
                // Handle case where response structure is different
                console.warn('Unexpected response structure:', response);
                allReservations = [];
                displayReservations(allReservations);
                hideLoading();
            }
        } catch (error) {
            console.error('❌ Error loading reservations:', error);
            showError(error.message || 'Gagal memuat data reservasi');
            allReservations = [];
            displayReservations(allReservations);
            hideLoading();
        }
    }

    function showLoading() {
        loadingState.classList.remove('hidden');
        errorState.classList.add('hidden');
        emptyState.classList.add('hidden');
        reservationsTable.classList.add('hidden');
    }

    function hideLoading() {
        loadingState.classList.add('hidden');
        reservationsTable.classList.remove('hidden');
    }

    function showError(message) {
        loadingState.classList.add('hidden');
        reservationsTable.classList.add('hidden');
        emptyState.classList.add('hidden');
        errorMessage.textContent = message;
        errorState.classList.remove('hidden');
    }

    function showEmpty() {
        loadingState.classList.add('hidden');
        reservationsTable.classList.add('hidden');
        errorState.classList.add('hidden');
        emptyState.classList.remove('hidden');
    }    function formatDate(dateString) {
        if (!dateString) return '-';
        
        // Handle date string properly to avoid timezone issues
        let date;
        if (dateString.includes('T') || dateString.includes(' ')) {
            // If it's a full datetime string, parse it normally
            date = new Date(dateString);
        } else {
            // If it's just a date string (YYYY-MM-DD), parse it as local date
            const [year, month, day] = dateString.split('-').map(Number);
            date = new Date(year, month - 1, day); // month is 0-indexed
        }
        
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }    function formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    }

    // Helper function to get date string without timezone issues
    function getLocalDateString(date) {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        return d.getFullYear() + '-' + 
               String(d.getMonth() + 1).padStart(2, '0') + '-' + 
               String(d.getDate()).padStart(2, '0');
    }function getStatusBadgeClass(status) {
        const s = status?.toLowerCase() || '';
        
        // Reservasi Status
        if (s.includes("dikonfirmasi") || s.includes("confirmed")) return 'status-confirmed';
        if (s.includes("belum bayar") || s.includes("unpaid")) return 'status-belum-bayar';
        if (s.includes("menunggu konfirmasi") || s.includes("pending") || s.includes("menunggu")) return 'status-pending';
        if (s.includes("check-in") || s.includes("checked-in")) return 'status-checked-in';
        if (s.includes("check-out") || s.includes("completed")) return 'status-completed';
        if (s.includes("dibatalkan") || s.includes("cancelled")) return 'status-cancelled';
        if (s.includes("no-show")) return 'status-no-show';
        
        // Default fallback
        return 'status-pending';
    }function displayReservations(reservationsToDisplay) {
        reservationsTbody.innerHTML = ''; // Clear table
        
        // Reset all state elements first
        loadingState.classList.add('hidden');
        errorState.classList.add('hidden');
        emptyState.classList.add('hidden');
        reservationsTable.classList.remove('hidden');
        
        if (reservationsToDisplay.length === 0) {
            // Only show empty state if no reservations to display
            reservationsTable.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }        reservationsToDisplay.forEach(res => {            // Calculate costs using helper function for consistency - INCLUDE PPN for payment management
            const roomPrice = res.harga_kamar || res.harga || 0;
            const costs = calculateReservationCosts(
                res.tanggal_checkin,
                res.tanggal_checkout,
                roomPrice,
                res.total_biaya
            );
            
            // Store calculated values for potential use elsewhere, INCLUDING PPN for payment
            res.calculated_costs = costs;
            // Store the final total with PPN for payment management
            res.total_with_ppn = costs.finalTotal;
            res.payment_amount_due = costs.finalTotal; // This includes PPN
              // Format room information - show room type for all, room number only for confirmed reservations
            let roomDisplay = '';
            if (res.tipe_kamar) {
                roomDisplay = res.tipe_kamar;
                // Show room number only if reservation is confirmed and room is assigned
                if ((res.status_reservasi === 'Dikonfirmasi' || res.status_reservasi === 'Check-In' || res.status_reservasi === 'Check-Out') && 
                    (res.no_kamar_assigned || res.no_kamar)) {
                    roomDisplay += ` - ${res.no_kamar_assigned || res.no_kamar}`;
                }
            } else {
                roomDisplay = '-';
            }
            
            const row = `
                <tr class="border-b border-[var(--input-border-color)] hover:bg-[var(--table-row-hover-bg)]">
                    <td class="px-4 py-3 font-medium text-[var(--primary-color)]">${res.id_reservasi}</td>
                    <td class="px-4 py-3">${res.nama_tamu || '-'}</td>
                    <td class="px-4 py-3">${roomDisplay}</td>
                    <td class="px-4 py-3">${formatDate(res.tanggal_checkin)}</td>
                    <td class="px-4 py-3">${formatDate(res.tanggal_checkout)}</td>
                    <td class="px-4 py-3 text-center">
                        <span class="status-badge ${getStatusBadgeClass(res.status_reservasi)}">${res.status_reservasi || 'Unknown'}</span>
                    </td><td class="px-4 py-3 text-center">
                        <div class="action-buttons">
                            <button class="btn-action btn-detail" 
                                    data-id="${res.id_reservasi}" title="Lihat Detail">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                            </button>                            <button class="btn-action btn-status" 
                                    data-id="${res.id_reservasi}" title="Ubah Status">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            reservationsTbody.insertAdjacentHTML('beforeend', row);
        });    }    function applyFilters() {
        const query = searchQueryInput.value.toLowerCase().trim();
        const status = filterStatusSelect.value;
        const checkinDate = filterCheckinDateInput.value;

        console.log('🔍 Applying filters:', { query, status, checkinDate });
        console.log('📊 Total reservations:', allReservations.length);
        console.log('📋 Sample reservation:', allReservations[0]);

        // Reset UI states first
        loadingState.classList.add('hidden');
        errorState.classList.add('hidden');
        emptyState.classList.add('hidden');
        reservationsTable.classList.remove('hidden');

        let debugCount = 0; // Counter for debug logging

        let filtered = allReservations.filter(res => {
            // Name match - check if guest name contains the query
            const nameMatch = !query || (res.nama_tamu && res.nama_tamu.toLowerCase().includes(query));
            
            // ID match - check if reservation ID contains the query (convert to string)
            const idMatch = !query || String(res.id_reservasi).toLowerCase().includes(query);
            
            // Status match - exact match if status filter is selected
            const statusMatch = !status || res.status_reservasi === status;            // Date match - compare date portions only (handle different date formats)
            // MODIFIED: Filter tanggal mundur 1 hari - jika pilih tanggal 18, cari data tanggal 17
            let dateMatch = true;
            if (checkinDate) {
                // Extract date portion from database date and normalize it
                let dbDateStr = '';
                if (res.tanggal_checkin) {
                    // Convert to string and extract date part
                    const dbDateFull = String(res.tanggal_checkin);
                    
                    if (dbDateFull.includes(' ')) {
                        dbDateStr = dbDateFull.split(' ')[0]; // Get date part before space
                    } else if (dbDateFull.includes('T')) {
                        dbDateStr = dbDateFull.split('T')[0]; // Handle ISO format
                    } else {
                        dbDateStr = dbDateFull; // Already in YYYY-MM-DD format
                    }
                      // Additional normalization - ensure we're comparing the actual date values
                    // Parse both dates and compare them as Date objects to avoid string comparison issues
                    try {
                        const dbDateParts = dbDateStr.split('-');
                        const filterDateParts = checkinDate.split('-');
                        
                        // Validate date parts before parsing
                        if (dbDateParts.length === 3 && filterDateParts.length === 3) {
                            const [dbYear, dbMonth, dbDay] = dbDateParts.map(Number);
                            const [filterYear, filterMonth, filterDay] = filterDateParts.map(Number);
                            
                            // Check if all date parts are valid numbers
                            if (!isNaN(dbYear) && !isNaN(dbMonth) && !isNaN(dbDay) &&
                                !isNaN(filterYear) && !isNaN(filterMonth) && !isNaN(filterDay)) {
                                
                                const dbDate = new Date(dbYear, dbMonth - 1, dbDay);
                                // MODIFIED: Mundur 1 hari dari tanggal filter yang dipilih
                                const filterDate = new Date(filterYear, filterMonth - 1, filterDay);
                                filterDate.setDate(filterDate.getDate() - 1); // Mundur 1 hari
                                
                                dateMatch = dbDate.getTime() === filterDate.getTime();
                            } else {
                                console.warn(`⚠️ Invalid date parts - DB: [${dbYear}, ${dbMonth}, ${dbDay}], Filter: [${filterYear}, ${filterMonth}, ${filterDay}]`);
                                dateMatch = false;
                            }
                        } else {
                            console.warn(`⚠️ Invalid date format - DB parts: ${dbDateParts.length}, Filter parts: ${filterDateParts.length}`);
                            dateMatch = false;
                        }
                    } catch (e) {
                        // Fallback to string comparison if date parsing fails
                        // Also subtract 1 day for fallback
                        try {
                            const filterDateParts = checkinDate.split('-');
                            if (filterDateParts.length === 3) {
                                const [filterYear, filterMonth, filterDay] = filterDateParts.map(Number);
                                if (!isNaN(filterYear) && !isNaN(filterMonth) && !isNaN(filterDay)) {
                                    const filterDate = new Date(filterYear, filterMonth - 1, filterDay);
                                    filterDate.setDate(filterDate.getDate() - 1);
                                    const targetDateStr = `${filterDate.getFullYear()}-${(filterDate.getMonth()+1).toString().padStart(2,'0')}-${filterDate.getDate().toString().padStart(2,'0')}`;
                                    dateMatch = dbDateStr === targetDateStr;
                                } else {
                                    console.warn(`⚠️ Fallback failed - invalid filter date parts: [${filterYear}, ${filterMonth}, ${filterDay}]`);
                                    dateMatch = dbDateStr === checkinDate;
                                }
                            } else {
                                dateMatch = dbDateStr === checkinDate;
                            }
                        } catch (fallbackError) {
                            console.error(`❌ Fallback parsing failed:`, fallbackError.message);
                            dateMatch = dbDateStr === checkinDate;
                        }
                    }
                } else {
                    dateMatch = false;
                }
            }            // Debug logging for first few items (using separate counter)
            if (debugCount < 5) {
                let dbDateStrForDebug = '';
                let dbDateObjForDebug = null;
                let filterDateObjForDebug = null;
                
                if (res.tanggal_checkin) {
                    const dbDateFull = String(res.tanggal_checkin);
                    if (dbDateFull.includes(' ')) {
                        dbDateStrForDebug = dbDateFull.split(' ')[0];
                    } else if (dbDateFull.includes('T')) {
                        dbDateStrForDebug = dbDateFull.split('T')[0];
                    } else {
                        dbDateStrForDebug = dbDateFull;
                    }
                    
                    // Parse dates for comparison with better error handling
                    try {
                        const dbDateParts = dbDateStrForDebug.split('-');
                        console.log(`🔍 DEBUG: Raw date parts for DB: [${dbDateParts.join(', ')}]`);
                        
                        if (dbDateParts.length === 3) {
                            const [dbYear, dbMonth, dbDay] = dbDateParts.map(Number);
                            console.log(`🔍 DEBUG: Parsed DB date parts - year: ${dbYear}, month: ${dbMonth}, day: ${dbDay}`);
                            
                            if (!isNaN(dbYear) && !isNaN(dbMonth) && !isNaN(dbDay)) {
                                dbDateObjForDebug = new Date(dbYear, dbMonth - 1, dbDay);
                            } else {
                                console.warn(`⚠️ Invalid DB date parts - year: ${dbYear}, month: ${dbMonth}, day: ${dbDay}`);
                            }
                        } else {
                            console.warn(`⚠️ Invalid DB date format: "${dbDateStrForDebug}" -> parts: ${dbDateParts.length}`);
                        }
                        
                        if (checkinDate) {
                            const filterDateParts = checkinDate.split('-');
                            console.log(`🔍 DEBUG: Raw date parts for filter: [${filterDateParts.join(', ')}]`);
                            
                            if (filterDateParts.length === 3) {
                                const [filterYear, filterMonth, filterDay] = filterDateParts.map(Number);
                                console.log(`🔍 DEBUG: Parsed filter date parts - year: ${filterYear}, month: ${filterMonth}, day: ${filterDay}`);
                                
                                if (!isNaN(filterYear) && !isNaN(filterMonth) && !isNaN(filterDay)) {
                                    filterDateObjForDebug = new Date(filterYear, filterMonth - 1, filterDay);
                                    // Apply -1 day for debug display
                                    filterDateObjForDebug.setDate(filterDateObjForDebug.getDate() - 1);
                                } else {
                                    console.warn(`⚠️ Invalid filter date parts - year: ${filterYear}, month: ${filterMonth}, day: ${filterDay}`);
                                }
                            } else {
                                console.warn(`⚠️ Invalid filter date format: "${checkinDate}" -> parts: ${filterDateParts.length}`);
                            }
                        }
                    } catch (e) {
                        console.error(`❌ Date parsing error in debug:`, e.message);
                    }
                }
                  console.log('🔬 Filter debug for reservation:', res.id_reservasi, {
                    query, nameMatch, idMatch, 
                    status, statusMatch, 
                    checkinDate, dateMatch,
                    res_checkin_original: res.tanggal_checkin,
                    res_checkin_extracted: dbDateStrForDebug,
                    filterDate: checkinDate,                    dbDateObj: dbDateObjForDebug ? getLocalDateString(dbDateObjForDebug) : 'null',
                    filterDateObj: filterDateObjForDebug ? getLocalDateString(filterDateObjForDebug) : 'null',
                    dateComparison: dbDateObjForDebug && filterDateObjForDebug ? 
                        (dbDateObjForDebug.getTime() === filterDateObjForDebug.getTime()) : 'no-comparison',
                    res_status: res.status_reservasi,
                    finalResult: (nameMatch || idMatch) && statusMatch && dateMatch
                });
                debugCount++;
            }
            
            // Return true if: (name matches OR id matches) AND status matches AND date matches
            const result = (nameMatch || idMatch) && statusMatch && dateMatch;
            
            return result;
        });        console.log('✅ Filtered results:', filtered.length);
        console.log('🔍 First few filtered items:', filtered.slice(0, 2));
        
        // Force reset all UI states before displaying
        loadingState.classList.add('hidden');
        errorState.classList.add('hidden');
        emptyState.classList.add('hidden');
        
        // Always show table first, displayReservations will handle empty state if needed
        reservationsTable.classList.remove('hidden');
        
        displayReservations(filtered);
    }
      if (applyFilterBtn) applyFilterBtn.addEventListener('click', applyFilters);
    if (searchQueryInput) {
        // Apply filters on every input change
        searchQueryInput.addEventListener('input', applyFilters);
        // Also apply on Enter key
        searchQueryInput.addEventListener('keyup', (event) => { 
            if(event.key === 'Enter') applyFilters();
        });
    }
    if (filterStatusSelect) filterStatusSelect.addEventListener('change', applyFilters);
    if (filterCheckinDateInput) filterCheckinDateInput.addEventListener('change', applyFilters);

    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            searchQueryInput.value = '';
            filterStatusSelect.value = '';
            filterCheckinDateInput.value = '';
            displayReservations(allReservations); // Show all again
        });
    }    if (addNewReservationBtn) {
        addNewReservationBtn.addEventListener('click', () => {
            const newReservationModal = document.getElementById('new-reservation-modal');
            if (newReservationModal) {
                newReservationModal.classList.remove('hidden');
                setupGuestNameAutocomplete(); // Initialize autocomplete
                setupRoomAvailabilityCheck(); // Initialize room availability check
            }
        });
    }// Guest name autocomplete functionality
    function setupGuestNameAutocomplete() {
        const guestNameInput = document.getElementById('guest-name');
        let suggestionsContainer = document.getElementById('guest-suggestions');
        let selectedGuest = null;
        let debounceTimer = null;

        if (!guestNameInput) {
            console.warn('Guest name input not found');
            return;
        }

        // Update placeholder to indicate search functionality
        guestNameInput.placeholder = 'Ketik nama tamu untuk mencari...';
        guestNameInput.setAttribute('autocomplete', 'off');

        guestNameInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            
            // Clear previous timer
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }

            if (query.length < 2) {
                hideSuggestions();
                selectedGuest = null;
                clearGuestDetails();
                return;
            }

            // Show loading indicator
            suggestionsContainer.innerHTML = '<div class="p-3 text-[var(--text-muted-color)] text-sm">Mencari tamu...</div>';
            suggestionsContainer.classList.remove('hidden');

            // Debounce search requests
            debounceTimer = setTimeout(async () => {
                try {
                    console.log('🔍 Searching for guests with query:', query);
                    
                    const response = await window.reservationAPI.searchGuests(query);
                    console.log('🔍 Search response:', response);
                    
                    if (response && response.success && response.data) {
                        if (response.data.length > 0) {
                            console.log('✅ Found guests, showing suggestions');
                            showSuggestions(response.data);
                        } else {
                            console.log('⚠️ No guests found');
                            suggestionsContainer.innerHTML = '<div class="p-3 text-[var(--text-muted-color)] text-sm">Tidak ada tamu ditemukan</div>';
                        }
                    } else {
                        console.log('❌ Invalid response structure:', response);
                        suggestionsContainer.innerHTML = '<div class="p-3 text-[var(--text-muted-color)] text-sm">Tidak ada tamu ditemukan</div>';
                    }
                } catch (error) {
                    console.error('❌ Error searching guests:', error);
                    suggestionsContainer.innerHTML = '<div class="p-3 text-red-400 text-sm">Error mencari tamu: ' + error.message + '</div>';
                }
            }, 300);
        });

        // Handle suggestion selection
        suggestionsContainer.addEventListener('click', (e) => {
            const suggestionItem = e.target.closest('.suggestion-item');
            if (suggestionItem) {
                const guestData = JSON.parse(suggestionItem.dataset.guestData);
                selectGuest(guestData);
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!guestNameInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                hideSuggestions();
            }
        });

        function showSuggestions(guests) {
            suggestionsContainer.innerHTML = '';
            
            if (guests.length === 0) {
                suggestionsContainer.innerHTML = '<div class="p-3 text-[var(--text-muted-color)] text-sm text-center">Tidak ada tamu ditemukan</div>';
                suggestionsContainer.classList.remove('hidden');
                return;
            }
            
            guests.forEach(guest => {
                const suggestionItem = document.createElement('div');
                suggestionItem.className = 'suggestion-item p-3 hover:bg-[var(--table-row-hover-bg)] cursor-pointer border-b border-[var(--input-border-color)] last:border-b-0 transition-colors';
                suggestionItem.dataset.guestId = guest.id_tamu;
                suggestionItem.dataset.guestData = JSON.stringify(guest);
                suggestionItem.innerHTML = `
                    <div class="font-medium text-[var(--text-color)]">${guest.nama}</div>
                    <div class="text-sm text-[var(--text-muted-color)]">${guest.email || 'Email tidak tersedia'}</div>
                    <div class="text-xs text-[var(--text-muted-color)]">${guest.no_hp || 'No. HP tidak tersedia'}</div>
                    ${guest.alamat ? `<div class="text-xs text-[var(--text-muted-color)] mt-1">${guest.alamat}</div>` : ''}
                `;
                suggestionsContainer.appendChild(suggestionItem);
            });
            suggestionsContainer.classList.remove('hidden');
        }

        function hideSuggestions() {
            suggestionsContainer.classList.add('hidden');
            suggestionsContainer.innerHTML = '';
        }

        function selectGuest(guest) {
            selectedGuest = guest;
            guestNameInput.value = guest.nama;
            
            // Auto-fill other guest details
            const emailInput = document.getElementById('guest-email');
            const phoneInput = document.getElementById('guest-phone');
            const addressInput = document.getElementById('guest-address');
            
            if (emailInput) emailInput.value = guest.email || '';
            if (phoneInput) phoneInput.value = guest.no_hp || '';
            if (addressInput) addressInput.value = guest.alamat || '';
            
            // Store selected guest ID for form submission
            guestNameInput.dataset.selectedGuestId = guest.id_tamu;
            document.getElementById('selected-guest-id').value = guest.id_tamu;
            
            hideSuggestions();
        }

        function clearGuestDetails() {
            const emailInput = document.getElementById('guest-email');
            const phoneInput = document.getElementById('guest-phone');
            const addressInput = document.getElementById('guest-address');
            
            if (emailInput) emailInput.value = '';
            if (phoneInput) phoneInput.value = '';
            if (addressInput) addressInput.value = '';
            
            guestNameInput.dataset.selectedGuestId = '';
            document.getElementById('selected-guest-id').value = '';
        }    }

    // Room availability check functionality
    function setupRoomAvailabilityCheck() {
        const roomTypeSelect = document.getElementById('room-type');
        const checkinDateInput = document.getElementById('checkin-date');
        const checkoutDateInput = document.getElementById('checkout-date');
        const guestCountSelect = document.getElementById('guest-count');
        const availableRoomsContainer = document.getElementById('available-rooms');
        const roomSelectionInfo = document.getElementById('room-selection-info');
        const roomLoading = document.getElementById('room-loading');

        let selectedRoomId = null;

        // Function to check if all required fields are filled
        function areRequiredFieldsFilled() {
            return roomTypeSelect.value && 
                   checkinDateInput.value && 
                   checkoutDateInput.value &&
                   new Date(checkinDateInput.value) < new Date(checkoutDateInput.value);
        }

        // Function to show available rooms
        async function loadAvailableRooms() {
            if (!areRequiredFieldsFilled()) {
                availableRoomsContainer.classList.add('hidden');
                roomSelectionInfo.classList.remove('hidden');
                roomSelectionInfo.innerHTML = 'Silakan isi detail reservasi terlebih dahulu untuk melihat kamar yang tersedia.';
                return;
            }

            // Show loading
            roomLoading.classList.remove('hidden');
            availableRoomsContainer.classList.add('hidden');
            roomSelectionInfo.classList.add('hidden');            try {
                // Get available rooms from database
                const availableRooms = await getAvailableRooms(
                    roomTypeSelect.value,
                    checkinDateInput.value,
                    checkoutDateInput.value,
                    guestCountSelect.value
                );

                displayAvailableRooms(availableRooms);
            } catch (error) {
                console.error('Error loading available rooms:', error);
                roomSelectionInfo.classList.remove('hidden');
                roomSelectionInfo.innerHTML = '<span class="text-red-400">Gagal memuat kamar tersedia. Silakan coba lagi.</span>';
            } finally {
                roomLoading.classList.add('hidden');
            }
        }        // Function to get available rooms from database
        async function getAvailableRooms(roomType, checkinDate, checkoutDate, guestCount) {
            try {
                console.log('🔄 Fetching available rooms from database...', {
                    roomType, checkinDate, checkoutDate, guestCount
                });

                // Build query parameters
                const params = new URLSearchParams({
                    checkin: checkinDate,
                    checkout: checkoutDate,
                    tipe: roomType
                });

                // Make API call to get available rooms - use relative URL
                const response = await fetch(`/api/kamar/available?${params}`);
                
                // Check if response is JSON before parsing
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(`Server returned non-JSON response (${response.status})`);
                }
                
                const result = await response.json();

                console.log('✅ Available rooms API response:', result);

                if (!result || !result.data) {
                    console.warn('No rooms data in response');
                    return [];
                }

                const requestedGuestCount = parseInt(guestCount) || 1;
                
                // Filter rooms by guest capacity and add facilities
                const availableRooms = result.data
                    .filter(room => parseInt(room.kapasitas_maks) >= requestedGuestCount)
                    .map(room => ({
                        ...room,
                        // Ensure consistent field names
                        id_kamar: room.id_kamar,
                        no_kamar: room.no_kamar,
                        tipe_kamar: room.tipe,
                        harga: room.harga,
                        kapasitas_maks: parseInt(room.kapasitas_maks),
                        deskripsi: room.deskripsi_kamar || `Kamar ${room.tipe} dengan fasilitas lengkap`,
                        fasilitas: getFacilitiesByRoomType(room.tipe)
                    }));

                console.log('✅ Filtered available rooms:', availableRooms);
                return availableRooms;

            } catch (error) {
                console.error('❌ Error fetching available rooms:', error);
                throw new Error('Gagal memuat kamar tersedia: ' + error.message);
            }
        }

        // Helper function to get facilities by room type
        function getFacilitiesByRoomType(roomType) {
            const facilities = {
                'Standard': ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam'],
                'Superior': ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam', 'Mini Bar'],
                'Deluxe': ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam', 'Mini Bar', 'Balkon'],
                'Suite': ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam', 'Mini Bar', 'Balkon', 'Ruang Tamu'],
                'Family': ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam', 'Mini Bar', 'Ruang Keluarga', 'Extra Bed']
            };
            return facilities[roomType] || ['AC', 'TV', 'WiFi', 'Kamar Mandi Dalam'];
        }// Function to display available rooms
        function displayAvailableRooms(rooms) {
            availableRoomsContainer.innerHTML = '';

            // Filter rooms based on guest capacity
            const guestCount = parseInt(guestCountSelect.value) || 1;
            const suitableRooms = rooms.filter(room => room.kapasitas_maks >= guestCount);

            if (suitableRooms.length === 0) {
                roomSelectionInfo.classList.remove('hidden');
                if (rooms.length > 0) {
                    roomSelectionInfo.innerHTML = `<span class="text-yellow-400">Tidak ada kamar yang dapat menampung ${guestCount} tamu untuk tipe ${roomTypeSelect.value}. Silakan kurangi jumlah tamu atau pilih tipe kamar yang lebih besar.</span>`;
                } else {
                    roomSelectionInfo.innerHTML = '<span class="text-yellow-400">Tidak ada kamar tersedia untuk tanggal dan tipe yang dipilih.</span>';
                }
                return;
            }            // Parse dates properly to avoid timezone issues
            const [checkinYear, checkinMonth, checkinDay] = checkinDateInput.value.split('-').map(Number);
            const [checkoutYear, checkoutMonth, checkoutDay] = checkoutDateInput.value.split('-').map(Number);
            const checkinDate = new Date(checkinYear, checkinMonth - 1, checkinDay);
            const checkoutDate = new Date(checkoutYear, checkoutMonth - 1, checkoutDay);
            const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));            suitableRooms.forEach(room => {
                // Calculate costs using helper function for consistency
                const costs = calculateReservationCosts(
                    checkinDateInput.value,
                    checkoutDateInput.value,
                    room.harga
                );
                
                const isCapacityMatch = room.kapasitas_maks >= guestCount;
                const capacityStatus = isCapacityMatch ? 
                    (room.kapasitas_maks === guestCount ? 'text-green-400' : 'text-blue-400') : 
                    'text-red-400';
                
                const roomCard = document.createElement('div');
                roomCard.className = 'room-card p-4 border border-[var(--input-border-color)] rounded-lg cursor-pointer transition-all hover:border-[var(--primary-color)] hover:bg-[var(--table-row-hover-bg)]';
                roomCard.dataset.roomId = room.id_kamar;
                roomCard.innerHTML = `
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h4 class="font-semibold text-[var(--text-color)]">Kamar ${room.no_kamar}</h4>
                            <p class="text-sm text-[var(--text-muted-color)]">${room.tipe_kamar}</p>
                            <p class="text-xs ${capacityStatus}">
                                ✓ Kapasitas: ${room.kapasitas_maks} tamu 
                                ${room.kapasitas_maks > guestCount ? `(+${room.kapasitas_maks - guestCount} extra)` : ''}
                            </p>
                        </div>                        <div class="text-right">
                            <p class="font-bold text-[var(--primary-color)]">${safeFormatCurrency(room.harga)}/malam</p>
                            <p class="text-xs text-[var(--text-muted-color)]">Subtotal: ${safeFormatCurrency(costs.subtotal)}</p>
                            <p class="text-xs text-[var,--text-muted-color)]">PPN 10%: ${safeFormatCurrency(costs.ppnAmount)}</p>
                            <p class="text-sm font-medium text-[var(--primary-color)]">Total: ${safeFormatCurrency(costs.finalTotal)}</p>
                        </div>
                    </div>
                    <p class="text-sm text-[var(--text-muted-color)] mb-2">${room.deskripsi}</p>
                    <div class="flex flex-wrap gap-1 mb-2">
                        ${room.fasilitas.map(facility => 
                            `<span class="px-2 py-1 bg-[var(--input-bg-color)] text-xs rounded">${facility}</span>`
                        ).join('')}
                    </div>
                    <div class="mt-3 flex justify-between items-center">                        <div class="flex flex-col">
                            <span class="text-xs text-green-400">✓ Tersedia untuk periode ini</span>
                            <span class="text-xs ${capacityStatus}">
                                ${guestCount} dari ${room.kapasitas_maks} tamu
                            </span>
                            <span class="text-xs text-[var(--text-muted-color)]">
                                ${costs.nights} malam
                            </span>
                        </div>
                        <button type="button" class="select-room-btn px-3 py-1 bg-[var(--primary-color)] text-white text-sm rounded hover:bg-[#e08220] transition-colors">
                            Pilih Kamar
                        </button>
                    </div>
                `;

                // Add click handler for room selection
                roomCard.addEventListener('click', () => selectRoom(room, roomCard));
                
                availableRoomsContainer.appendChild(roomCard);
            });

            availableRoomsContainer.classList.remove('hidden');
            roomSelectionInfo.classList.add('hidden');
        }

        // Function to select a room
        function selectRoom(room, roomCard) {
            // Remove previous selection
            document.querySelectorAll('.room-card').forEach(card => {
                card.classList.remove('border-[var(--primary-color)]', 'bg-[var(--table-row-hover-bg)]');
                card.querySelector('.select-room-btn').textContent = 'Pilih Kamar';
                card.querySelector('.select-room-btn').classList.remove('bg-green-600');
                card.querySelector('.select-room-btn').classList.add('bg-[var(--primary-color)]');
            });

            // Highlight selected room
            roomCard.classList.add('border-[var(--primary-color)]', 'bg-[var(--table-row-hover-bg)]');
            const selectBtn = roomCard.querySelector('.select-room-btn');
            selectBtn.textContent = '✓ Dipilih';
            selectBtn.classList.remove('bg-[var(--primary-color)]');
            selectBtn.classList.add('bg-green-600');

            selectedRoomId = room.id_kamar;
            
            // Store selected room data for form submission
            const selectedRoomInput = document.getElementById('selected-room-data') || document.createElement('input');
            selectedRoomInput.type = 'hidden';
            selectedRoomInput.id = 'selected-room-data';
            selectedRoomInput.value = JSON.stringify(room);
            
            if (!document.getElementById('selected-room-data')) {
                document.getElementById('new-reservation-form').appendChild(selectedRoomInput);
            }

            console.log('Room selected:', room);
        }

        // Add event listeners for form fields
        [roomTypeSelect, checkinDateInput, checkoutDateInput, guestCountSelect].forEach(element => {
            if (element) {
                element.addEventListener('change', loadAvailableRooms);
            }
        });        // Set minimum date to today
        const today = new Date();
        const todayStr = getLocalDateString(today);
        if (checkinDateInput) checkinDateInput.min = todayStr;        // Update checkout min date when checkin changes
        if (checkinDateInput && checkoutDateInput) {
            checkinDateInput.addEventListener('change', () => {
                const checkinDate = new Date(checkinDateInput.value + 'T00:00:00'); // Add time to avoid timezone issues
                checkinDate.setDate(checkinDate.getDate() + 1);
                checkoutDateInput.min = getLocalDateString(checkinDate);
                
                // Clear checkout if it's before the new minimum
                if (checkoutDateInput.value && new Date(checkoutDateInput.value + 'T00:00:00') <= new Date(checkinDateInput.value + 'T00:00:00')) {
                    checkoutDateInput.value = '';
                }
            });
        }
    }    // Event delegation untuk tombol aksi di tabel - Enhanced with logging
    reservationsTbody.addEventListener('click', async (event) => {
        const target = event.target.closest('button');
        if (!target) return;
        
        const reservationId = target.dataset.id;
        if (!reservationId) return;

        try {
            if (target.classList.contains('btn-detail')) {
                logReservationActivity('VIEW_DETAILS', reservationId, { 
                    action: 'detail_button_clicked',
                    timestamp: new Date().toISOString()
                });
                await showReservationDetails(reservationId);
            } else if (target.classList.contains('btn-status')) {
                logReservationActivity('SHOW_STATUS_MODAL', reservationId, { 
                    action: 'status_button_clicked',
                    timestamp: new Date().toISOString()
                });
                showStatusChangeModal(reservationId);
            }
        } catch (error) {
            console.error('❌ Error handling action:', error);
            const errorMessage = handleDatabaseError(error, 'aksi tabel');
            alert(errorMessage);
            
            logReservationActivity('ERROR', reservationId, { 
                error: error.message,
                action: target.classList.contains('btn-detail') ? 'view_details' : 'change_status'
            });
        }
    });    // Show reservation details modal - ENHANCED with complete database integration
    async function showReservationDetails(reservationId) {
        try {
            console.log('🔍 Showing detailed reservation for ID:', reservationId);
            
            // Show loading state in detail modal
            const detailModal = document.getElementById('detail-modal');
            const detailContent = document.getElementById('detail-content');
            
            if (detailContent) {
                detailContent.innerHTML = `
                    <div class="flex items-center justify-center p-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-color)]"></div>
                        <span class="ml-3 text-[var(--text-muted-color)]">Memuat detail reservasi lengkap...</span>
                    </div>
                `;
            }
            
            if (detailModal) {
                detailModal.classList.remove('hidden');
            }

            // Fetch complete reservation data from database/cache
            const completeReservationData = await getCompleteReservationData(reservationId);
            
            // Populate the modal with enhanced data
            populateDetailModal(completeReservationData);
            
        } catch (error) {
            console.error('❌ Error showing reservation details:', error);
            
            // Show error in modal
            const detailContent = document.getElementById('detail-content');
            if (detailContent) {
                // First try to show data from cache if available
                const cachedReservation = allReservations.find(r => r.id_reservasi == reservationId || String(r.id_reservasi) === String(reservationId));
                
                if (cachedReservation) {
                    console.log('⚠️ API failed, but showing cached data');
                    populateDetailModal(cachedReservation);
                } else {
                    detailContent.innerHTML = `
                        <div class="text-center p-8">
                            <div class="text-red-400 mb-4">
                                <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <h3 class="text-lg font-semibold text-[var(--text-color)] mb-2">Gagal Memuat Detail</h3>
                            <p class="text-[var(--text-muted-color)] mb-4">${error.message}</p>
                            <div class="space-x-2">
                                <button onclick="showReservationDetails(${reservationId})" class="px-4 py-2 bg-[var(--primary-color)] text-white rounded hover:bg-[#e08220] transition-colors">
                                    Coba Lagi
                                </button>
                                <button onclick="this.closest('.modal').classList.add('hidden')" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
                                    Tutup
                                </button>
                            </div>
                        </div>
                    `;
                }
            }
        }
    }

    // Enhance reservation data with additional database information
    async function enhanceReservationData(reservationData) {
        try {
            console.log('🔄 Enhancing reservation data with additional info...');
            
            const enhanced = { ...reservationData };
            
            // Add reservation history or status changes if available
            if (window.reservationAPI.fetchReservationHistory) {
                try {
                    const historyResponse = await window.reservationAPI.fetchReservationHistory(reservationData.id_reservasi);
                    if (historyResponse && historyResponse.data) {
                        enhanced.history = historyResponse.data;
                    }
                } catch (error) {
                    console.log('ℹ️ No history data available:', error.message);
                }
            }
            
            // Add payment information if available
            if (window.reservationAPI.fetchPaymentInfo && reservationData.id_reservasi) {
                try {
                    const paymentResponse = await window.reservationAPI.fetchPaymentInfo(reservationData.id_reservasi);
                    if (paymentResponse && paymentResponse.data) {
                        enhanced.payment_info = paymentResponse.data;
                    }
                } catch (error) {
                    console.log('ℹ️ No payment data available:', error.message);
                }
            }
            
            console.log('✅ Enhanced reservation data:', enhanced);
            return enhanced;
            
        } catch (error) {
            console.warn('⚠️ Failed to enhance reservation data:', error.message);
            return reservationData; // Return original data if enhancement fails
        }
    }    // Populate detail modal with comprehensive reservation data from database - ENHANCED pricing
    function populateDetailModal(reservation) {
        const detailContent = document.getElementById('detail-content');
        
        // Calculate costs using helper function with safe values
        const roomPrice = safeNumber(reservation.harga_kamar || reservation.harga, 0);
        
        // Add more detailed debugging
        console.log('🔍 Room price sources:', {
            harga_kamar: reservation.harga_kamar,
            harga: reservation.harga,
            roomPrice: roomPrice,
            typeof_harga_kamar: typeof reservation.harga_kamar,
            typeof_harga: typeof reservation.harga
        });
        
        const costs = calculateReservationCosts(
            reservation.tanggal_checkin,
            reservation.tanggal_checkout,
            roomPrice,
            reservation.total_biaya
        );
        
        // Debug logging to catch NaN values
        console.log('🔍 Detail Modal Debug:', {
            reservation_id: reservation.id_reservasi,
            harga_kamar: reservation.harga_kamar,
            harga: reservation.harga,
            roomPrice: roomPrice,
            checkin: reservation.tanggal_checkin,
            checkout: reservation.tanggal_checkout,
            total_biaya: reservation.total_biaya,
            costs: costs
        });
        
        // Format additional information safely
        const createdDate = reservation.tanggal_reservasi ? formatDate(reservation.tanggal_reservasi) : '-';
        const createdTime = reservation.waktu_reservasi || (reservation.tanggal_reservasi ? 
            new Date(reservation.tanggal_reservasi).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-');
        
        // Build comprehensive detail view
        let detailHTML = `
            <div class="space-y-6">
                <!-- Header Section -->
                <div class="bg-gradient-to-r from-[var(--primary-color)] to-[#e08220] p-4 rounded-lg text-white">
                    <div class="flex justify-between items-start">
                        <div>
                            <h2 class="text-xl font-bold">Reservasi #${reservation.id_reservasi}</h2>
                            <p class="opacity-90">${reservation.nama_tamu}</p>
                        </div>
                        <div class="text-right">
                            <span class="status-badge ${getStatusBadgeClass(reservation.status_reservasi)} !bg-white !bg-opacity-20 !text-white border border-white border-opacity-30">
                                ${reservation.status_reservasi}
                            </span>
                            <p class="text-sm opacity-90 mt-1">Total: ${safeFormatCurrency(costs.finalTotal)}</p>
                        </div>
                    </div>
                </div>

                <!-- Main Information Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Guest Information -->
                    <div class="bg-[var(--card-bg-color)] p-4 rounded-lg border border-[var(--input-border-color)]">
                        <h3 class="text-lg font-semibold text-[var(--primary-color)] mb-4 flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                            Informasi Tamu
                        </h3>
                        <div class="space-y-3">
                            <div>
                                <label class="text-sm font-medium text-[var(--text-muted-color)]">Nama Lengkap</label>
                                <p class="text-[var(--text-color)] font-medium">${reservation.nama_tamu || '-'}</p>
                            </div>
                            ${reservation.email_tamu ? `
                                <div>
                                    <label class="text-sm font-medium text-[var(--text-muted-color)]">Email</label>
                                    <p class="text-[var(--text-color)]">${reservation.email_tamu}</p>
                                </div>
                            ` : ''}
                            ${reservation.no_hp_tamu ? `
                                <div>
                                    <label class="text-sm font-medium text-[var(--text-muted-color)]">No. Telepon</label>
                                    <p class="text-[var(--text-color)]">${reservation.no_hp_tamu}</p>
                                </div>
                            ` : ''}
                            ${reservation.alamat_tamu ? `
                                <div>
                                    <label class="text-sm font-medium text-[var(--text-muted-color)]">Alamat</label>
                                    <p class="text-[var(--text-color)]">${reservation.alamat_tamu}</p>
                                </div>
                            ` : ''}
                            <div>
                                <label class="text-sm font-medium text-[var(--text-muted-color)]">Jumlah Tamu</label>
                                <p class="text-[var(--text-color)] font-medium">${safeInteger(reservation.jumlah_tamu, 1)} orang</p>
                            </div>
                        </div>
                    </div>

                    <!-- Room Information -->
                    <div class="bg-[var(--card-bg-color)] p-4 rounded-lg border border-[var(--input-border-color)]">
                        <h3 class="text-lg font-semibold text-[var(--primary-color)] mb-4 flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>
                            Detail Kamar
                        </h3>                        <div class="space-y-3">
                            <div>
                                <label class="text-sm font-medium text-[var(--text-muted-color)]">Tipe Kamar</label>
                                <p class="text-[var(--text-color)] font-medium">${reservation.tipe_kamar || '-'}</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-[var(--text-muted-color)]">Nomor Kamar</label>
                                <p class="text-[var(--text-color)] font-medium">
                                    ${(() => {
                                        // Show room number only for confirmed reservations
                                        if (reservation.status_reservasi === 'Dikonfirmasi' || 
                                            reservation.status_reservasi === 'Check-In' || 
                                            reservation.status_reservasi === 'Check-Out') {
                                            return reservation.no_kamar_assigned || reservation.no_kamar || 'Akan ditentukan sistem';
                                        } else {
                                            return 'Akan ditentukan setelah dikonfirmasi';
                                        }
                                    })()}
                                </p>
                            </div>
                            ${reservation.kapasitas_maks ? `
                                <div>
                                    <label class="text-sm font-medium text-[var(--text-muted-color)]">Kapasitas Maksimal</label>
                                    <p class="text-[var(--text-color)]">${safeInteger(reservation.kapasitas_maks)} orang</p>
                                </div>
                            ` : ''}
                            <div>
                                <label class="text-sm font-medium text-[var(--text-muted-color)]">Harga per Malam</label>
                                <p class="text-[var,--text-color)] font-medium">${safeFormatCurrency(costs.roomPricePerNight)}</p>
                            </div>
                            ${reservation.deskripsi_kamar ? `
                                <div>
                                    <label class="text-sm font-medium text-[var(--text-muted-color)]">Deskripsi Kamar</label>
                                    <p class="text-[var(--text-color)] text-sm">${reservation.deskripsi_kamar}</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Schedule & Cost Information -->
                <div class="bg-[var(--card-bg-color)] p-4 rounded-lg border border-[var(--input-border-color)]">
                    <h3 class="text-lg font-semibold text-[var(--primary-color)] mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        Jadwal & Biaya
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                            <label class="text-sm font-medium text-[var(--text-muted-color)]">Check-in</label>
                            <p class="text-[var(--text-color)] font-medium">${formatDate(reservation.tanggal_checkin)}</p>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-[var(--text-muted-color)]">Check-out</label>
                            <p class="text-[var(--text-color)] font-medium">${formatDate(reservation.tanggal_checkout)}</p>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-[var(--text-muted-color)]">Lama Menginap</label>
                            <p class="text-[var(--text-color)] font-medium">${safeInteger(costs.nights)} malam</p>
                        </div>                        <div>
                            <label class="text-sm font-medium text-[var(--text-muted-color)]">Harga per Malam</label>
                            <p class="text-[var(--text-color)] font-medium">${safeFormatCurrency(costs.roomPricePerNight)}</p>
                        </div>
                    </div>
                    
                    <!-- Price Breakdown -->
                    <div class="bg-[var(--input-bg-color)] p-4 rounded-lg">
                        <h4 class="font-medium text-[var(--text-color)] mb-3">Rincian Biaya</h4>
                        <div class="space-y-2">
                            <div class="flex justify-between items-center">
                                <span class="text-[var(--text-muted-color)]">Subtotal (${safeInteger(costs.nights)} malam × ${safeFormatCurrency(costs.roomPricePerNight)})</span>
                                <span class="text-[var(--text-color)] font-medium">${safeFormatCurrency(costs.subtotal)}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-[var(--text-muted-color)]">PPN ${Math.round((costs.ppnRate || 0.10) * 100)}%</span>
                                <span class="text-[var(--text-color)] font-medium">${safeFormatCurrency(costs.ppnAmount)}</span>
                            </div>
                            <hr class="border-[var(--input-border-color)]">
                            <div class="flex justify-between items-center">
                                <span class="text-[var(--text-color)] font-semibold">Total Biaya</span>
                                <span class="text-[var(--primary-color)] font-bold text-xl">${safeFormatCurrency(costs.finalTotal)}</span>
                            </div>
                            ${costs.isUsingDatabaseTotal ? `
                                <div class="text-xs text-[var(--text-muted-color)] mt-2">
                                    <i>* Total dari database: ${safeFormatCurrency(reservation.total_biaya)} (Kalkulasi: ${safeFormatCurrency(costs.calculatedTotal)})</i>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Reservation Details -->
                <div class="bg-[var(--card-bg-color)] p-4 rounded-lg border border-[var(--input-border-color)]">
                    <h3 class="text-lg font-semibold text-[var(--primary-color)] mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        Detail Reservasi
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm font-medium text-[var(--text-muted-color)]">Tanggal Reservasi</label>
                            <p class="text-[var(--text-color)]">${createdDate}</p>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-[var(--text-muted-color)]">Waktu Reservasi</label>
                            <p class="text-[var(--text-color)]">${createdTime}</p>
                        </div>
                        ${reservation.metode_pembayaran ? `
                            <div>
                                <label class="text-sm font-medium text-[var(--text-muted-color)]">Metode Pembayaran</label>
                                <p class="text-[var(--text-color)]">${reservation.metode_pembayaran}</p>
                            </div>
                        ` : ''}
                        ${reservation.id_resepsionis ? `
                            <div>
                                <label class="text-sm font-medium text-[var(--text-muted-color)]">Diproses oleh</label>
                                <p class="text-[var(--text-color)]">Resepsionis ID: ${reservation.id_resepsionis}</p>
                            </div>
                        ` : ''}
                    </div>
                    ${reservation.catatan ? `
                        <div class="mt-4">
                            <label class="text-sm font-medium text-[var(--text-muted-color)]">Catatan</label>
                            <p class="text-[var,--text-color)] bg-[var(--input-bg-color)] p-3 rounded mt-1">${reservation.catatan}</p>
                        </div>
                    ` : ''}
                </div>
        `;

        // Add payment information if available
        if (reservation.payment_info && reservation.payment_info.length > 0) {
            detailHTML += `
                <div class="bg-[var(--card-bg-color)] p-4 rounded-lg border border-[var(--input-border-color)]">
                    <h3 class="text-lg font-semibold text-[var(--primary-color)] mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        Informasi Pembayaran
                    </h3>
                    <div class="space-y-3">
                        ${reservation.payment_info.map(payment => `
                            <div class="flex justify-between items-center p-3 bg-[var(--input-bg-color)] rounded">
                                <div>
                                    <p class="font-medium text-[var(--text-color)]">${safeFormatCurrency(payment.jumlah_bayar)}</p>
                                    <p class="text-sm text-[var(--text-muted-color)]">${formatDate(payment.tanggal_bayar)} - ${payment.metode_bayar || 'Tunai'}</p>
                                </div>
                                <span class="status-badge ${payment.status_bayar === 'Lunas' ? 'status-completed' : 'status-pending'}">
                                    ${payment.status_bayar || 'Pending'}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Add history if available
        if (reservation.history && reservation.history.length > 0) {
            detailHTML += `
                <div class="bg-[var(--card-bg-color)] p-4 rounded-lg border border-[var(--input-border-color)]">
                    <h3 class="text-lg font-semibold text-[var(--primary-color)] mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Riwayat Status
                    </h3>
                    <div class="space-y-2">
                        ${reservation.history.map(entry => `
                            <div class="flex justify-between items-center p-2 border-l-4 border-[var(--primary-color)] bg-[var(--input-bg-color)] rounded-r">
                                <div>
                                    <p class="font-medium text-[var(--text-color)]">${entry.status || entry.keterangan}</p>
                                    <p class="text-sm text-[var(--text-muted-color)]">${formatDate(entry.tanggal)} ${entry.waktu || ''}</p>
                                </div>
                                ${entry.petugas ? `<p class="text-xs text-[var(--text-muted-color)]">oleh: ${entry.petugas}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        detailHTML += `
            </div>
        `;
        
        detailContent.innerHTML = detailHTML;
    }    // Show status change modal
    function showStatusChangeModal(reservationId) {
        console.log('🔧 Opening status modal for reservation ID:', reservationId);
        
        // Find the current reservation to get its status
        const currentReservation = allReservations.find(res => res.id_reservasi == reservationId);
        console.log('🔍 Found reservation:', currentReservation);
        
        document.getElementById('status-reservation-id').value = reservationId;
        console.log('✅ Set reservation ID in modal:', document.getElementById('status-reservation-id').value);
        
        // Set current status as default in the dropdown
        const statusSelect = document.getElementById('new-status');
        if (currentReservation && statusSelect) {
            statusSelect.value = currentReservation.status_reservasi;
        }
        
        document.getElementById('status-modal').classList.remove('hidden');
    }
    // Toggle mobile menu
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Initialize: load reservations from database
    await loadReservations();
    
    // Check if there are filter parameters from URL (e.g., from dashboard)
    const urlParams = new URLSearchParams(window.location.search);
    const filterFromUrl = urlParams.get('filter');    if (filterFromUrl) {
        if (filterFromUrl === 'baru') {
            filterStatusSelect.value = 'Menunggu Konfirmasi';        } else if (filterFromUrl === 'checkin_hari_ini') {
            const today = new Date();
            filterCheckinDateInput.value = getLocalDateString(today);
            filterStatusSelect.value = 'Dikonfirmasi'; // Or other relevant status for check-in
        }
        applyFilters();
    }

    // Handle modal close buttons
    const closeDetailModal = document.getElementById('close-detail-modal');
    const closeStatusModal = document.getElementById('close-status-modal');
    const closeNewReservationModal = document.getElementById('close-new-reservation-modal');
    const cancelStatusChange = document.getElementById('cancel-status-change');
    const cancelNewReservation = document.getElementById('cancel-new-reservation');

    if (closeDetailModal) {
        closeDetailModal.addEventListener('click', () => {
            document.getElementById('detail-modal').classList.add('hidden');
        });
    }

    if (closeStatusModal) {
        closeStatusModal.addEventListener('click', () => {
            document.getElementById('status-modal').classList.add('hidden');
        });
    }

    if (closeNewReservationModal) {
        closeNewReservationModal.addEventListener('click', () => {
            document.getElementById('new-reservation-modal').classList.add('hidden');
        });
    }

    if (cancelStatusChange) {
        cancelStatusChange.addEventListener('click', () => {
            document.getElementById('status-modal').classList.add('hidden');
        });
    }

    if (cancelNewReservation) {
        cancelNewReservation.addEventListener('click', () => {
            document.getElementById('new-reservation-modal').classList.add('hidden');
        });
    }    // Handle status form submission with enhanced database integration
    const statusForm = document.getElementById('status-form');
    if (statusForm) {
        statusForm.addEventListener('submit', async (e) => {
            e.preventDefault();            const reservationId = document.getElementById('status-reservation-id').value;
            const newStatus = document.getElementById('new-status').value;
            const statusNotes = document.getElementById('status-notes')?.value || '';
            
            console.log('📋 Form values retrieved:', {
                reservationId: reservationId,
                newStatus: newStatus,
                statusNotes: statusNotes,
                reservationIdType: typeof reservationId,
                newStatusType: typeof newStatus
            });
            
            // Validate inputs
            if (!reservationId || reservationId === '' || reservationId === 'undefined') {
                alert('ID Reservasi tidak valid');
                return;
            }
            
            if (!newStatus || newStatus === '') {
                alert('Status baru harus dipilih');
                return;
            }
              // Show loading state
            const submitBtn = statusForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            try {
                // Logic to prevent confirming reservation if payment is pending verification
                if (newStatus === 'Dikonfirmasi') {
                    console.log('🔍 Validating payment status for confirmation...');
                    const reservationData = await getCompleteReservationData(reservationId);
                    const paymentInfo = reservationData.payment_info;

                    // Check if there is any payment with status 'Menunggu Verifikasi'
                    if (paymentInfo && paymentInfo.some(p => p.status_bayar === 'Menunggu Verifikasi')) {
                        alert('Reservasi tidak dapat dikonfirmasi karena status pembayaran masih "Menunggu Verifikasi". Silakan ubah status pembayaran menjadi "Lunas" atau batalkan pembayaran di halaman Kelola Pembayaran.');
                        return; // Stop execution.
                    }
                    console.log('✅ Payment status is valid for confirmation.');
                }

                console.log('🔄 Updating reservation status...', { reservationId, newStatus, statusNotes });
                
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>';                // Update status via API with enhanced data
                console.log('🔄 Updating status for reservation:', reservationId, 'to:', newStatus);
                
                const response = await window.reservationAPI.updateReservationStatus(reservationId, newStatus, null, statusNotes);
                console.log('✅ Status update response:', response);                if (response && (response.success !== false)) {
                    // Success - refresh the entire reservation list to ensure data consistency
                    console.log('✅ Status updated successfully, refreshing data...');
                    
                    // Show temporary notification that refresh is happening
                    const tempNotification = document.createElement('div');
                    tempNotification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity';
                    tempNotification.innerHTML = '✅ Status diperbarui, memuat ulang data...';
                    document.body.appendChild(tempNotification);
                    
                    // Show loading indicator
                    showLoading();
                    
                    try {
                        // Force a complete reload to get fresh data from database
                        await loadReservations();
                        console.log('✅ Reservation list refreshed successfully');
                        
                        // Apply current filters to maintain view state
                        applyFilters();
                        
                        // Update notification
                        tempNotification.innerHTML = '✅ Data berhasil dimuat ulang!';
                        tempNotification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity';
                        
                    } catch (refreshError) {
                        console.warn('⚠️ Failed to refresh reservation list:', refreshError);
                        // Hide loading and show error if refresh fails
                        hideLoading();
                        
                        // Update notification to show error
                        tempNotification.innerHTML = '⚠️ Gagal memuat ulang data';
                        tempNotification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity';
                        
                        showError('Data berhasil diubah, tetapi gagal memuat ulang daftar. Silakan refresh halaman.');
                        
                        // Remove notification after delay

                        setTimeout(() => {
                            if (tempNotification.parentNode) {
                                tempNotification.parentNode.removeChild(tempNotification);
                            }
                        }, 3000);
                        
                        return; // Don't show success message if refresh failed
                    }
                    
                   
                    // Remove the notification after 2 seconds
                    setTimeout(() => {
                        tempNotification.style.opacity = '0';
                        setTimeout(() => {
                            if (tempNotification.parentNode) {
                                tempNotification.parentNode.removeChild(tempNotification);
                            }
                        }, 300);
                    }, 2000);
                      // Show success message after successful refresh with more specific info
                    let successMessage = 'Status reservasi berhasil diperbarui!';
                    if (newStatus === 'Dikonfirmasi') {
                        successMessage = 'Reservasi berhasil dikonfirmasi! Nomor kamar telah ditentukan oleh sistem.';
                    }
                    alert(successMessage);
                    
                    // Close modal and reset form
                    document.getElementById('status-modal').classList.add('hidden');
                    statusForm.reset();
                    
                } else {
                    throw new Error(response?.message || 'Gagal memperbarui status reservasi');
                }
            } catch (error) {
                console.error('❌ Status update error:', error);
                alert('Gagal mengubah status: ' + error.message);
            } finally {
                // Restore button state
                const submitBtn = statusForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    }

    // Handle new reservation form submission
    const newReservationForm = document.getElementById('new-reservation-form');
    if (newReservationForm) {
        newReservationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
              // Show loading state
            const submitBtn = newReservationForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            try {
                // Collect form data
                const formData = collectReservationFormData();
                
                // Validate required fields
                const validation = validateReservationData(formData);
                if (!validation.isValid) {
                    alert(validation.message);
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = 'Membuat Reservasi...';

                console.log('🔄 Creating new reservation:', formData);

                // Submit to API
                const response = await createNewReservation(formData);
                  if (response.success) {
                    console.log('✅ Reservation created successfully, refreshing data...');
                    
                    // Show temporary notification
                    const tempNotification = document.createElement('div');
                    tempNotification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity';
                    tempNotification.innerHTML = '✅ Reservasi dibuat, memuat ulang data...';
                    document.body.appendChild(tempNotification);
                    
                    // Close modal and reset form first
                    document.getElementById('new-reservation-modal').classList.add('hidden');
                    newReservationForm.reset();
                    document.getElementById('available-rooms').classList.add('hidden');
                    document.getElementById('room-selection-info').classList.remove('hidden');
                    
                    // Show loading indicator
                    showLoading();
                    
                    try {
                        // Refresh reservations list with fresh data
                        await loadReservations();
                        console.log('✅ Reservation list refreshed after creation');
                        
                        // Apply current filters
                        applyFilters();
                        
                        // Update notification
                        tempNotification.innerHTML = '✅ Reservasi berhasil dibuat dan data dimuat ulang!';
                        tempNotification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity';
                        
                    } catch (refreshError) {
                        console.warn('⚠️ Failed to refresh after creating reservation:', refreshError);
                        hideLoading();
                        
                        // Update notification to show partial success
                        tempNotification.innerHTML = '⚠️ Reservasi dibuat, gagal memuat ulang data';
                        tempNotification.className = 'fixed top-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity';
                        
                        showError('Reservasi berhasil dibuat, tetapi gagal memuat ulang daftar. Silakan refresh halaman.');
                    }
                    
                    // Remove notification after delay
                    setTimeout(() => {
                        tempNotification.style.opacity = '0';
                        setTimeout(() => {
                            if (tempNotification.parentNode) {
                                tempNotification.parentNode.removeChild(tempNotification);
                            }
                        }, 300);
                    }, 3000);
                    
                    // Show success alert
                    alert('Reservasi berhasil dibuat!');
                    
                } else {
                    throw new Error(response.message || 'Gagal membuat reservasi');
                }
            } catch (error) {
                console.error('❌ Error creating reservation:', error);
                alert('Gagal membuat reservasi: ' + error.message);            } finally {
                // Reset button state
                const submitBtn = newReservationForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    }

    // Function to collect form data
    function collectReservationFormData() {
        const selectedRoomData = document.getElementById('selected-room-data');
        const selectedGuestId = document.getElementById('selected-guest-id');
        
        let roomData = null;
        try {
            roomData = selectedRoomData ? JSON.parse(selectedRoomData.value) : null;
        } catch (e) {
            console.warn('Failed to parse selected room data');
        }

        return {
            // Guest information
            guestId: selectedGuestId ? selectedGuestId.value : null,
            guestName: document.getElementById('guest-name').value.trim(),
            guestEmail: document.getElementById('guest-email').value.trim(),
            guestPhone: document.getElementById('guest-phone').value.trim(),
            guestAddress: document.getElementById('guest-address').value.trim(),
            
            // Reservation details
            roomType: document.getElementById('room-type').value,
            checkinDate: document.getElementById('checkin-date').value,
            checkoutDate: document.getElementById('checkout-date').value,
            guestCount: parseInt(document.getElementById('guest-count').value) || 1,
            
            // Selected room data
            selectedRoom: roomData
        };
    }

    // Function to validate reservation data
    function validateReservationData(data) {
        if (!data.guestName) {
            return { isValid: false, message: 'Nama tamu harus diisi' };
        }
        
        if (!data.guestPhone) {
            return { isValid: false, message: 'No. HP tamu harus diisi' };
        }
        
        if (!data.roomType) {
            return { isValid: false, message: 'Tipe kamar harus dipilih' };
        }
          if (!data.checkinDate || !data.checkoutDate) {
            return { isValid: false, message: 'Tanggal check-in dan check-out harus diisi' };
        }
        
        // Validate dates - check-out must be after check-in
        const checkinDate = new Date(data.checkinDate);
        const checkoutDate = new Date(data.checkoutDate);
        
        if (checkoutDate <= checkinDate) {
            return { isValid: false, message: 'Tanggal check-out harus setelah tanggal check-in' };
        }
        
        // Check if check-in date is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        checkinDate.setHours(0, 0, 0, 0);
        
        if (checkinDate < today) {
            return { isValid: false, message: 'Tanggal check-in tidak boleh di masa lalu' };
        }
        
        if (!data.selectedRoom) {
            return { isValid: false, message: 'Kamar harus dipilih' };
        }
        
        return { isValid: true };
    }    // Function to create new reservation - use relative URL
    async function createNewReservation(formData) {
        try {
            // Calculate total cost with 10% PPN - fix timezone issue
            const [checkinYear, checkinMonth, checkinDay] = formData.checkinDate.split('-').map(Number);
            const [checkoutYear, checkoutMonth, checkoutDay] = formData.checkoutDate.split('-').map(Number);
            const checkinDate = new Date(checkinYear, checkinMonth - 1, checkinDay);
            const checkoutDate = new Date(checkoutYear, checkoutMonth - 1, checkoutDay);
            const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
            const subtotal = formData.selectedRoom.harga * nights;
            const totalCostWithPPN = subtotal * 1.10; // Add 10% PPN

            // Prepare reservation data
            const reservationData = {
                // Guest data (create new guest if not exists)
                tamu: {
                    id_tamu: formData.guestId || null,
                    nama: formData.guestName,
                    email: formData.guestEmail || null,
                    no_hp: formData.guestPhone,
                    alamat: formData.guestAddress || null
                },
                
                // Reservation data (without total_biaya as it will be calculated in backend)
                reservasi: {
                    id_kamar: formData.selectedRoom.id_kamar,
                    tanggal_checkin: formData.checkinDate,
                    tanggal_checkout: formData.checkoutDate,
                    jumlah_tamu: formData.guestCount,
                    status_reservasi: 'Dikonfirmasi', // Set as confirmed since created by receptionist
                    catatan: `Reservasi dibuat oleh resepsionis untuk kamar ${formData.selectedRoom.no_kamar}. Subtotal: ${formatCurrency(subtotal)}, Total dengan PPN 10%: ${formatCurrency(totalCostWithPPN)}`
                }
            };

            console.log('📝 Sending reservation data:', reservationData);

            // Make API call - use relative URL
            const response = await fetch('/api/reservasi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(reservationData)
            });

            // Check if response is JSON before parsing
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Server returned non-JSON response (${response.status})`);
            }

            const result = await response.json();
            console.log('✅ Create reservation response:', result);

            if (!response.ok) {
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error('❌ Error in createNewReservation:', error);
            throw error;
        }
    }

    // Helper function to safely fetch additional reservation data
    async function safelyFetchData(apiFunction, ...args) {
        try {
            const result = await apiFunction(...args);
            return result && result.data ? result.data : result;
        } catch (error) {
            console.warn(`⚠️ Failed to fetch additional data:`, error.message);
            return null;
        }
    }    // Enhanced function to get reservation with all related data
    async function getCompleteReservationData(reservationId) {
        try {
            console.log('🔍 Fetching complete reservation data for ID:', reservationId);
            
            // Always start with local cache first to avoid unnecessary API calls
            let reservation = allReservations.find(r => r.id_reservasi == reservationId);
            
            if (reservation) {
                console.log('✅ Found reservation in local cache');
            } else {
                console.warn('⚠️ Reservation not found in cache, searching with string comparison...');
                // Try string comparison in case of type mismatch
                reservation = allReservations.find(r => String(r.id_reservasi) === String(reservationId));
            }
            
            // If still not found, try API as last resort
            if (!reservation) {
                console.log('🌐 Attempting to fetch from API...');
                try {
                    const reservationResponse = await window.reservationAPI.fetchReservationById(reservationId);
                    
                    if (reservationResponse && reservationResponse.data) {
                        reservation = reservationResponse.data;
                        console.log('✅ Fetched reservation from API');
                    } else if (reservationResponse && !reservationResponse.success && Array.isArray(reservationResponse)) {
                        reservation = reservationResponse.find(r => r.id_reservasi == reservationId);
                    } else if (reservationResponse) {
                        reservation = reservationResponse;
                    }
                } catch (apiError) {
                    console.warn('⚠️ API fetch failed:', apiError.message);
                    // Final attempt: refresh all reservations and try again
                    try {
                        console.log('🔄 Refreshing all reservations and retrying...');
                        await loadReservations(); // Refresh the cache
                        reservation = allReservations.find(r => r.id_reservasi == reservationId || String(r.id_reservasi) === String(reservationId));
                    } catch (refreshError) {
                        console.error('❌ Failed to refresh reservations:', refreshError);
                    }
                }
            }
            
            if (!reservation) {
                throw new Error(`Data reservasi dengan ID ${reservationId} tidak ditemukan`);
            }
            
            console.log('✅ Successfully found reservation:', reservation);
            
            // Fetch additional data in parallel (with error handling)
            const [paymentData, guestHistory, roomDetails] = await Promise.allSettled([
                // Payment information
                window.reservationAPI.fetchPaymentsByReservation ? 
                    safelyFetchData(window.reservationAPI.fetchPaymentsByReservation, reservationId) : 
                    Promise.resolve(null),
                
                // Guest history (if guest exists)
                reservation.id_tamu && window.reservationAPI.fetchGuestHistory ? 
                    safelyFetchData(window.reservationAPI.fetchGuestHistory, reservation.id_tamu) : 
                    Promise.resolve(null),
                
                // Room details (if room is assigned)
                reservation.id_kamar && window.reservationAPI.fetchRoomDetails ? 
                    safelyFetchData(window.reservationAPI.fetchRoomDetails, reservation.id_kamar) : 
                    Promise.resolve(null)
            ]);
            
            // Merge additional data
            const enhancedReservation = {
                ...reservation,
                payment_info: paymentData.status === 'fulfilled' ? paymentData.value : null,
                guest_history: guestHistory.status === 'fulfilled' ? guestHistory.value : null,
                room_details: roomDetails.status === 'fulfilled' ? roomDetails.value : null
            };
            
            console.log('✅ Complete reservation data loaded:', enhancedReservation);
            return enhancedReservation;
            
        } catch (error) {
            console.error('❌ Error fetching complete reservation data:', error);
            throw error;
        }
    }

    // Function to refresh reservation data after status updates
    async function refreshReservationData(reservationId) {
        try {
            console.log('🔄 Refreshing reservation data...');
            
            // Reload the specific reservation
            const updatedReservation = await getCompleteReservationData(reservationId);
            
            // Update in allReservations array
            const index = allReservations.findIndex(r => r.id_reservasi == reservationId);
            if (index !== -1) {
                allReservations[index] = updatedReservation;
                console.log('✅ Updated reservation in cache');
            }
            
            // Refresh the display
            applyFilters();
            
            return updatedReservation;
        } catch (error) {
            console.error('❌ Error refreshing reservation data:', error);
            throw error;
        }
    }

    // Enhanced error handling for database operations
    function handleDatabaseError(error, operation = 'operasi database') {
        console.error(`❌ Database error during ${operation}:`, error);
        
        let userMessage = 'Terjadi kesalahan sistem. ';
        
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
            userMessage += 'Periksa koneksi internet Anda.';
        } else if (error.message?.includes('unauthorized') || error.message?.includes('403')) {
            userMessage += 'Akses ditolak. Silakan login ulang.';
        } else if (error.message?.includes('not found') || error.message?.includes('404')) {
            userMessage += 'Data tidak ditemukan.';
        } else if (error.message?.includes('timeout')) {
            userMessage += 'Koneksi timeout. Coba lagi.';
        } else {
            userMessage += error.message || 'Silakan coba lagi atau hubungi administrator.';
        }
        
        return userMessage;
    }

    // Function to validate reservation data completeness
    function validateReservationCompleteness(reservation) {
        const missingFields = [];
        
        if (!reservation.nama_tamu) missingFields.push('Nama Tamu');
        if (!reservation.tanggal_checkin) missingFields.push('Tanggal Check-in');
        if (!reservation.tanggal_checkout) missingFields.push('Tanggal Check-out');
        if (!reservation.tipe_kamar) missingFields.push('Tipe Kamar');
        if (!reservation.harga_kamar) missingFields.push('Harga Kamar');
        
        return {
            isComplete: missingFields.length === 0,
            missingFields,
            completenessScore: Math.round(((5 - missingFields.length) / 5) * 100)
        };
    }

    // Function to log reservation activity for debugging
    function logReservationActivity(activity, reservationId, details = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            activity,
            reservationId,
            details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.log(`📝 [${timestamp}] ${activity} - Reservation ${reservationId}:`, logEntry);
        
        // Store in sessionStorage for debugging (last 50 entries)
        try {
            const logs = JSON.parse(sessionStorage.getItem('reservationLogs') || '[]');
            logs.unshift(logEntry);
            
            // Keep only last 50 entries
            if (logs.length > 50) {
                logs.splice(50);
            }
            
            sessionStorage.setItem('reservationLogs', JSON.stringify(logs));
        } catch (e) {
            console.warn('Failed to store log:', e);
        }
    }

    // Debug function to export logs
    window.exportReservationLogs = function() {
        const logs = JSON.parse(sessionStorage.getItem('reservationLogs') || '[]');
        const dataStr = JSON.stringify(logs, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `reservation-logs-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };    // Helper function to calculate reservation costs with PPN
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
            
            // Validate room price
            if (isNaN(validRoomPrice) || validRoomPrice < 0) {
                console.warn('⚠️ Invalid room price:', roomPrice);
            }
            
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
            
            console.log('💰 Cost calculation result (with PPN for payment):', result);
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
    }    // Helper function to format price breakdown for display
    function formatPriceBreakdown(costs) {
        return `
            <div class="bg-[var(--input-bg-color)] p-3 rounded-lg text-sm">
                <div class="flex justify-between mb-1">
                    <span>Subtotal (${costs.nights} malam × ${formatCurrency(costs.roomPricePerNight)})</span>
                    <span>${formatCurrency(costs.subtotal)}</span>
                </div>
                <div class="flex justify-between mb-1">
                    <span>PPN ${Math.round(costs.ppnRate * 100)}%</span>
                    <span>${formatCurrency(costs.ppnAmount)}</span>
                </div>
                <hr class="border-[var(--input-border-color)] my-2">
                <div class="flex justify-between font-semibold">
                    <span>Total</span>
                    <span class="text-[var(--primary-color)]">${formatCurrency(costs.finalTotal)}</span>
                </div>
                ${costs.isUsingDatabaseTotal ? 
                    '<div class="text-xs text-[var(--text-muted-color)] mt-1"><i>* Menggunakan total dari database</i></div>' : 
                    ''
                }
            </div>
        `;
    }

    // Helper function to safely format values and prevent NaN display
    function safeFormatCurrency(value) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue === null || numValue === undefined) {
            return formatCurrency(0);
        }
        return formatCurrency(numValue);
    }

    // Helper function to safely get number values
    function safeNumber(value, defaultValue = 0) {
        const numValue = parseFloat(value);
        return isNaN(numValue) ? defaultValue : numValue;
    }

    // Helper function to safely get integer values  
    function safeInteger(value, defaultValue = 1) {
        const intValue = parseInt(value);
        return isNaN(intValue) ? defaultValue : Math.max(intValue, defaultValue);
    }

    // Function to get payment amount including PPN for payment management
    function getPaymentAmountWithPPN(reservation) {
        try {
            // Ensure we have all required data
            if (!reservation) {
                console.warn('⚠️ No reservation data provided for payment calculation');
                return 0;
            }

            // Use calculated costs if available, otherwise calculate
            let costs;
            if (reservation.calculated_costs) {
                costs = reservation.calculated_costs;
            } else {
                const roomPrice = safeNumber(reservation.harga_kamar || reservation.harga, 0);
                costs = calculateReservationCosts(
                    reservation.tanggal_checkin,
                    reservation.tanggal_checkout,
                    roomPrice,
                    reservation.total_biaya
                );
            }

            // Return the final total which includes PPN
            const paymentAmount = costs.finalTotal;
            
            console.log('💰 Payment amount with PPN for reservation', reservation.id_reservasi, ':', {
                subtotal: costs.subtotal,
                ppnAmount: costs.ppnAmount,
                finalTotal: costs.finalTotal,
                paymentAmount: paymentAmount
            });

            return paymentAmount;
        } catch (error) {
            console.error('❌ Error calculating payment amount with PPN:', error);
            return 0;
        }
    }

    // Function to get detailed payment breakdown for payment management
    function getPaymentBreakdown(reservation) {
        try {
            const roomPrice = safeNumber(reservation.harga_kamar || reservation.harga, 0);
            const costs = calculateReservationCosts(
                reservation.tanggal_checkin,
                reservation.tanggal_checkout,
                roomPrice,
                reservation.total_biaya
            );

            return {
                id_reservasi: reservation.id_reservasi,
                nama_tamu: reservation.nama_tamu,
                tipe_kamar: reservation.tipe_kamar,
                no_kamar: reservation.no_kamar,
                checkin: reservation.tanggal_checkin,
                checkout: reservation.tanggal_checkout,
                nights: costs.nights,
                roomPricePerNight: costs.roomPricePerNight,
                subtotal: costs.subtotal,
                ppnRate: costs.ppnRate,
                ppnAmount: costs.ppnAmount,
                totalWithoutPPN: costs.subtotal,
                totalWithPPN: costs.finalTotal,
                paymentAmountDue: costs.finalTotal, // This includes PPN
                breakdown: {
                    baseAmount: costs.subtotal,
                    taxAmount: costs.ppnAmount,
                    finalAmount: costs.finalTotal
                }
            };
        } catch (error) {
            console.error('❌ Error getting payment breakdown:', error);
            return null;
        }
    }

    // Function to expose payment data for external use (payment management)
    window.getReservationPaymentData = function(reservationId) {
        try {
            const reservation = allReservations.find(r => r.id_reservasi == reservationId || String(r.id_reservasi) === String(reservationId));
            
            if (!reservation) {
                console.warn('⚠️ Reservation not found for payment data:', reservationId);
                return null;
            }

            const paymentBreakdown = getPaymentBreakdown(reservation);
            
            console.log('💰 Payment data for reservation', reservationId, ':', paymentBreakdown);
            
            return paymentBreakdown;
        } catch (error) {
            console.error('❌ Error getting reservation payment data:', error);
            return null;
        }
    };

    // Function to get all reservations with payment amounts (for payment management)
    window.getAllReservationsWithPaymentData = function() {
        try {
            return allReservations.map(reservation => {
                const paymentBreakdown = getPaymentBreakdown(reservation);
                
                return {
                    ...reservation,
                    payment_data: paymentBreakdown,
                    payment_amount_due: paymentBreakdown ? paymentBreakdown.paymentAmountDue : 0
                };
            });
        } catch (error) {
            console.error('❌ Error getting all reservations with payment data:', error);
            return [];
        }
    };

    // Enhanced function specifically for payment management interface
    window.getReservationsForPaymentManagement = function() {
        try {
            console.log('💰 Getting reservations for payment management...');
            
            return allReservations.map(reservation => {
                // Calculate costs with PPN
                const roomPrice = safeNumber(reservation.harga_kamar || reservation.harga, 0);
                const costs = calculateReservationCosts(
                    reservation.tanggal_checkin,
                    reservation.tanggal_checkout,
                    roomPrice,
                    reservation.total_biaya
                );
                
                // Format for payment management
                const paymentData = {
                    // Basic reservation info
                    id_reservasi: reservation.id_reservasi,
                    nama_tamu: reservation.nama_tamu,
                    tipe_kamar: reservation.tipe_kamar,
                    no_kamar: reservation.no_kamar,
                    tanggal_checkin: reservation.tanggal_checkin,
                    tanggal_checkout: reservation.tanggal_checkout,
                    status_reservasi: reservation.status_reservasi,
                    
                    // Payment calculation (includes PPN)
                    jumlah_malam: costs.nights,
                    harga_per_malam: costs.roomPricePerNight,
                    subtotal: costs.subtotal,
                    ppn_rate: costs.ppnRate,
                    ppn_amount: costs.ppnAmount,
                    total_tanpa_ppn: costs.subtotal,
                    total_dengan_ppn: costs.finalTotal,
                    total_biaya: costs.finalTotal, // This is what should be paid
                    jumlah_bayar: costs.finalTotal, // Amount to pay (includes PPN)
                    
                    // Payment breakdown for display
                    rincian_biaya: {
                        base_amount: costs.subtotal,
                        tax_label: `PPN ${Math.round(costs.ppnRate * 100)}%`,
                        tax_amount: costs.ppnAmount,
                        final_amount: costs.finalTotal,
                        currency_format: {
                            subtotal: safeFormatCurrency(costs.subtotal),
                            ppn: safeFormatCurrency(costs.ppnAmount),
                            total: safeFormatCurrency(costs.finalTotal)
                        }
                    }
                };
                
                console.log(`💰 Payment data for ${reservation.id_reservasi}:`, {
                    subtotal: paymentData.subtotal,
                    ppn: paymentData.ppn_amount,
                    total: paymentData.total_biaya
                });
                
                return paymentData;
            });
        } catch (error) {
            console.error('❌ Error getting reservations for payment management:', error);
            return [];
        }
    };

    // Function to get single reservation payment data with PPN
    window.getReservationPaymentDetails = function(reservationId) {
        try {
            console.log('💰 Getting payment details for reservation:', reservationId);
            
            const reservation = allReservations.find(r => 
                r.id_reservasi == reservationId || String(r.id_reservasi) === String(reservationId)
            );
            
            if (!reservation) {
                console.warn('⚠️ Reservation not found for payment details:', reservationId);
                return null;
            }
            
            // Get all reservations for payment management and find the specific one
            const allPaymentData = window.getReservationsForPaymentManagement();
            const paymentDetails = allPaymentData.find(p => 
                p.id_reservasi == reservationId || String(p.id_reservasi) === String(reservationId)
            );
            
            console.log('💰 Payment details found:', paymentDetails);
            return paymentDetails;
            
        } catch (error) {
            console.error('❌ Error getting reservation payment details:', error);
            return null;
        }
    };

    // Debug function to verify PPN calculations
    window.debugPaymentCalculations = function() {
        console.log('🔍 DEBUG: Verifying PPN calculations for all reservations...');
        
        allReservations.slice(0, 5).forEach(reservation => {
            const roomPrice = safeNumber(reservation.harga_kamar || reservation.harga, 0);
            const costs = calculateReservationCosts(
                reservation.tanggal_checkin,
                reservation.tanggal_checkout,
                roomPrice,
                reservation.total_biaya
            );
            
            console.log(`💰 Reservation ${reservation.id_reservasi} - ${reservation.nama_tamu}:`);
            console.log(`  - Room Price: ${safeFormatCurrency(roomPrice)}/night`);
            console.log(`  - Nights: ${costs.nights}`);
            console.log(`  - Subtotal: ${safeFormatCurrency(costs.subtotal)}`);
            console.log(`  - PPN 10%: ${safeFormatCurrency(costs.ppnAmount)}`);
            console.log(`  - Total with PPN: ${safeFormatCurrency(costs.finalTotal)}`);
            console.log(`  - Payment Amount Due: ${safeFormatCurrency(costs.paymentAmountDue)}`);
            console.log('  ---');
        });
    };

    // Function to validate that payment amounts include PPN
    window.validatePaymentAmountsIncludePPN = function() {
        console.log('✅ Validating that all payment amounts include PPN...');
        
        const paymentData = window.getReservationsForPaymentManagement();
        let allValid = true;
        
        paymentData.forEach(payment => {
            const expectedTotal = payment.subtotal * 1.10; // Should include 10% PPN
            const actualTotal = payment.jumlah_bayar;
            
            if (Math.abs(expectedTotal - actualTotal) > 1) { // Allow 1 rupiah tolerance for rounding
                console.warn(`⚠️ Payment amount validation failed for reservation ${payment.id_reservasi}:`);
                console.warn(`  Expected (with PPN): ${safeFormatCurrency(expectedTotal)}`);
                console.warn(`  Actual: ${safeFormatCurrency(actualTotal)}`);
                allValid = false;
            } else {
                console.log(`✅ Reservation ${payment.id_reservasi}: Payment amount correctly includes PPN`);
            }
        });
        
        if (allValid) {
            console.log('✅ All payment amounts correctly include PPN (10%)');
        } else {
            console.warn('⚠️ Some payment amounts may not include PPN correctly');
        }
        
        return allValid;
    };

    // Memory Management Best Practices
    // 1. Clear large data structures when not needed
    // 2. Remove event listeners when components are destroyed
    // 3. Clear timers and intervals properly
    // 4. Avoid circular references

    // Global variables for cleanup
    let eventListeners = [];
    let activeTimers = [];

    // Function to register event listeners for cleanup
    function addEventListenerWithCleanup(element, event, handler) {
        element.addEventListener(event, handler);
        eventListeners.push({ element, event, handler });
    }

    // Function to clean up all event listeners
    function cleanupEventListeners() {
        eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        eventListeners = [];
    }

    // Function to register timers for cleanup
    function setTimeoutWithCleanup(callback, delay) {
        const timerId = setTimeout(() => {
            callback();
            // Remove from active timers list
            activeTimers = activeTimers.filter(id => id !== timerId);
        }, delay);
        activeTimers.push(timerId);
        return timerId;
    }

    // Function to clean up all active timers
    function cleanupActiveTimers() {
        activeTimers.forEach(timerId => clearTimeout(timerId));
        activeTimers = [];
    }

    // Clean up when page unloads
    window.addEventListener('beforeunload', () => {
        cleanupEventListeners();
        cleanupActiveTimers();
    });

    // ...existing code...
});