document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth functions to load
    let authCheckAttempts = 0;
    while ((typeof isUserLoggedIn !== 'function' || typeof getLoggedInUser !== 'function') && authCheckAttempts < 50) {
        console.log('Waiting for auth functions to load...');
        await new Promise(resolve => setTimeout(resolve, 100));
        authCheckAttempts++;
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

    const roomsTbody = document.getElementById('rooms-tbody');
    const noRoomsMessage = document.getElementById('no-rooms-message');
    const loadingState = document.getElementById('loading-state');
    
    const searchRoomNumberInput = document.getElementById('search-room-number');
    const filterRoomTypeSelect = document.getElementById('filter-room-type');
    const filterRoomStatusSelect = document.getElementById('filter-room-status');
    const applyRoomFilterBtn = document.getElementById('apply-room-filter-btn');
    const resetRoomFilterBtn = document.getElementById('reset-room-filter-btn');

    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    // Global variables to store data from database
    let allRooms = [];
    let roomTypes = [];

    // Load room types and rooms from database
    async function loadRoomData() {
        try {
            showLoading();
            console.log('🔄 Loading room data from database...');
            
            // Load room types first
            const typesResponse = await fetch('/api/kamar/types', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (typesResponse.ok) {
                const typesResult = await typesResponse.json();
                roomTypes = typesResult.data || [];
                populateRoomTypeFilterOptions();
            }

            // Load rooms with current status
            const roomsResponse = await fetch('/api/kamar/status', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!roomsResponse.ok) {
                const errorData = await roomsResponse.json();
                throw new Error(errorData.error || `HTTP error! status: ${roomsResponse.status}`);
            }

            const roomsResult = await roomsResponse.json();
            console.log('✅ Rooms loaded:', roomsResult);
            
            allRooms = roomsResult.data || [];
            displayRooms(allRooms);
            hideLoading();
            
        } catch (error) {
            console.error('❌ Error loading room data:', error);
            hideLoading();
            showError('Gagal memuat data kamar: ' + error.message);
        }
    }

    function showLoading() {
        if (loadingState) {
            loadingState.classList.remove('hidden');
        }
        if (roomsTbody) {
            roomsTbody.innerHTML = '<tr><td colspan="7" class="text-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-color)] mx-auto"></div></td></tr>';
        }
    }

    function hideLoading() {
        if (loadingState) {
            loadingState.classList.add('hidden');
        }
    }

    function showError(message) {
        if (roomsTbody) {
            roomsTbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-red-500">${message}</td></tr>`;
        }
    }

    function getRoomStatusBadgeClass(status) {
        const s = status?.toLowerCase().replace(/\s+/g, '-') || '';
        
        // Map status kamar ke class yang konsisten
        if (s === "tersedia" || s === "available") return 'status-tersedia';
        if (s === "terisi" || s === "occupied" || s === "ditempati") return 'status-terisi';
        if (s === "dipesan" || s === "reserved") return 'status-pending';
        if (s === "maintenance" || s === "dalam-perbaikan") return 'status-maintenance';
        if (s === "cleaning" || s === "perlu-dibersihkan") return 'status-cleaning';
        if (s === "out-of-order" || s === "tidak-tersedia") return 'status-cancelled';
        
        return 'status-tersedia';
    }

    function getRoomTypeName(tipe) {
        // Use tipe directly if it's already a string, or find from roomTypes if it's an ID
        if (typeof tipe === 'string') {
            return tipe;
        }
        
        const type = roomTypes.find(rt => rt.id === parseInt(tipe) || rt.tipe === tipe);
        return type ? type.tipe : tipe || "Tidak Diketahui";
    }
    
    function populateRoomTypeFilterOptions() {
        filterRoomTypeSelect.innerHTML = '<option value="">Semua Tipe</option>';
        
        // Get unique room types from allRooms
        const uniqueTypes = [...new Set(allRooms.map(room => room.tipe))];
        
        uniqueTypes.forEach(type => {
            if (type) {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                filterRoomTypeSelect.appendChild(option);
            }
        });
    }

    function displayRooms(roomsToDisplay) {
        roomsTbody.innerHTML = ''; 
        if (roomsToDisplay.length === 0) {
            if (noRoomsMessage) noRoomsMessage.style.display = 'block';
            roomsTbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-[var(--text-muted-color)]">Tidak ada kamar ditemukan.</td></tr>`;
            return;
        }
        if (noRoomsMessage) noRoomsMessage.style.display = 'none';

        roomsToDisplay.forEach(room => {
            const row = `
                <tr class="border-b border-[var(--input-border-color)]">
                    <td class="px-4 py-3 font-medium text-[var(--primary-color)] whitespace-nowrap">${room.no_kamar}</td>
                    <td class="px-4 py-3">${getRoomTypeName(room.tipe)}</td>
                    <td class="px-4 py-3 text-center">
                        <span class="status-badge ${getRoomStatusBadgeClass(room.status)}">${room.status || 'Tersedia'}</span>
                    </td>
                    <td class="px-4 py-3">${room.lantai || '-'}</td>
                    <td class="px-4 py-3 text-xs">${room.info_tambahan || room.guest_info || '-'}</td>
                    <td class="px-4 py-3 text-xs max-w-xs truncate" title="${room.catatan || ''}">${room.catatan || '-'}</td>
                    <td class="px-4 py-3 text-center whitespace-nowrap">
                        <div class="action-buttons">
                            <button data-id="${room.id_kamar}" class="btn-action btn-detail btn-text" title="Lihat Detail Kamar">Detail</button>
                            ${(room.status === "Cleaning" || room.status === "Tersedia") ? 
                                `<button data-id="${room.id_kamar}" data-currentstatus="${room.status}" class="btn-action btn-update-status btn-text" title="Update Status Kebersihan">Update HK</button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
            roomsTbody.insertAdjacentHTML('beforeend', row);
        });
    }

    function applyRoomFilters() {
        const roomNumberQuery = searchRoomNumberInput.value.toLowerCase().trim();
        const roomType = filterRoomTypeSelect.value;
        const roomStatus = filterRoomStatusSelect.value;

        let filtered = allRooms.filter(room => {
            const numberMatch = room.no_kamar ? room.no_kamar.toLowerCase().includes(roomNumberQuery) : false;
            const typeMatch = roomType ? room.tipe === roomType : true;
            const statusMatch = roomStatus ? room.status === roomStatus : true;
            return numberMatch && typeMatch && statusMatch;
        });
        displayRooms(filtered);
    }
    
    if (applyRoomFilterBtn) applyRoomFilterBtn.addEventListener('click', applyRoomFilters);
    if (searchRoomNumberInput) searchRoomNumberInput.addEventListener('keyup', (event) => { if(event.key === 'Enter') applyRoomFilters()});


    if (resetRoomFilterBtn) {
        resetRoomFilterBtn.addEventListener('click', () => {
            searchRoomNumberInput.value = '';
            filterRoomTypeSelect.value = '';
            filterRoomStatusSelect.value = '';
            displayRooms(allRooms); 
        });
    }
    
    // Event delegation untuk tombol aksi di tabel
    roomsTbody.addEventListener('click', async (event) => {
        const target = event.target;
        const roomId = target.dataset.id;

        if (!roomId) return;
        
        try {
            if (target.classList.contains('btn-detail')) {
                await showRoomDetails(roomId);
            } else if (target.classList.contains('btn-update-status')) {
                const currentStatus = target.dataset.currentstatus;
                await updateRoomStatus(roomId, currentStatus);
            }
        } catch (error) {
            console.error('❌ Error handling room action:', error);
            alert('Terjadi kesalahan: ' + error.message);
        }
    });

    // Show room details
    async function showRoomDetails(roomId) {
        try {
            const response = await fetch(`/api/kamar/${roomId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Gagal memuat detail kamar');
            }

            const result = await response.json();
            const room = result.data;
            
            alert(`Detail Kamar:\nNomor: ${room.no_kamar}\nTipe: ${room.tipe}\nStatus: ${room.status}\nHarga: ${room.harga ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(room.harga) : 'N/A'}\nKapasitas: ${room.kapasitas_maks || 'N/A'} orang`);
        } catch (error) {
            console.error('❌ Error fetching room details:', error);
            alert('Gagal memuat detail kamar: ' + error.message);
        }
    }

    // Update room status
    async function updateRoomStatus(roomId, currentStatus) {
        try {
            let newStatus = "";
            let confirmationMessage = "";

            if (currentStatus === "Cleaning") {
                newStatus = "Tersedia";
                confirmationMessage = `Ubah status kamar menjadi 'Tersedia' (setelah dikonfirmasi bersih oleh HK)?`;
            } else if (currentStatus === "Tersedia") {
                newStatus = "Cleaning";
                confirmationMessage = `Ubah status kamar menjadi 'Cleaning'? (Perlu dibersihkan)`;
            } else {
                alert("Aksi tidak valid untuk status kamar saat ini.");
                return;
            }
            
            if (!confirm(confirmationMessage)) return;

            const response = await fetch(`/api/kamar/${roomId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    status: newStatus,
                    updated_by: currentUser.id
                })
            });

            if (!response.ok) {
                throw new Error('Gagal mengupdate status kamar');
            }

            alert(`Status kamar berhasil diubah menjadi '${newStatus}'`);
            
            // Reload room data
            await loadRoomData();
            
        } catch (error) {
            console.error('❌ Error updating room status:', error);
            alert('Gagal mengupdate status kamar: ' + error.message);
        }
    }

    // Toggle mobile menu
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Initialize: load room data from database
    await loadRoomData();
});

/*
 * STATUS KAMAR RESEPSIONIS - UPDATED ROOM STATUS LOGIC
 * 
 * Halaman ini telah diperbarui untuk menggunakan logika status kamar yang benar:
 * - Status kamar dihitung berdasarkan reservasi aktif
 * - Kamar 'Tersedia' jika tidak ada reservasi yang overlap
 * - Kamar 'Ditempati' jika ada tamu yang sedang check-in
 * - Kamar 'Dipesan' jika ada reservasi dikonfirmasi untuk masa depan
 */