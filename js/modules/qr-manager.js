/**
 * EdUTEND System - QR Code Management Module
 * 
 * @fileoverview Handles QR code generation, session management, and real-time updates
 * @author Code Crafters
 * @contributor Kay-M
 * @license MIT License - https://opensource.org/licenses/MIT
 * @copyright Copyright (c) 2025 Kay-M
 */

class QRManager {
    constructor() {
        this.currentPin = null;
        this.pinExpirationTimer = null;
        this.qrCodeInstance = null;
        this.sessionsStore = [];
        this.selectedCourse = null;
        this.defaultQrMinutesPref = 0;
        this.init();
    }

    init() {
        this.loadSessions();
        this.setupEventListeners();
        this.loadSettings();
    }

    setupEventListeners() {
        const generateQrBtn = document.getElementById('generate-qr-btn');
        const courseSelect = document.getElementById('course-select');

        if (generateQrBtn) {
            generateQrBtn.addEventListener('click', () => this.generateNewSession());
        }

        if (courseSelect) {
            courseSelect.addEventListener('change', (e) => this.handleCourseChange(e));
        }

        // Timer controls
        document.querySelectorAll('[onclick^="setTimer"]').forEach(btn => {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', (e) => {
                const minutes = parseInt(e.target.textContent);
                this.setTimer(minutes);
            });
        });

        // Close session buttons
        const closeSessionBtn = document.getElementById('close-session-btn');
        const prominentCloseBtn = document.getElementById('prominent-close-session-btn');
        
        if (closeSessionBtn) {
            closeSessionBtn.removeAttribute('onclick');
            closeSessionBtn.addEventListener('click', () => this.closeCurrentSession());
        }
        
        if (prominentCloseBtn) {
            prominentCloseBtn.removeAttribute('onclick');
            prominentCloseBtn.addEventListener('click', () => this.closeCurrentSession());
        }
    }

    loadSettings() {
        try {
            const raw = localStorage.getItem('lecturerSettings');
            if (raw) {
                const data = JSON.parse(raw);
                if (typeof data.defaultQrMinutes === 'number' && data.defaultQrMinutes >= 0) {
                    this.defaultQrMinutesPref = data.defaultQrMinutes;
                }
            }
        } catch (error) {
            console.warn('Failed to load QR settings:', error);
        }
    }

    handleCourseChange(event) {
        this.selectedCourse = event.target.value;
        if (this.selectedCourse) {
            this.clearQRDisplay();
            this.hideSessionStatus();
        }
    }

    clearQRDisplay() {
        if (this.qrCodeInstance) {
            this.qrCodeInstance.clear();
        }
        
        const qrDisplayArea = document.getElementById('qr-display-area');
        const courseSessionInfo = document.getElementById('course-session-info');
        const pinDisplay = document.getElementById('pin-display');
        const timerDisplay = document.getElementById('timer-display');
        
        if (qrDisplayArea) {
            qrDisplayArea.style.display = 'none';
            // Remove expired class when clearing display
            qrDisplayArea.classList.remove('expired');
        }
        if (courseSessionInfo) courseSessionInfo.style.display = 'none';
        if (pinDisplay) pinDisplay.textContent = '';
        if (timerDisplay) timerDisplay.textContent = '';
        
        this.clearExistingTimer();
    }

    hideSessionStatus() {
        const elements = [
            'session-status-indicator',
            'close-session-btn',
            'prominent-close-session-btn'
        ];
        
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });
    }

    generateNewSession() {
        if (!this.selectedCourse) {
            this.showNotification('Please select a course first.', 'error');
            return;
        }

        this.clearExistingTimer();
        this.clearQRDisplay();

        // Generate new PIN
        this.currentPin = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Create session data
        const sessionData = this.createSessionData();
        
        // Generate QR code
        this.generateQRCode(sessionData);
        
        // Update UI
        this.updateSessionUI(sessionData);
        
        // Save session
        this.saveSession(sessionData);
        
        // Show success message
        this.showNotification('QR Code generated successfully!', 'success');
    }

    createSessionData() {
        const now = new Date();
        const sessionId = `S${this.selectedCourse}${now.getTime()}`;
        
        return {
            pin: this.currentPin,
            courseCode: this.selectedCourse,
            courseName: this.getCourseName(this.selectedCourse),
            sessionId: sessionId,
            lecturerId: 'L001', // Would come from logged-in lecturer
            lecturerName: 'Dr. Lecturer', // Would come from logged-in lecturer
            createdTime: now.toISOString(),
            created: now.toISOString(), // Add for compatibility
            expiryTime: null,
            expiresAt: null, // Add expiresAt property for student validation
            status: 'active',
            type: 'attendance',
            maxDuration: this.defaultQrMinutesPref || 15,
            description: `Attendance session for ${this.getCourseName(this.selectedCourse)}`
        };
    }

    generateQRCode(sessionData) {
        // Try multiple possible container IDs to ensure compatibility
        const possibleContainers = ['qrcodeCanvas', 'qrcode', 'qr-code-container'];
        let qrcodeContainer = null;
        
        for (const containerId of possibleContainers) {
            qrcodeContainer = document.getElementById(containerId);
            if (qrcodeContainer) break;
        }
        
        if (!qrcodeContainer) {
            console.error('QR code container not found');
            return;
        }

        // Clear any existing QR code content
        qrcodeContainer.innerHTML = '';
        
        // Clear existing instance if it exists
        if (this.qrCodeInstance) {
            this.qrCodeInstance.clear();
            this.qrCodeInstance = null;
        }

        // Build redirect URL so any scanner opens the sign page directly
        const basePath = window.location.pathname.replace(/[^/]*$/, '');
        const redirectUrl = `${window.location.origin}${basePath}qr-redirect.html?sessionId=${encodeURIComponent(sessionData.sessionId)}&course=${encodeURIComponent(sessionData.courseCode)}&pin=${encodeURIComponent(sessionData.pin)}`;

        // Create new QR code instance
        this.qrCodeInstance = new QRCode(qrcodeContainer, {
            text: redirectUrl,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H,
        });
    }

    updateSessionUI(sessionData) {
        const qrDisplayArea = document.getElementById('qr-display-area');
        const courseSessionInfo = document.getElementById('course-session-info');
        const pinDisplay = document.getElementById('pin-display');
        
        // Show QR display area and session info
        if (qrDisplayArea) {
            qrDisplayArea.style.display = 'block';
            // Remove expired class when generating new session
            qrDisplayArea.classList.remove('expired');
        }
        if (courseSessionInfo) courseSessionInfo.style.display = 'block';
        if (pinDisplay) pinDisplay.textContent = `PIN: ${this.currentPin}`;
        
        // Update course session info
        this.updateCourseSessionInfo(sessionData);
        
        // Show session status
        this.showSessionStatus();
        
        // Apply default timer if set
        if (this.defaultQrMinutesPref && this.defaultQrMinutesPref > 0) {
            this.setTimer(this.defaultQrMinutesPref);
        }
    }

    updateCourseSessionInfo(sessionData) {
        const elements = {
            'qr-course-name': sessionData.courseName,
            'qr-course-code': sessionData.courseCode,
            'qr-session-id': sessionData.sessionId
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    showSessionStatus() {
        const elements = [
            'session-status-indicator',
            'close-session-btn',
            'prominent-close-session-btn'
        ];
        
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'block';
        });
    }

    saveSession(sessionData) {
        try {
            // Save to local sessions store
            const session = {
                id: sessionData.sessionId,
                course: sessionData.courseCode,
                courseName: sessionData.courseName,
                date: new Date().toISOString().slice(0, 10),
                time: new Date().toTimeString().slice(0, 5),
                status: 'Open',
                pin: sessionData.pin,
                lecturerId: sessionData.lecturerId,
                lecturerName: sessionData.lecturerName
            };
            
            this.sessionsStore.unshift(session);
            this.persistSessions();
            
            // Save to enhanced course sessions
            this.saveCourseSession(sessionData);
            
            // Update displays
            this.displayRecentSessions();
            
        } catch (error) {
            console.error('Failed to save session:', error);
            this.showNotification('Failed to save session. Please try again.', 'error');
        }
    }

    saveCourseSession(sessionData) {
        try {
            const courseSessions = JSON.parse(localStorage.getItem('courseSessions') || '[]');
            
            // Close any existing active sessions for this course
            courseSessions.forEach(s => {
                if (s.courseCode === this.selectedCourse && s.status === 'active') {
                    s.status = 'closed';
                    s.closedTime = new Date().toISOString();
                }
            });
            
            const courseSession = {
                sessionId: sessionData.sessionId,
                courseName: sessionData.courseName,
                courseCode: sessionData.courseCode,
                pin: sessionData.pin,
                createdTime: sessionData.createdTime,
                created: sessionData.created, // Add for compatibility
                expiryTime: sessionData.expiryTime,
                expiresAt: sessionData.expiresAt, // Add expiresAt for student validation
                status: 'active',
                lecturerId: sessionData.lecturerId,
                lecturerName: sessionData.lecturerName,
                sessionData: sessionData,
                attendanceCount: 0,
                maxStudents: 100,
                location: 'Main Campus',
                notes: ''
            };
            
            courseSessions.unshift(courseSession);
            localStorage.setItem('courseSessions', JSON.stringify(courseSessions));
            
            // Broadcast session update
            this.broadcastSessionUpdate(courseSession);
            
        } catch (error) {
            console.error('Failed to save course session:', error);
        }
    }

    setTimer(minutes) {
        if (!this.currentPin) {
            this.showNotification('Generate a PIN first.', 'error');
            return;
        }

        this.clearExistingTimer();
        
        let seconds = minutes * 60;
        
        // Update session expiration time
        this.updateSessionExpiration(minutes);
        
        this.pinExpirationTimer = setInterval(() => {
            seconds--;
            const min = Math.floor(seconds / 60);
            const sec = seconds % 60;
            
            const timerDisplay = document.getElementById('timer-display');
            if (timerDisplay) {
                timerDisplay.textContent = `Expires in: ${min}:${sec < 10 ? '0' : ''}${sec}`;
            }
            
            if (seconds <= 0) {
                this.markQrExpired();
            }
        }, 1000);
    }

    updateSessionExpiration(minutes) {
        if (!this.selectedCourse) return;
        
        try {
            const courseSessions = JSON.parse(localStorage.getItem('courseSessions') || '[]');
            const activeSession = courseSessions.find(s => 
                s.status === 'active' && s.courseCode === this.selectedCourse
            );
            
            if (activeSession) {
                const expiresAt = new Date(Date.now() + (minutes * 60 * 1000));
                // Set both expiryTime and expiresAt for compatibility
                activeSession.expiryTime = expiresAt.toISOString();
                activeSession.expiresAt = expiresAt.toISOString();
                
                if (activeSession.sessionData) {
                    activeSession.sessionData.expiryTime = expiresAt.toISOString();
                    activeSession.sessionData.expiresAt = expiresAt.toISOString();
                }
                localStorage.setItem('courseSessions', JSON.stringify(courseSessions));
            }
        } catch (error) {
            console.warn('Failed to update session expiration:', error);
        }
    }

    clearExistingTimer() {
        if (this.pinExpirationTimer) {
            clearInterval(this.pinExpirationTimer);
            this.pinExpirationTimer = null;
        }
    }

    markQrExpired() {
        this.clearExistingTimer();
        
        const timerDisplay = document.getElementById('timer-display');
        const pinDisplay = document.getElementById('pin-display');
        const qrDisplayArea = document.getElementById('qr-display-area');
        
        if (timerDisplay) timerDisplay.textContent = 'Expired!';
        if (pinDisplay) pinDisplay.textContent = 'PIN EXPIRED';
        if (qrDisplayArea) qrDisplayArea.classList.add('expired');
        
        if (this.qrCodeInstance) {
            this.qrCodeInstance.clear();
        }
        
        this.currentPin = null;
        this.closeCourseSession();
        this.hideSessionStatus();
        this.displayRecentSessions();
    }

    closeCourseSession() {
        if (!this.selectedCourse) return;
        
        try {
            const courseSessions = JSON.parse(localStorage.getItem('courseSessions') || '[]');
            const activeSession = courseSessions.find(s => 
                s.status === 'active' && s.courseCode === this.selectedCourse
            );
            
            if (activeSession) {
                activeSession.status = 'closed';
                activeSession.closedTime = new Date().toISOString();
                localStorage.setItem('courseSessions', JSON.stringify(courseSessions));
            }
        } catch (error) {
            console.warn('Failed to update course session status:', error);
        }
    }

    closeCurrentSession() {
        if (confirm('Are you sure you want to close the current session?')) {
            this.closeCourseSession();
            
            // Update legacy sessions store
            const openSession = this.sessionsStore.find(s => s.status === 'Open');
            if (openSession) {
                openSession.status = 'Closed';
                this.persistSessions();
            }
            
            this.markQrExpired();
            this.showNotification('Session has been closed successfully!', 'success');
        }
    }

    loadSessions() {
        try {
            this.sessionsStore = JSON.parse(localStorage.getItem('lecturerSessions') || '[]');
        } catch (error) {
            console.error('Failed to load sessions:', error);
            this.sessionsStore = [];
        }
    }

    persistSessions() {
        try {
            localStorage.setItem('lecturerSessions', JSON.stringify(this.sessionsStore));
        } catch (error) {
            console.error('Failed to persist sessions:', error);
        }
    }

    displayRecentSessions() {
        try {
            const courseSessions = JSON.parse(localStorage.getItem('courseSessions') || '[]');
            const recentSessions = courseSessions.slice(0, 5);
            const recentSessionsList = document.getElementById('recent-sessions-list');
            
            if (!recentSessionsList) return;
            
            if (recentSessions.length === 0) {
                recentSessionsList.innerHTML = '<p class="muted">No recent sessions found.</p>';
                return;
            }
            
            let html = '';
            recentSessions.forEach(session => {
                const created = new Date(session.createdTime).toLocaleString();
                const statusClass = session.status === 'active' ? 'status-active' : 'status-closed';
                html += `
                    <div class="session-item ${statusClass}">
                        <div class="session-header">
                            <strong>${session.courseName} (${session.courseCode})</strong>
                            <span class="session-status">${session.status}</span>
                        </div>
                        <div class="session-details">
                            <span>Session: ${session.sessionId}</span>
                            <span>Created: ${created}</span>
                        </div>
                    </div>
                `;
            });
            recentSessionsList.innerHTML = html;
        } catch (error) {
            console.warn('Failed to display recent sessions:', error);
        }
    }

    broadcastSessionUpdate(session) {
        try {
            const event = new StorageEvent('storage', {
                key: 'courseSessions',
                newValue: localStorage.getItem('courseSessions'),
                url: window.location.href
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.warn('Failed to broadcast session update:', error);
        }
    }

    getCourseName(code) {
        const courseNames = {
            'HCI': 'Human Computer Interaction II',
            'TEP': 'Technical Programming I',
            'DES': 'Development Software II',
            'INF': 'Information System II',
            'DEV': 'Development Software I',
            'ITS': 'Information Technology Skills I',
            'IS': 'Information Systems I',
            'SS': 'System Software I'
        };
        return courseNames[code] || code;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        // Set background color based on type
        const colors = {
            success: '#2ecc71',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QRManager;
} else {
    window.QRManager = QRManager;
}
