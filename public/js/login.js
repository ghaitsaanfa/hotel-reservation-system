document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Login page loaded');
    
    // Show available test credentials
    console.log('🔑 Available test credentials:');
    console.log('  Admin: username="admin", password="123456"');
    console.log('  Resepsionis: username="resepsionis", password="123456"');
    console.log('  Tamu: username="tamu", password="123456"');
    
    // Debug: List all elements in the page
    console.log('📋 All form elements found:', {
        loginForm: !!document.getElementById('loginForm'),
        username: !!document.getElementById('username'),
        password: !!document.getElementById('password'),
        role: !!document.getElementById('role'),
        loginButton: !!document.getElementById('loginButton'),
        errorMessage: !!document.getElementById('errorMessage')
    });

    // Check if user is already logged in
    if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
        const user = getLoggedInUser();
        if (user && user.role) {
            console.log('👤 User already logged in, redirecting...');
            redirectToDashboard(user.role);
            return;
        }
    }

    // Get form elements with error checking
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const roleSelect = document.getElementById('role');
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage');

    // Check if all required elements exist
    if (!loginForm) {
        console.error('❌ loginForm not found');
        alert('Login form not found. Please check the HTML structure.');
        return;
    }
    if (!usernameInput) {
        console.error('❌ username input not found');
        alert('Username input not found. Please check the HTML structure.');
        return;
    }
    if (!passwordInput) {
        console.error('❌ password input not found');
        alert('Password input not found. Please check the HTML structure.');
        return;
    }

    console.log('✅ All required form elements found');

    // Handle URL parameters for redirects
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');
    const roleParam = urlParams.get('role');

    // Set role if provided in URL
    if (roleParam && roleSelect) {
        roleSelect.value = roleParam;
    }

    // Login form submit handler
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const role = roleSelect ? roleSelect.value : '';

        console.log('🔐 Login attempt with:', { username, role, passwordLength: password.length });

        if (!username || !password) {
            showError('Silakan isi username dan password');
            return;
        }

        try {
            showLoading(true);
            hideError();
            
            const requestBody = {
                username: username,
                password: password
            };

            // Only add role if it's selected and not empty
            if (role && role.trim() !== '') {
                requestBody.role = role;
            }

            console.log('📤 Sending request to:', '/api/auth/login');
            console.log('📦 Request body:', { ...requestBody, password: '[HIDDEN]' });

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📡 Response status:', response.status);

            let result;
            try {
                const responseText = await response.text();
                console.log('📄 Raw response:', responseText);
                
                if (!responseText) {
                    throw new Error('Empty response from server');
                }
                
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ Failed to parse response as JSON:', parseError);
                throw new Error('Server returned invalid response');
            }

            console.log('📊 Parsed result:', result);

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            if (result.success && result.token) {
                // Store token and user data
                localStorage.setItem('token', result.token);
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                
                console.log('✅ Login successful, redirecting...');
                showSuccess('Login berhasil! Mengalihkan...');
                
                // Small delay for user feedback
                setTimeout(() => {
                    if (redirectUrl) {
                        window.location.href = decodeURIComponent(redirectUrl);
                    } else {
                        redirectToDashboard(result.user.role);
                    }
                }, 1000);
            } else {
                throw new Error(result.error || 'Login failed');
            }

        } catch (error) {
            console.error('❌ Login error:', error);
            showError(error.message || 'Login failed. Please try again.');
        } finally {
            showLoading(false);
        }
    });

    // Helper functions
    function redirectToDashboard(role) {
        switch (role) {
            case 'admin':
                window.location.href = '/admin/dashboard.html';
                break;
            case 'resepsionis':
                window.location.href = '/resepsionis/dashboard.html';
                break;
            case 'tamu':
                window.location.href = '/tamu/dashboard.html';
                break;
            default:
                window.location.href = '/index.html';
        }
    }

    function showLoading(show = true) {
        if (loginButton) {
            loginButton.disabled = show;
            loginButton.textContent = show ? 'Memproses...' : 'Login';
        }
    }

    function showError(message) {
        console.error('🚨 Error:', message);
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            errorMessage.className = 'alert alert-error mb-4';
        } else {
            // Fallback if error message element not found
            alert('Error: ' + message);
        }
    }

    function showSuccess(message) {
        console.log('✅ Success:', message);
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            errorMessage.className = 'alert alert-success mb-4';
        }
    }

    function hideError() {
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }

    // Quick login buttons (if they exist)
    const quickLoginButtons = document.querySelectorAll('[data-quick-login]');
    quickLoginButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const role = e.target.dataset.quickLogin;
            const credentials = getQuickLoginCredentials(role);
            
            if (credentials && usernameInput && passwordInput) {
                usernameInput.value = credentials.username;
                passwordInput.value = credentials.password;
                if (roleSelect) roleSelect.value = role;
                
                // Auto submit form
                loginForm.dispatchEvent(new Event('submit'));
            }
        });
    });

    function getQuickLoginCredentials(role) {
        const credentials = {
            'admin': { username: 'admin', password: '123456' },
            'resepsionis': { username: 'resepsionis', password: '123456' },
            'tamu': { username: 'tamu', password: '123456' }
        };
        return credentials[role];
    }

    // Handle back button
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.history.back();
        });
    }
});

// Global functions for compatibility
function isUserLoggedIn() {
    return localStorage.getItem('token') !== null;
}

function getLoggedInUser() {
    try {
        const userData = localStorage.getItem('currentUser');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}