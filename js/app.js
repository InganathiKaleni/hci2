/**
 * EdUTEND System - Enhanced QR Code Attendance Management System
 * 
 * @fileoverview Main Application File - Initializes all modules and handles application lifecycle
 * @author Code Crafters
 * @contributor Kay-M
 * @license MIT License - https://opensource.org/licenses/MIT
 * @copyright Copyright (c) 2025 Kay-M
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

class EduTendApp {
    constructor() {
        this.modules = {};
        this.init();
    }

    init() {
        // Check if user is authenticated
        if (!this.checkAuthentication()) {
            return;
        }

        // Initialize modules based on user role
        this.initializeModules();
        
        // Setup global event listeners
        this.setupGlobalListeners();
        
        // Initialize UI components
        this.initializeUI();
        
        console.log('EduTend Application initialized successfully');
    }

    checkAuthentication() {
        try {
            const currentUser = localStorage.getItem('currentUser');
            if (!currentUser) {
                // Not logged in, redirect to login page
                if (window.location.pathname !== '/index.html' && !window.location.pathname.includes('index.html')) {
                    window.location.href = 'index.html';
                }
                return false;
            }
            
            const user = JSON.parse(currentUser);
            if (!user || !user.role) {
                console.error('Invalid user data');
                this.logout();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Authentication check failed:', error);
            this.logout();
            return false;
        }
    }

    initializeModules() {
        try {
            // Initialize authentication manager
            if (window.AuthManager) {
                this.modules.auth = new window.AuthManager();
            }

            // Initialize QR manager for lecturers
            if (window.QRManager && this.isLecturer()) {
                this.modules.qr = new window.QRManager();
            }

            // Initialize other role-specific modules
            if (this.isStudent()) {
                this.initializeStudentModules();
            } else if (this.isAdmin()) {
                this.initializeAdminModules();
            }

        } catch (error) {
            console.error('Failed to initialize modules:', error);
        }
    }

    initializeStudentModules() {
        // Initialize student-specific modules
        if (window.StudentQRScanner) {
            this.modules.scanner = new window.StudentQRScanner();
        }
        
        if (window.AttendanceTracker) {
            this.modules.attendance = new window.AttendanceTracker();
        }
    }

    initializeAdminModules() {
        // Initialize admin-specific modules
        if (window.UserManager) {
            this.modules.userManager = new window.UserManager();
        }
        
        if (window.SystemMonitor) {
            this.modules.systemMonitor = new window.SystemMonitor();
        }
    }

    setupGlobalListeners() {
        // Handle storage events for real-time updates
        window.addEventListener('storage', (e) => {
            this.handleStorageEvent(e);
        });

        // Handle beforeunload for cleanup
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Handle visibility change for background tasks
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handlePageHidden();
            } else {
                this.handlePageVisible();
            }
        });
    }

    handleStorageEvent(event) {
        try {
            switch (event.key) {
                case 'courseSessions':
                    this.handleCourseSessionsUpdate(event.newValue);
                    break;
                case 'sessionNotification':
                    this.handleSessionNotification(event.newValue);
                    break;
                case 'userSettings':
                    this.handleUserSettingsUpdate(event.newValue);
                    break;
                default:
                    // Handle other storage events if needed
                    break;
            }
        } catch (error) {
            console.error('Failed to handle storage event:', error);
        }
    }

    handleCourseSessionsUpdate(newValue) {
        try {
            if (newValue && this.modules.qr) {
                this.modules.qr.displayRecentSessions();
            }
        } catch (error) {
            console.warn('Failed to handle course sessions update:', error);
        }
    }

    handleSessionNotification(newValue) {
        try {
            if (newValue && this.isStudent()) {
                this.showSessionNotification(JSON.parse(newValue));
            }
        } catch (error) {
            console.warn('Failed to handle session notification:', error);
        }
    }

    handleUserSettingsUpdate(newValue) {
        try {
            if (newValue && this.modules.auth) {
                this.modules.auth.updateUI();
            }
        } catch (error) {
            console.warn('Failed to handle user settings update:', error);
        }
    }

    showSessionNotification(notification) {
        if (notification.type === 'newSession') {
            this.showNotification(
                `New QR code available for ${notification.courseCode}!`,
                'info',
                [
                    { text: 'Scan Now', action: () => this.navigateToScanner() },
                    { text: 'View Course', action: () => this.navigateToCourses() }
                ]
            );
        }
    }

    showNotification(message, type = 'info', actions = []) {
        const notification = document.createElement('div');
        notification.className = `app-notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 20px;
            border-radius: 12px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 350px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            transform: translateX(100%);
            transition: all 0.3s ease;
            background: linear-gradient(135deg, ${this.getNotificationColor(type)} 0%, ${this.getNotificationColor(type, 0.8)} 100%);
        `;

        let content = `<div style="margin-bottom: 15px;">${message}</div>`;
        
        if (actions.length > 0) {
            const actionsHtml = actions.map(action => 
                `<button class="notification-action" style="
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 6px;
                    margin-right: 8px;
                    cursor: pointer;
                    font-size: 0.9rem;
                ">${action.text}</button>`
            ).join('');
            content += `<div style="display: flex; gap: 8px;">${actionsHtml}</div>`;
        }

        notification.innerHTML = content;
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Add action listeners
        if (actions.length > 0) {
            const actionButtons = notification.querySelectorAll('.notification-action');
            actionButtons.forEach((btn, index) => {
                btn.addEventListener('click', () => {
                    if (actions[index] && actions[index].action) {
                        actions[index].action();
                    }
                    this.removeNotification(notification);
                });
            });
        }

        // Auto remove after 10 seconds
        setTimeout(() => {
            this.removeNotification(notification);
        }, 10000);
    }

    removeNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    getNotificationColor(type, alpha = 1) {
        const colors = {
            success: `rgba(46, 204, 113, ${alpha})`,
            error: `rgba(231, 76, 60, ${alpha})`,
            warning: `rgba(243, 156, 18, ${alpha})`,
            info: `rgba(52, 152, 219, ${alpha})`
        };
        return colors[type] || colors.info;
    }

    navigateToScanner() {
        // Navigate to QR scanner section
        const scannerSection = document.querySelector('[data-target="qrcodescanner"]');
        if (scannerSection) {
            scannerSection.click();
        }
    }

    navigateToCourses() {
        // Navigate to courses section
        const coursesSection = document.querySelector('[data-target="courses"]');
        if (coursesSection) {
            coursesSection.click();
        }
    }

    initializeUI() {
        // Initialize navigation
        this.initializeNavigation();
        
        // Initialize theme
        this.initializeTheme();
        
        // Initialize responsive sidebar
        this.initializeResponsiveSidebar();
    }

    initializeNavigation() {
        const navItems = document.querySelectorAll('[data-target]');
        const sections = document.querySelectorAll('.section');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const target = item.getAttribute('data-target');
                
                // Skip external links and logout
                if (!target || target === 'logout') return;
                
                e.preventDefault();
                
                // Hide all sections
                sections.forEach(sec => {
                    sec.style.display = 'none';
                });
                
                // Show target section
                const targetSection = document.getElementById(target);
                if (targetSection) {
                    targetSection.style.display = 'block';
                }
                
                // Update active state
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Handle section-specific initialization
                this.handleSectionChange(target);
            });
        });
    }

    handleSectionChange(sectionId) {
        switch (sectionId) {
            case 'attendance':
                if (this.modules.attendance) {
                    this.modules.attendance.render();
                }
                break;
            case 'reports':
                if (this.modules.reports) {
                    this.modules.reports.render();
                }
                break;
            case 'qrcode':
                if (this.modules.qr) {
                    this.modules.qr.displayRecentSessions();
                }
                break;
            default:
                break;
        }
    }

    initializeTheme() {
        try {
            const theme = localStorage.getItem('theme') || 'system';
            this.applyTheme(theme);
            
            // Setup theme toggle if available
            const themeSelect = document.getElementById('theme-select');
            if (themeSelect) {
                themeSelect.value = theme;
                themeSelect.addEventListener('change', (e) => {
                    this.applyTheme(e.target.value);
                });
            }
        } catch (error) {
            console.warn('Failed to initialize theme:', error);
        }
    }

    applyTheme(theme) {
        try {
            document.body.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            
            // Apply CSS custom properties for theme
            if (theme === 'dark') {
                document.body.classList.add('theme-dark');
                document.body.classList.remove('theme-light');
            } else if (theme === 'light') {
                document.body.classList.add('theme-light');
                document.body.classList.remove('theme-dark');
            } else {
                // System theme
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.body.classList.toggle('theme-dark', prefersDark);
                document.body.classList.toggle('theme-light', !prefersDark);
            }
        } catch (error) {
            console.warn('Failed to apply theme:', error);
        }
    }

    initializeResponsiveSidebar() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebarClose = document.getElementById('sidebar-close');
        const sidebar2 = document.getElementById('sidebar2');

        if (sidebarToggle && sidebar2) {
            sidebarToggle.addEventListener('click', () => {
                sidebar2.classList.add('active');
            });
        }

        if (sidebarClose && sidebar2) {
            sidebarClose.addEventListener('click', () => {
                sidebar2.classList.remove('active');
            });
        }

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar2 && sidebar2.classList.contains('active')) {
                if (!sidebar2.contains(e.target) && !sidebarToggle?.contains(e.target)) {
                    sidebar2.classList.remove('active');
                }
            }
        });
    }

    handlePageHidden() {
        // Pause timers and heavy operations when page is hidden
        if (this.modules.qr) {
            this.modules.qr.pauseTimers();
        }
    }

    handlePageVisible() {
        // Resume operations when page becomes visible
        if (this.modules.qr) {
            this.modules.qr.resumeTimers();
        }
    }

    cleanup() {
        // Cleanup resources before page unload
        if (this.modules.qr) {
            this.modules.qr.cleanup();
        }
    }

    logout() {
        try {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout failed:', error);
            window.location.href = 'index.html';
        }
    }

    // Utility methods
    isLecturer() {
        const user = this.getCurrentUser();
        return user && user.role === 'Lecturer';
    }

    isStudent() {
        const user = this.getCurrentUser();
        return user && user.role === 'Student';
    }

    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'Admin';
    }

    getCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    }

    getUserRole() {
        const user = this.getCurrentUser();
        return user ? user.role : null;
    }

    getUserName() {
        const user = this.getCurrentUser();
        return user ? user.name : 'User';
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if not on login page
    if (!window.location.pathname.includes('index.html')) {
        window.app = new EduTendApp();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EduTendApp;
} else {
    window.EduTendApp = EduTendApp;
}
