document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard resepsionis loaded with enhanced features');
    console.log('Current time:', new Date().toLocaleString());

    // Wait for auth functions to load
    let authCheckAttempts = 0;
    while ((typeof isUserLoggedIn !== 'function' || typeof getLoggedInUser !== 'function') && authCheckAttempts < 50) {
        console.log('Waiting for auth functions to load...');
        await new Promise(resolve => setTimeout(resolve, 100));
        authCheckAttempts++;
    }

    // Check authentication using the shared auth functions
    if (typeof isUserLoggedIn !== 'function' || !isUserLoggedIn()) {
        console.log('User not logged in, redirecting...');
        alert("Silakan login terlebih dahulu.");
        window.location.href = '/login.html';
        return;
    }

    const currentUser = getLoggedInUser();
    if (!currentUser || currentUser.role !== 'resepsionis') {
        console.log('User not authorized as resepsionis');
        alert("Akses ditolak. Anda harus login sebagai resepsionis.");
        window.location.href = '/login.html';
        return;
    }

    console.log('Authentication passed, initializing enhanced dashboard...');

    // Initialize dashboard
    await initializeDashboard();

    // Set up mobile menu toggle
    setupMobileMenu();
    
    // Start connection monitoring and auto-refresh
    const enableMonitoring = localStorage.getItem('enableConnectionMonitoring') !== 'false';
    if (enableMonitoring) {
        console.log('Connection monitoring enabled');
        initializeConnectionMonitoring();
        startAutoRefresh();
    } else {
        console.log('Connection monitoring disabled by user preference');
    }
    
    console.log('Dashboard initialization completed');
});

