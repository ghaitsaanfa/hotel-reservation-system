// Reservation API - Complete implementation
window.reservationAPI = {
    // Base configuration
    BASE_URL: '/api',
    USE_DEBUG_ROUTES: true, // Set to false in production
    
    // Helper function to get headers
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        };
    },    // Fetch all reservations
    fetchAllReservations: async function() {
        console.log('🔄 Fetching all reservations...');
        try {
            const endpoint = this.USE_DEBUG_ROUTES ? 
                `${this.BASE_URL}/debug/reservasi` : 
                `${this.BASE_URL}/reservasi`;
                
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ All reservations fetched:', result);
            return result;
        } catch (error) {
            console.error('❌ Error fetching all reservations:', error);
            throw error;
        }
    },

    // Fetch single reservation by ID
    fetchReservationById: async function(id) {
        console.log('🔄 Fetching reservation by ID:', id);
        try {
            const response = await fetch(`${this.BASE_URL}/reservasi/detail/${id}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                // Handle 404 specifically
                if (response.status === 404) {
                    console.warn(`⚠️ Reservation ${id} not found via direct API, falling back to all reservations`);
                    // Fallback: get all reservations and find the specific one
                    try {
                        const allReservationsResponse = await this.fetchAllReservations();
                        if (allReservationsResponse && allReservationsResponse.data) {
                            const targetReservation = allReservationsResponse.data.find(r => r.id_reservasi == id);
                            if (targetReservation) {
                                console.log('✅ Found reservation in all reservations fallback');
                                return { success: true, data: targetReservation };
                            }
                        }
                    } catch (fallbackError) {
                        console.error('❌ Fallback also failed:', fallbackError);
                    }
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Reservation fetched:', result);
            return result;
        } catch (error) {
            console.error('❌ Error fetching reservation by ID:', error);
            throw error;
        }
    },    // Update reservation status
    updateReservationStatus: async function(id, status, resepsionisId = null, notes = null) {
        console.log('🔄 Updating reservation status:', { id, status, resepsionisId, notes });
        
        try {
            const payload = {
                status: status // The debug route expects 'status' not 'status_reservasi'
            };
            
            if (resepsionisId) {
                payload.id_resepsionis = resepsionisId;
            }
            
            if (notes) {
                payload.catatan = notes;
            }

            // Use simplified debug route for testing
            const response = await fetch(`${this.BASE_URL}/debug/reservasi/${id}/status-simple`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                // Get error details from response
                const errorData = await response.json().catch(() => ({}));
                console.log('❌ Server error response:', errorData);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
            }
            
            const result = await response.json();
            console.log('✅ Reservation status updated:', result);
            return result;
        } catch (error) {
            console.error('❌ Error updating reservation status:', error);
            throw error;
        }
    },

    // Create new reservation
    createReservation: async function(reservationData) {
        console.log('🔄 Creating new reservation:', reservationData);
        try {
            const response = await fetch(`${this.BASE_URL}/reservasi`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(reservationData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Reservation created:', result);
            return result;
        } catch (error) {
            console.error('❌ Error creating reservation:', error);
            throw error;
        }
    },

    // Search guests (if needed for guest selection)
    searchGuests: async function(query) {
        console.log('🔄 Searching guests:', query);
        try {
            const response = await fetch(`${this.BASE_URL}/tamu/search?q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Guest search results:', result);
            return result;
        } catch (error) {
            console.error('❌ Error searching guests:', error);
            throw error;
        }
    },

    // Optional functions that may not be implemented yet
    fetchReservationHistory: async function(reservationId) {
        console.log('ℹ️ Reservation history feature not implemented yet');
        return null;
    },

    fetchPaymentInfo: async function(reservationId) {
        console.log('ℹ️ Payment info feature not implemented yet'); 
        return null;
    },

    fetchPaymentsByReservation: async function(reservationId) {
        console.log('ℹ️ Payments by reservation feature not implemented yet');
        return null;
    },

    fetchGuestHistory: async function(guestId) {
        console.log('ℹ️ Guest history feature not implemented yet');
        return null;
    },

    fetchRoomDetails: async function(roomId) {
        console.log('ℹ️ Room details feature not implemented yet');
        return null;
    }
};