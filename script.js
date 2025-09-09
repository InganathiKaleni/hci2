document.addEventListener('DOMContentLoaded', () => {
    const showSignUpBtn = document.getElementById('showSignUp');
    const showLoginBtn = document.getElementById('showLogin');
    const signUpForm = document.getElementById('signUpForm');
    const loginForm = document.getElementById('loginForm');

    // Validation functions
    const validators = {
        name: (value) => {
            if (!value.trim()) return 'Name is required';
            if (value.trim().length < 2) return 'Name must be at least 2 characters';
            if (value.trim().length > 50) return 'Name must be less than 50 characters';
            if (!/^[a-zA-Z\s]+$/.test(value.trim())) return 'Name can only contain letters and spaces';
            return null;
        },
        email: (value) => {
            if (!value.trim()) return 'Email is required';
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value.trim())) return 'Please enter a valid email address';
            return null;
        },
        password: (value) => {
            if (!value) return 'Password is required';
            if (value.length < 6) return 'Password must be at least 6 characters';
            if (value.length > 128) return 'Password must be less than 128 characters';
            return null;
        },
        role: (value) => {
            if (!value) return 'Please select a user role';
            const validRoles = ['Admin', 'Lecturer', 'Student'];
            if (!validRoles.includes(value)) return 'Please select a valid role';
            return null;
        }
    };

    // Error display function
    function showError(inputId, message) {
        const input = document.getElementById(inputId);
        const existingError = input.parentNode.querySelector('.error-message');
        
        if (existingError) {
            existingError.remove();
        }
        
        if (message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.color = '#e74c3c';
            errorDiv.style.fontSize = '0.875rem';
            errorDiv.style.marginTop = '0.25rem';
            errorDiv.textContent = message;
            input.parentNode.appendChild(errorDiv);
            input.style.borderColor = '#e74c3c';
        } else {
            input.style.borderColor = '';
        }
    }

    // Clear all errors
    function clearAllErrors() {
        document.querySelectorAll('.error-message').forEach(error => error.remove());
        document.querySelectorAll('input, select').forEach(input => {
            input.style.borderColor = '';
        });
    }

    // Validate form inputs
    function validateForm(formData) {
        let isValid = true;
        const errors = {};

        Object.keys(formData).forEach(field => {
            if (validators[field]) {
                const error = validators[field](formData[field]);
                if (error) {
                    errors[field] = error;
                    isValid = false;
                }
            }
        });

        return { isValid, errors };
    }

    // Display validation errors
    function displayErrors(errors) {
        Object.keys(errors).forEach(fieldId => {
            showError(fieldId, errors[fieldId]);
        });
    }

    if (showSignUpBtn && showLoginBtn && signUpForm && loginForm) {
        // Toggle between forms
        showSignUpBtn.onclick = function() {
            clearAllErrors();
            signUpForm.style.display = 'block';
            loginForm.style.display = 'none';
        };

        showLoginBtn.onclick = function() {
            clearAllErrors();
            loginForm.style.display = 'block';
            signUpForm.style.display = 'none';
        };

        // Sign up form submission
        signUpForm.onsubmit = function(event) {
            event.preventDefault();
            clearAllErrors();

            const formData = {
                name: document.getElementById('signUpName').value,
                email: document.getElementById('signUpEmail').value,
                password: document.getElementById('signUpPassword').value,
                role: document.getElementById('signUpRole').value
            };

            const { isValid, errors } = validateForm(formData);

            if (!isValid) {
                displayErrors(errors);
                return;
            }

            try {
                let users = JSON.parse(localStorage.getItem('users')) || [];
                
                // Check if email already exists
                if (users.find(user => user.email.toLowerCase() === formData.email.toLowerCase())) {
                    showError('signUpEmail', 'Email already exists. Please use a different email.');
                    return;
                }

                // Hash password (basic implementation - in production use proper hashing)
                const hashedPassword = btoa(formData.password + 'salt'); // Basic encoding for demo

                const newUser = {
                    id: Date.now().toString(),
                    name: formData.name.trim(),
                    email: formData.email.toLowerCase().trim(),
                    password: hashedPassword,
                    role: formData.role,
                    createdAt: new Date().toISOString(),
                    isActive: true
                };

                users.push(newUser);
                localStorage.setItem('users', JSON.stringify(users));

                // Show success message
                alert('Sign-up successful! You can now log in.');
                
                // Reset form and switch to login
                signUpForm.reset();
                loginForm.style.display = 'block';
                signUpForm.style.display = 'none';
                
            } catch (error) {
                console.error('Error during signup:', error);
                alert('An error occurred during signup. Please try again.');
            }
        };

        // Login form submission
        loginForm.onsubmit = function(event) {
            event.preventDefault();
            clearAllErrors();

            const formData = {
                email: document.getElementById('loginEmail').value,
                password: document.getElementById('loginPassword').value
            };

            // Basic validation
            if (!formData.email.trim()) {
                showError('loginEmail', 'Email is required');
                return;
            }
            if (!formData.password) {
                showError('loginPassword', 'Password is required');
                return;
            }

            try {
                let users = JSON.parse(localStorage.getItem('users') || '[]');
                
                // Hash the input password for comparison
                const hashedInputPassword = btoa(formData.password + 'salt');
                
                const user = users.find(user => 
                    user.email.toLowerCase() === formData.email.toLowerCase().trim() && 
                    user.password === hashedInputPassword &&
                    user.isActive
                );

                if (!user) {
                    showError('loginEmail', 'Invalid email or password. Please try again.');
                    showError('loginPassword', 'Invalid email or password. Please try again.');
                    return;
                }
                
                // Clear other users' login status
                users.forEach(u => u.isLoggedIn = false);
                user.isLoggedIn = true;
                user.lastLogin = new Date().toISOString();
                
                localStorage.setItem('users', JSON.stringify(users));
                localStorage.setItem('currentUser', JSON.stringify({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    loginTime: new Date().toISOString()
                }));
                
                // Redirect based on role
                const normalizedRole = user.role.toLowerCase();
                
                if (normalizedRole === "admin") {
                    window.location.href = "Admin.html";
                } else if (normalizedRole === "student") {
                    window.location.href = "Student.html";
                } else if (normalizedRole === "lecturer") {
                    window.location.href = "Lecturer.html";
                } else {
                    alert("Unknown role. Please contact support.");
                }
                
            } catch (error) {
                console.error('Error during login:', error);
                alert('An error occurred during login. Please try again.');
            }
        };

        // Real-time validation
        Object.keys(validators).forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (input) {
                input.addEventListener('blur', () => {
                    const error = validators[fieldId](input.value);
                    showError(fieldId, error);
                });
                
                input.addEventListener('input', () => {
                    if (input.style.borderColor === 'rgb(231, 76, 60)') {
                        const error = validators[fieldId](input.value);
                        showError(fieldId, error);
                    }
                });
            }
        });
    }
});