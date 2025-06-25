document.addEventListener('DOMContentLoaded', async () => {
    console.log('profil.js: Script loaded');
    
    // Check authentication
    if (typeof isUserLoggedIn !== 'function' || !isUserLoggedIn()) {
        alert("Akses ditolak. Anda harus login sebagai tamu.");
        const targetUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?role=tamu&redirect=${targetUrl}`;
        return;
    }

    const currentUser = getLoggedInUser();
    if (!currentUser || currentUser.role !== 'tamu') {
        alert("Akses ditolak. Halaman ini hanya untuk tamu.");
        logoutUser();
        const targetUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?role=tamu&redirect=${targetUrl}`;
        return;
    }

    console.log('profil.js: Authentication successful, currentUser:', currentUser);
    
    // Force UI update for login/logout buttons
    if (typeof updateLoginLogoutButtons === 'function') {
        updateLoginLogoutButtons();
    }    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    // Profile Info Form Elements
    const profileInfoForm = document.getElementById('profileInfoForm');
    const profileFullNameInput = document.getElementById('profileFullName');
    const profileEmailInput = document.getElementById('profileEmail');
    const profilePhoneNumberInput = document.getElementById('profilePhoneNumber');
    const profileAddressInput = document.getElementById('profileAddress');

    // Global variable to store profile data
    let profileData = null;

    // Function to fetch profile data from backend
    async function fetchProfileData() {
        try {
            console.log('profil.js: Fetching profile data from backend');
            const token = getAuthToken();
            
            const response = await fetch('/api/tamu/profile/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('profil.js: Profile API response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch profile: ${response.status}`);
            }

            const data = await response.json();
            console.log('profil.js: Profile data received:', data);
            
            if (data.success && data.profile) {
                profileData = data.profile;
                return profileData;
            } else {
                throw new Error('Invalid response format from profile API');
            }
        } catch (error) {
            console.error('profil.js: Error fetching profile data:', error);
            alert('Gagal memuat data profil. Silakan refresh halaman.');
            return null;
        }
    }

    function populateProfileForm() {
        if (!profileData) return;
        
        console.log('profil.js: Populating form with profile data:', profileData);
        
        if (profileFullNameInput) profileFullNameInput.value = profileData.nama_lengkap || '';
        if (profileEmailInput) profileEmailInput.value = profileData.email || '';
        if (profilePhoneNumberInput) profilePhoneNumberInput.value = profileData.nomor_telepon || '';
        if (profileAddressInput) profileAddressInput.value = profileData.alamat || '';
    }    // Load profile data when page loads
    await fetchProfileData();
    
    if (profileInfoForm) {
        populateProfileForm(); // Populate form with backend data

        profileInfoForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const updatedInfo = {
                nama_lengkap: profileFullNameInput.value.trim(),
                nomor_telepon: profilePhoneNumberInput.value.trim(),
                alamat: profileAddressInput.value.trim(),
            };

            if (!updatedInfo.nama_lengkap) {
                alert("Nama lengkap wajib diisi.");
                return;            }

            // Show loading state first, before try block
            const saveButton = document.getElementById('saveProfileInfoBtn');
            const originalText = saveButton.textContent;
            saveButton.textContent = 'Menyimpan...';
            saveButton.disabled = true;

            try {
                console.log('profil.js: Updating profile with data:', updatedInfo);
                const token = getAuthToken();

                const response = await fetch('/api/tamu/profile/me', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedInfo)
                });

                console.log('profil.js: Update API response status:', response.status);
                const data = await response.json();
                console.log('profil.js: Update API response data:', data);

                if (response.ok && data.success) {
                    alert('Informasi profil berhasil diperbarui.');
                    
                    // Update local profile data
                    if (data.updatedUser) {
                        profileData = data.updatedUser;
                        
                        // Update currentUser in localStorage with new data
                        const updatedUserForStorage = { ...currentUser, ...data.updatedUser };
                        setLoggedInUser(updatedUserForStorage);
                    }
                    
                    // Refresh the form with updated data
                    populateProfileForm();
                } else {
                    alert(data.message || 'Gagal memperbarui profil.');
                }
            } catch (error) {
                console.error('profil.js: Error updating profile:', error);
                alert('Terjadi kesalahan saat memperbarui profil. Silakan coba lagi.');            } finally {
                // Reset button state
                saveButton.textContent = originalText;
                saveButton.disabled = false;
            }
        });
    }
    
    // Toggle mobile menu
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
});