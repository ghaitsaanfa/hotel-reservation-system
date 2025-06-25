document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const errorMessageElement = document.createElement('div'); // Elemen untuk menampilkan pesan error
    errorMessageElement.style.color = 'red';
    errorMessageElement.style.textAlign = 'center';
    errorMessageElement.style.marginTop = '10px';
    if (registerForm) {
        registerForm.parentNode.insertBefore(errorMessageElement, registerForm.nextSibling); // Sisipkan elemen error setelah form

        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            errorMessageElement.textContent = ''; // Bersihkan pesan error sebelumnya

            const formData = new FormData(registerForm);
            const fullName = formData.get('fullName');
            const email = formData.get('email');
            const phoneNumber = formData.get('phoneNumber');
            const username = formData.get('username');
            const password = formData.get('password');
            const alamat = formData.get('alamat'); // Get address

            // Validasi sederhana di frontend (bisa ditambahkan lebih banyak)
            if (!fullName || !email || !phoneNumber || !username || !password) { // Alamat bisa opsional
                errorMessageElement.textContent = 'Full name, email, phone number, username, and password are required.';
                return;
            }
            if (password.length < 6) { // Contoh validasi panjang password
                errorMessageElement.textContent = 'Password must be at least 6 characters long.';
                return;
            }

            // Show loading state
            const submitButton = registerForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Registering...';
            submitButton.disabled = true;

            try {
                // Use relative URL for better compatibility with deployment
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        nama: fullName, // Sesuaikan dengan nama kolom di DB (tamu.nama)
                        email: email,
                        no_hp: phoneNumber, // Sesuaikan dengan nama kolom di DB (tamu.no_hp)
                        username: username,
                        password: password,
                        alamat: alamat // Send address to backend
                    }),
                });

                // Check if response is JSON before parsing
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(`Server returned non-JSON response (${response.status}). Please check if the API is running.`);
                }

                const result = await response.json();

                if (!response.ok) {
                    // Handle different error types
                    if (response.status === 409) {
                        errorMessageElement.textContent = result.message || 'Username or email already exists.';
                        return;
                    } else if (response.status === 400) {
                        errorMessageElement.textContent = result.message || 'Please check your input and try again.';
                        return;
                    } else {
                        throw new Error(result.message || 'Registration failed. Please try again.');
                    }
                }

                // Registration successful
                errorMessageElement.style.color = 'green';
                errorMessageElement.textContent = result.message || 'Registration successful! Redirecting to login...';
                
                // Redirect after a brief delay
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);

            } catch (error) {
                console.error("Error during registration:", error);
                if (error.message.includes('Failed to fetch')) {
                    errorMessageElement.textContent = 'Cannot connect to server. Please check your internet connection and try again.';
                } else {
                    errorMessageElement.textContent = error.message || 'Registration failed. Please try again.';
                }
            } finally {
                // Reset button state
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
            }
        });
    } else {
        console.error("Register form with ID 'registerForm' not found.");
    }
});
