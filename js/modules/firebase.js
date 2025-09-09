(function(){
    // Minimal Firebase wrapper for EdUTEND
    const FirebaseDB = {
        app: null,
        db: null,
        isReady: false,

        init: function() {
            try {
                if (this.isReady) return true;

                // Default config (can be overridden by saving 'firebaseConfig' in localStorage)
                const defaultConfig = {
                    apiKey: "AIzaSyCCL0lBKOLwTVu-9ThQQL1QWLlfUlHlXIY",
                    authDomain: "hcie-849a6.firebaseapp.com",
                    projectId: "hcie-849a6",
                    storageBucket: "hcie-849a6.appspot.com",
                    messagingSenderId: "611752883736",
                    appId: "1:611752883736:web:729b0f5d97a0115e02b56d"
                };

                const stored = localStorage.getItem('firebaseConfig');
                const config = stored ? JSON.parse(stored) : defaultConfig;

                if (!window.firebase || !window.firebase.initializeApp) {
                    console.warn('Firebase SDK not loaded');
                    return false;
                }

                // Avoid duplicate initialization
                if (window.firebase.apps && window.firebase.apps.length) {
                    this.app = window.firebase.app();
                } else {
                    this.app = window.firebase.initializeApp(config);
                }
                this.db = window.firebase.firestore();
                this.isReady = true;
                return true;
            } catch (e) {
                console.warn('Firebase init failed:', e);
                return false;
            }
        },

        // Save a course session document with pin only (no QR payload)
        saveCourseSession: async function(sessionData) {
            try {
                if (!this.init()) {
                    console.error('Firebase not initialized');
                    return false;
                }
                const doc = {
                    sessionId: sessionData.sessionId,
                    courseCode: sessionData.courseCode,
                    courseName: sessionData.courseName,
                    pin: sessionData.pin,
                    status: 'active',
                    lecturerId: sessionData.lecturerId || null,
                    lecturerName: sessionData.lecturerName || null,
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                    expiresAt: sessionData.expiresAt || null,
                    attendanceCount: 0
                };
                console.log('Saving session to Firebase:', doc);
                await this.db.collection('courseSessions').doc(sessionData.sessionId).set(doc, { merge: true });
                console.log('Session saved successfully to Firebase');
                return true;
            } catch (e) {
                console.error('Failed to save session to Firebase:', e);
                return false;
            }
        },

        // Close a session by ID
        closeCourseSession: async function(sessionId) {
            try {
                if (!this.init()) return false;
                await this.db.collection('courseSessions').doc(sessionId).set({
                    status: 'closed',
                    closedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                return true;
            } catch (e) {
                console.warn('Failed to close session in Firebase:', e);
                return false;
            }
        },

        // Find active session by pin
        findActiveSessionByPin: async function(pin) {
            try {
                if (!this.init()) return null;
                const snap = await this.db.collection('courseSessions')
                    .where('pin', '==', pin)
                    .where('status', '==', 'active')
                    .limit(1)
                    .get();
                if (snap.empty) return null;
                const doc = snap.docs[0];
                return { id: doc.id, ...doc.data() };
            } catch (e) {
                console.warn('Failed to find session by pin:', e);
                return null;
            }
        },

        // Increment attendance count safely
        incrementAttendance: async function(sessionId) {
            try {
                if (!this.init()) return false;
                const ref = this.db.collection('courseSessions').doc(sessionId);
                await this.db.runTransaction(async (tx) => {
                    const doc = await tx.get(ref);
                    const current = (doc.exists && doc.data().attendanceCount) || 0;
                    tx.set(ref, { attendanceCount: current + 1 }, { merge: true });
                });
                return true;
            } catch (e) {
                console.warn('Failed to increment attendance:', e);
                return false;
            }
        },

        // Set or update session expiration
        setExpiration: async function(sessionId, expiresAtIso) {
            try {
                if (!this.init()) return false;
                await this.db.collection('courseSessions').doc(sessionId).set({
                    expiresAt: expiresAtIso
                }, { merge: true });
                return true;
            } catch (e) {
                console.warn('Failed to update expiration:', e);
                return false;
            }
        },

        // Add attendance record (also increments attendanceCount if requested)
        addAttendance: async function(sessionId, attendance, alsoIncrement = true) {
            try {
                if (!this.init()) {
                    console.error('Firebase not initialized for attendance');
                    return false;
                }
                const ref = this.db.collection('courseSessions').doc(sessionId)
                    .collection('attendances').doc(attendance.id);
                const payload = {
                    studentId: attendance.studentId || null,
                    studentName: attendance.studentName || null,
                    courseCode: attendance.courseCode || null,
                    courseName: attendance.courseName || null,
                    pin: attendance.pin || null,
                    status: attendance.status || 'Present',
                    createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                };
                console.log('Saving attendance to Firebase:', payload);
                await ref.set(payload, { merge: true });
                console.log('Attendance saved successfully to Firebase');

                if (alsoIncrement) {
                    console.log('Incrementing attendance count...');
                    await this.incrementAttendance(sessionId);
                }
                return true;
            } catch (e) {
                console.error('Failed to add attendance:', e);
                return false;
            }
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = FirebaseDB;
    } else {
        window.FirebaseDB = FirebaseDB;
    }
})();