// Get current user - use shared auth function
function getCurrentUser() {
    if (typeof getLoggedInUser === 'function') {
        return getLoggedInUser();
    }
    // Fallback for compatibility
    try {
        const userStr = localStorage.getItem('currentUser') || 
                       localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

// Get auth token - use shared auth function
function getAuthToken() {
    if (typeof getAuthToken === 'function') {
        return getAuthToken();
    }
    // Fallback for compatibility
    return localStorage.getItem('token') || 
           localStorage.getItem('authToken');
}

// API call helper with relative URLs
async function apiCall(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('token'); // Use the token from auth.js
    const config = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (data) {
        config.body = JSON.stringify(data);
    }
    
    try {
        // Use relative URLs for better deployment compatibility
        const response = await fetch(endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`, config);
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Server returned non-JSON response (${response.status})`);
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }
        
        return result;
    } catch (error) {
        console.error(`API call failed for ${endpoint}:`, error);
        throw error;
    }
}

// Initialize dashboard with real data
async function initializeDashboard() {
    const currentUser = getCurrentUser();
    console.log('Initializing dashboard for user:', currentUser);
    
    // Display welcome message
    const receptionistNameElement = document.getElementById('receptionist-name');
    if (receptionistNameElement && currentUser) {
        receptionistNameElement.textContent = currentUser.nama ? currentUser.nama.split(' ')[0] : currentUser.username;
    }

    // Show loading message
    const recentActivityListElement = document.getElementById('recent-activity-list');
    if (recentActivityListElement) {
        recentActivityListElement.innerHTML = '<p class="text-sm text-[var(--text-muted-color)]">🔄 Memuat data dashboard...</p>';
    }

    // Load dashboard data with retry logic
    let attemptCount = 0;
    const maxAttempts = 3;
    
    while (attemptCount < maxAttempts) {
        try {
            attemptCount++;
            console.log(`Calling dashboard stats API (attempt ${attemptCount}/${maxAttempts})...`);
            
            const dashboardData = await apiCall('/resepsionis/dashboard/stats');
            console.log('Dashboard data loaded:', dashboardData);
            
            if (dashboardData && dashboardData.data) {
                updateDashboardMetrics(dashboardData.data);
                updateRecentActivities(dashboardData.data);
                return; // Success, exit the retry loop
            } else {
                console.error('Invalid dashboard data structure:', dashboardData);
                throw new Error('Invalid data structure received');
            }
        } catch (error) {
            console.error(`Dashboard load attempt ${attemptCount} failed:`, error);
            
            if (attemptCount === maxAttempts) {
                // Final attempt failed, show error
                console.error('All dashboard load attempts failed');
                showErrorMessage(`Gagal memuat data dashboard setelah ${maxAttempts} percobaan: ${error.message}`);
                
                // Show error in activity section with retry option
                if (recentActivityListElement) {
                    recentActivityListElement.innerHTML = `
                        <div class="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p class="text-sm text-red-700">❌ Gagal memuat aktivitas terbaru</p>
                            <p class="text-xs text-red-600 mb-2">Error: ${error.message}</p>
                            <div class="flex gap-2">
                                <button onclick="retryLoadData()" class="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Coba Lagi</button>
                                <button onclick="loadOfflineMode()" class="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700">Mode Offline</button>
                            </div>
                        </div>
                    `;
                }
                
                // Set placeholder values with error indication
                setElementText('available-rooms', '?');
                setElementText('checkins-today', '?');
                setElementText('checkouts-today', '?');
                setElementText('new-reservations-today', '?');
                
                // Try to load fallback data
                await loadFallbackData();
                return;
            } else {
                // Wait before retrying
                console.log(`Waiting 2 seconds before retry ${attemptCount + 1}...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
}

// Load offline mode with static information
function loadOfflineMode() {
    console.log('Loading offline mode...');
    
    const recentActivityListElement = document.getElementById('recent-activity-list');
    if (recentActivityListElement) {
        recentActivityListElement.innerHTML = `
            <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-3">
                <p class="text-sm text-yellow-700">⚠️ Mode Offline Aktif</p>
                <p class="text-xs text-yellow-600">Menampilkan panduan sistem karena server tidak dapat diakses</p>
            </div>
            <div class="space-y-3">
                <div class="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p class="text-sm text-blue-700">📋 Panduan Sistem Reservasi</p>
                    <p class="text-xs text-blue-600">Gunakan menu "Kelola Reservasi" untuk mengelola check-in/out</p>
                </div>
                <div class="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p class="text-sm text-green-700">🛏️ Manajemen Kamar</p>
                    <p class="text-xs text-green-600">Periksa status kamar melalui menu "Manajemen Kamar"</p>
                </div>
                <div class="p-3 bg-purple-50 border border-purple-200 rounded-md">
                    <p class="text-sm text-purple-700">👥 Daftar Tamu</p>
                    <p class="text-xs text-purple-600">Kelola data tamu melalui menu "Daftar Tamu"</p>
                </div>
            </div>
        `;
    }
    
    // Set static information for metrics
    setElementText('available-rooms', '?');
    setElementText('checkins-today', '?');
    setElementText('checkouts-today', '?');
    setElementText('new-reservations-today', '?');
    
    // Add offline indicator
    const header = document.querySelector('header');
    if (header && !document.getElementById('offline-indicator')) {
        const offlineIndicator = document.createElement('div');
        offlineIndicator.id = 'offline-indicator';
        offlineIndicator.className = 'fixed top-16 right-4 bg-yellow-500 text-white px-3 py-1 rounded-md text-sm z-50';
        offlineIndicator.innerHTML = '⚠️ Mode Offline';
        document.body.appendChild(offlineIndicator);
    }
}

// Improved retry function with better user feedback
async function retryLoadData() {
    console.log('Retrying to load dashboard data...');
    
    // Remove offline indicator if exists
    const offlineIndicator = document.getElementById('offline-indicator');
    if (offlineIndicator) {
        offlineIndicator.remove();
    }
    
    // Show loading state
    const recentActivityListElement = document.getElementById('recent-activity-list');
    if (recentActivityListElement) {
        recentActivityListElement.innerHTML = '<p class="text-sm text-[var(--text-muted-color)]">🔄 Mencoba ulang memuat data...</p>';
    }
    
    await initializeDashboard();
}

// Update dashboard metrics with data from API
function updateDashboardMetrics(data) {
    const { rooms, reservations } = data;
    
    // Update room statistics
    if (rooms) {
        setElementText('available-rooms', rooms.available_rooms || 0);
        const availableRoomsElement = document.getElementById('available-rooms');
        if (availableRoomsElement) {
            const subtitle = availableRoomsElement.parentElement.querySelector('.text-xs');
            if (subtitle) {
                subtitle.textContent = `Dari total ${rooms.total_rooms || 0} kamar`;
            }
        }
    }
    
    // Update reservation statistics
    if (reservations) {
        setElementText('checkins-today', reservations.checkins_today || 0);
        setElementText('checkouts-today', reservations.checkouts_today || 0);
        setElementText('new-reservations-today', reservations.new_reservations_24h || 0);
        
        // Update subtitles
        const checkinsElement = document.getElementById('checkins-today');
        if (checkinsElement) {
            const subtitle = checkinsElement.parentElement.querySelector('.text-xs');
            if (subtitle) {
                const pendingConfirmations = reservations.pending_confirmations || 0;
                subtitle.textContent = `${pendingConfirmations} menunggu konfirmasi`;
            }
        }
    }
}

// Update recent activities with real data
function updateRecentActivities(data) {
    const recentActivityListElement = document.getElementById('recent-activity-list');
    if (!recentActivityListElement) {
        console.error('Recent activity list element not found');
        return;
    }
    
    console.log('Updating recent activities with data:', data);
    
    try {
        const { recent_reservations, recent_payments } = data;
        const activities = [];
        
        // Add reservation activities
        if (recent_reservations && Array.isArray(recent_reservations) && recent_reservations.length > 0) {
            console.log('Processing reservations:', recent_reservations.length);
            recent_reservations.forEach(reservation => {
                try {
                    const createdDate = new Date(reservation.tanggal_reservasi);
                    const timeAgo = getTimeAgo(createdDate);
                    
                    activities.push({
                        id: `RES${reservation.id_reservasi.toString().padStart(3, '0')}`,
                        user: reservation.nama_tamu || 'Tamu',
                        action: getReservationStatusText(reservation.status_reservasi),
                        time: timeAgo,
                        type: 'reservasi',
                        priority: getActivityPriority(reservation.status_reservasi),
                        date: createdDate
                    });
                } catch (error) {
                    console.error('Error processing reservation:', reservation, error);
                }
            });
        } else {
            console.log('No reservation data or invalid format');
        }
        
        // Add payment activities
        if (recent_payments && Array.isArray(recent_payments) && recent_payments.length > 0) {
            console.log('Processing payments:', recent_payments.length);
            recent_payments.forEach(payment => {
                try {
                    const paymentDate = new Date(payment.tanggal_bayar);
                    const timeAgo = getTimeAgo(paymentDate);
                    
                    activities.push({
                        id: `PAY${payment.id_pembayaran.toString().padStart(3, '0')}`,
                        user: payment.nama_tamu || 'Tamu',
                        action: getPaymentStatusText(payment.status_pembayaran),
                        time: timeAgo,
                        type: 'pembayaran',
                        priority: getPaymentPriority(payment.status_pembayaran),
                        date: paymentDate
                    });
                } catch (error) {
                    console.error('Error processing payment:', payment, error);
                }
            });
        } else {
            console.log('No payment data or invalid format');
        }
        
        console.log('Total activities processed:', activities.length);
        
        // Sort by date (newest first) and limit to 8 items
        activities.sort((a, b) => b.date - a.date);
        const recentActivities = activities.slice(0, 8);
        
        // Display activities
        if (recentActivities.length === 0) {
            recentActivityListElement.innerHTML = `
                <div class="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p class="text-sm text-blue-700">ℹ️ Belum ada aktivitas terbaru</p>
                    <p class="text-xs text-blue-600">Data akan muncul ketika ada reservasi atau pembayaran baru</p>
                    <div class="mt-2 text-xs text-blue-500">
                        <p>💡 Tip: Anda dapat:</p>
                        <ul class="mt-1 space-y-1">
                            <li>• Kelola reservasi melalui menu "Kelola Reservasi"</li>
                            <li>• Lihat daftar tamu melalui "Daftar Tamu"</li>
                            <li>• Periksa status kamar di "Manajemen Kamar"</li>
                        </ul>
                    </div>
                </div>
            `;
            return;
        }
        
        recentActivityListElement.innerHTML = '';
        recentActivities.forEach((activity, index) => {
            const activityHtml = `
                <div class="p-3 bg-[var(--input-bg-color)] rounded-md border border-[var(--input-border-color)] hover:border-[var(--primary-color)] transition-colors">
                    <p class="text-sm text-[var(--text-color)]">
                        <span class="text-[var(--primary-color)] font-medium">${activity.id}</span>
                        - ${activity.user} 
                        <span class="text-[var(--text-muted-color)]">${activity.action}</span>
                    </p>
                    <p class="text-xs text-[var(--text-muted-color)]">${activity.time}</p>
                </div>
            `;
            recentActivityListElement.insertAdjacentHTML('beforeend', activityHtml);
        });
        
        console.log('Recent activities updated successfully');
        
    } catch (error) {
        console.error('Error updating recent activities:', error);
        recentActivityListElement.innerHTML = `
            <div class="p-3 bg-red-50 border border-red-200 rounded-md">
                <p class="text-sm text-red-700">❌ Gagal memproses aktivitas terbaru</p>
                <p class="text-xs text-red-600 mb-2">Error: ${error.message}</p>
                <div class="flex gap-2">
                    <button onclick="retryLoadData()" class="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Coba Lagi</button>
                    <button onclick="loadOfflineMode()" class="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700">Mode Offline</button>
                </div>
            </div>
        `;
    }
}

// Fallback data loading if dashboard endpoint fails
async function loadFallbackData() {
    try {
        await Promise.all([
            loadRoomStatistics(),
            loadReservationStatistics(),
            loadRecentActivities()
        ]);
    } catch (error) {
        console.error('Error loading fallback data:', error);
    }
}

// Load room statistics
async function loadRoomStatistics() {
    try {
        const roomsResult = await apiCall('/kamar');
        const rooms = roomsResult.data || [];
        
        const totalRooms = rooms.length;
        const availableRooms = rooms.filter(room => room.status === 'Tersedia').length;
        
        // Update available rooms display
        const availableRoomsElement = document.getElementById('available-rooms');
        if (availableRoomsElement) {
            availableRoomsElement.textContent = availableRooms;
            const subtitle = availableRoomsElement.parentElement.querySelector('.text-xs');
            if (subtitle) {
                subtitle.textContent = `Dari total ${totalRooms} kamar`;
            }
        }
        
        console.log(`Room stats - Total: ${totalRooms}, Available: ${availableRooms}`);
        
    } catch (error) {
        console.error('Error loading room statistics:', error);
        setElementText('available-rooms', '?');
    }
}

// Load reservation statistics
async function loadReservationStatistics() {
    try {
        const reservationsResult = await apiCall('/reservasi');
        const reservations = reservationsResult.data || [];
        
        const today = new Date().toISOString().split('T')[0];
        
        // Count today's activities
        let checkinsToday = 0;
        let checkoutsToday = 0;
        let newReservations24h = 0;
        
        reservations.forEach(reservation => {
            // Check-ins today
            if (reservation.tanggal_checkin === today && 
                reservation.status_reservasi === 'Dikonfirmasi') {
                checkinsToday++;
            }
            
            // Check-outs today
            if (reservation.tanggal_checkout === today && 
                reservation.status_reservasi === 'Check-In') {
                checkoutsToday++;
            }
            
            // New reservations today
            if (reservation.tanggal_reservasi === today) {
                newReservations24h++;
            }
        });
        
        // Update UI
        setElementText('checkins-today', checkinsToday);
        setElementText('checkouts-today', checkoutsToday);
        setElementText('new-reservations-today', newReservations24h);
        
        console.log(`Reservation stats - Check-ins: ${checkinsToday}, Check-outs: ${checkoutsToday}, New: ${newReservations24h}`);
        
    } catch (error) {
        console.error('Error loading reservation statistics:', error);
        setElementText('checkins-today', '?');
        setElementText('checkouts-today', '?');
        setElementText('new-reservations-today', '?');
    }
}

// Load recent activities
async function loadRecentActivities() {
    const recentActivityListElement = document.getElementById('recent-activity-list');
    if (!recentActivityListElement) return;
    
    try {
        // Get recent reservations
        const reservationsResult = await apiCall('/reservasi');
        const reservations = reservationsResult.data || [];
        
        // Get recent payments
        const paymentsResult = await apiCall('/pembayaran');
        const payments = paymentsResult.data || [];
        
        // Create activity timeline
        const activities = [];
        
        // Add reservation activities
        reservations.slice(0, 5).forEach(reservation => {
            const createdDate = new Date(reservation.tanggal_reservasi);
            const timeAgo = getTimeAgo(createdDate);
            
            activities.push({
                id: `RES${reservation.id_reservasi.toString().padStart(3, '0')}`,
                user: reservation.nama_tamu || 'Tamu',
                action: getReservationStatusText(reservation.status_reservasi),
                time: timeAgo,
                type: 'reservasi',
                priority: getActivityPriority(reservation.status_reservasi)
            });
        });
        
        // Add payment activities
        payments.slice(0, 3).forEach(payment => {
            const paymentDate = new Date(payment.tanggal_bayar);
            const timeAgo = getTimeAgo(paymentDate);
            
            activities.push({
                id: `PAY${payment.id_pembayaran.toString().padStart(3, '0')}`,
                user: payment.nama_tamu || 'Tamu',
                action: getPaymentStatusText(payment.status_pembayaran),
                time: timeAgo,
                type: 'pembayaran',
                priority: getPaymentPriority(payment.status_pembayaran)
            });
        });
        
        // Sort by priority and limit to 8 items
        activities.sort((a, b) => b.priority - a.priority);
        const recentActivities = activities.slice(0, 8);
        
        // Display activities
        if (recentActivities.length === 0) {
            recentActivityListElement.innerHTML = '<p class="text-sm text-[var(--text-muted-color)]">Belum ada aktivitas terbaru.</p>';
            return;
        }
        
        recentActivityListElement.innerHTML = '';
        recentActivities.forEach(activity => {
            const activityHtml = `
                <div class="p-3 bg-[var(--input-bg-color)] rounded-md border border-[var(--input-border-color)] hover:border-[var(--primary-color)] transition-colors">
                    <p class="text-sm text-[var(--text-color)]">
                        <span class="text-[var(--primary-color)] font-medium">${activity.id}</span>
                        - ${activity.user} 
                        <span class="text-[var(--text-muted-color)]">${activity.action}</span>
                    </p>
                    <p class="text-xs text-[var(--text-muted-color)]">${activity.time}</p>
                </div>
            `;
            recentActivityListElement.insertAdjacentHTML('beforeend', activityHtml);
        });
        
    } catch (error) {
        console.error('Error loading recent activities:', error);
        recentActivityListElement.innerHTML = '<p class="text-sm text-red-400">Gagal memuat aktivitas terbaru.</p>';
    }
}

// Check if user is authenticated and has proper token
function checkAuthentication() {
    const token = getAuthToken();
    const user = getCurrentUser();
    
    console.log('Auth check - Token exists:', !!token);
    console.log('Auth check - User exists:', !!user);
    console.log('Auth check - User role:', user?.role);
    
    if (!token) {
        console.error('No auth token found');
        return false;
    }
    
    if (!user || user.role !== 'resepsionis') {
        console.error('User not authorized as resepsionis');
        return false;
    }
    
    return true;
}

// Check server connection status
async function checkServerConnection() {
    try {
        const response = await fetch('/api/kamar', { 
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });
        return response && response.ok;
    } catch (error) {
        console.warn('Server connection check failed:', error.message);
        return false;
    }
}

// Auto-refresh dashboard data every 5 minutes
function startAutoRefresh() {
    console.log('Starting auto-refresh timer...');
    
    setInterval(async () => {
        console.log('Auto-refreshing dashboard data...');
        const isConnected = await checkServerConnection();
        
        if (isConnected) {
            try {
                await initializeDashboard();
                console.log('Auto-refresh completed successfully');
            } catch (error) {
                console.error('Auto-refresh failed:', error);
            }
        } else {
            console.warn('Server not accessible, skipping auto-refresh');
        }
    }, 5 * 60 * 1000); // 5 minutes
}

// Initialize connection monitoring
function initializeConnectionMonitoring() {
    console.log('Initializing connection monitoring...');
    
    let failedChecks = 0;
    const maxFailedChecks = 2; // Require 2 consecutive failures before showing offline
    
    // Check connection every 30 seconds
    setInterval(async () => {
        const isConnected = await checkServerConnection();
        const offlineIndicator = document.getElementById('offline-indicator');
        
        if (!isConnected) {
            failedChecks++;
            console.log(`Connection check failed (${failedChecks}/${maxFailedChecks})`);
            
            // Only show offline indicator after multiple consecutive failures
            if (failedChecks >= maxFailedChecks && !offlineIndicator) {
                console.warn('Multiple connection failures detected, showing offline indicator');
                const indicator = document.createElement('div');
                indicator.id = 'offline-indicator';
                indicator.className = 'fixed top-16 right-4 bg-red-500 text-white px-3 py-1 rounded-md text-sm z-50 animate-pulse';
                indicator.innerHTML = '⚠️ Koneksi Terputus';
                document.body.appendChild(indicator);
            }
        } else {
            // Reset failed checks counter
            if (failedChecks > 0) {
                console.log('Connection restored');
                failedChecks = 0;
            }
            
            // Remove offline indicator when connection restored
            if (offlineIndicator) {
                offlineIndicator.remove();
                
                // Show reconnection message
                const reconnectMsg = document.createElement('div');
                reconnectMsg.className = 'fixed top-16 right-4 bg-green-500 text-white px-3 py-1 rounded-md text-sm z-50';
                reconnectMsg.innerHTML = '✅ Koneksi Pulih';
                document.body.appendChild(reconnectMsg);
                
                // Remove reconnection message after 3 seconds
                setTimeout(() => reconnectMsg.remove(), 3000);
                
                // Refresh dashboard data
                await initializeDashboard();
            }
        }
    }, 30000); // 30 seconds
}

// Toggle connection monitoring
function toggleConnectionMonitoring() {
    const currentState = localStorage.getItem('enableConnectionMonitoring') !== 'false';
    const newState = !currentState;
    
    localStorage.setItem('enableConnectionMonitoring', newState.toString());
    
    if (newState) {
        console.log('Connection monitoring enabled');
        initializeConnectionMonitoring();
        startAutoRefresh();
        showMessage('Connection monitoring diaktifkan', 'success');
    } else {
        console.log('Connection monitoring disabled');
        // Remove any existing offline indicator
        const offlineIndicator = document.getElementById('offline-indicator');
        if (offlineIndicator) {
            offlineIndicator.remove();
        }
        showMessage('Connection monitoring dinonaktifkan', 'info');
    }
}

// Show temporary message
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-16 right-4 px-3 py-1 rounded-md text-sm z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    messageDiv.innerHTML = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => messageDiv.remove(), 3000);
}

// Helper functions
function setElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    return `${diffDays} hari lalu`;
}

function getReservationStatusText(status) {
    const statusTexts = {
        'Belum Bayar': 'membuat reservasi baru',
        'Menunggu Konfirmasi': 'menunggu konfirmasi pembayaran',
        'Dikonfirmasi': 'reservasi dikonfirmasi',
        'Check-In': 'melakukan check-in',
        'Check-Out': 'melakukan check-out',
        'Dibatalkan': 'membatalkan reservasi'
    };
    return statusTexts[status] || 'status tidak diketahui';
}

function getPaymentStatusText(status) {
    const statusTexts = {
        'Belum Lunas': 'melakukan pembayaran (menunggu verifikasi)',
        'Lunas': 'pembayaran dikonfirmasi lunas',
        'Menunggu Verifikasi': 'menunggu verifikasi pembayaran'
    };
    return statusTexts[status] || 'status pembayaran tidak diketahui';
}

function getActivityPriority(status) {
    const priorities = {
        'Belum Bayar': 5,
        'Menunggu Konfirmasi': 8,
        'Dikonfirmasi': 6,
        'Check-In': 7,
        'Check-Out': 4,
        'Dibatalkan': 2
    };
    return priorities[status] || 3;
}

function getPaymentPriority(status) {
    const priorities = {
        'Belum Lunas': 9,
        'Menunggu Verifikasi': 10,
        'Lunas': 5
    };
    return priorities[status] || 3;
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg z-50';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

function setupMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}