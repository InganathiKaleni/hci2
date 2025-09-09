/**
 * EdUTEND System - Authentication Module
 * 
 * @fileoverview Handles user authentication, validation, and session management
 * @author Code Crafters
 * @contributor Kay-M
 * @license MIT License - https://opensource.org/licenses/MIT
 * @copyright Copyright (c) 2025 Kay-M
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        this.loadCurrentUser();
        this.setupEventListeners();
    }

    loadCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                this.isAuthenticated = true;
                this.updateUI();
            }
        } catch (error) {
            console.error('Failed to load current user:', error);
            this.logout();
        }
    }

    setupEventListeners() {
        // Logout button event listeners
        document.querySelectorAll('.logout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
    }

    updateUI() {
        if (this.currentUser) {
            // Update welcome messages
            document.querySelectorAll('.user-info span').forEach(span => {
                if (span.textContent.includes('Welcome')) {
                    span.textContent = `Welcome, ${this.currentUser.name}`;
                }
            });

            // Update profile information if available
            this.updateProfileInfo();
        }
    }

    updateProfileInfo() {
        try {
            const profileName = document.getElementById('profile-name');
            const profileEmail = document.getElementById('profile-email');
            const profileAvatar = document.getElementById('profile-avatar');

            if (profileName) profileName.textContent = this.currentUser.name;
            if (profileEmail) profileEmail.textContent = this.currentUser.email;
            
            if (profileAvatar) {
                const initials = this.currentUser.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(s => s[0].toUpperCase())
                    .join('') || 'U';
                profileAvatar.textContent = initials;
            }
        } catch (error) {
            console.warn('Failed to update profile info:', error);
        }
    }

    logout() {
        try {
            // Clear current user data
            localStorage.removeItem('currentUser');
            
            // Clear other users' login status
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            users.forEach(user => user.isLoggedIn = false);
            localStorage.setItem('users', JSON.stringify(users));
            
            // Reset state
            this.currentUser = null;
            this.isAuthenticated = false;
            
            // Redirect to login page
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error during logout:', error);
            // Force redirect even if there's an error
            window.location.href = 'index.html';
        }
    }

    checkAuth() {
        if (!this.isAuthenticated) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    getUserRole() {
        return this.currentUser?.role || null;
    }

    getUserName() {
        return this.currentUser?.name || 'User';
    }

    getUserEmail() {
        return this.currentUser?.email || '';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
} else {
    window.AuthManager = AuthManager;
}
