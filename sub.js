
document.addEventListener("DOMContentLoaded", () => {
  let app, db, auth, userId;
  let currentPin = null;
  let pinExpirationTimer = null;
  let qrCodeInstance = null;
  let currentCourse = null; // Store current course information

  // --- DOM References ---
  
  const createBtn = document.getElementById("create-btn");
  const submitBtn = document.getElementById("submit-btn");
  const generateQrBtn = document.getElementById("generate-qr-btn");
  const qrDisplayArea = document.getElementById("qr-display-area");
  const qrcodeContainer = document.getElementById("qrcode");
  const pinDisplay = document.getElementById("pin-display");
  const timerDisplay = document.getElementById("timer-display");
  const submitAttendanceBtn = document.getElementById("submit-attendance-btn");
  const pinInput = document.getElementById("pin-input");
  const switchInputBtn = document.getElementById("switch-input-btn");
  const pinInputArea = document.getElementById("pin-input-area");
  const qrScanArea = document.getElementById("qr-scan-area");
  const submissionsTableBody = document.querySelector(
    "#submissions-table tbody"
  );
  const datePicker = document.getElementById("date-picker");
  const viewPrevBtn = document.getElementById("view-prev-btn");
  const studentNameInput = document.getElementById("student-name");
  const studentNumberInput = document.getElementById("student-number");

  // --- Overlays ---
  window.openOverlay = (id) =>
    (document.getElementById(id).style.display = "flex");
  window.closeOverlay = (id) =>
    (document.getElementById(id).style.display = "none");


  // --- Event Listeners ---
  createBtn && createBtn.addEventListener("click", () => openOverlay("create-overlay"));
  submitBtn && submitBtn.addEventListener("click", () => openOverlay("submit-overlay"));
  generateQrBtn && generateQrBtn.addEventListener("click", generateNewSession);
  submitAttendanceBtn && submitAttendanceBtn.addEventListener("click", handleSubmission);
  switchInputBtn && switchInputBtn.addEventListener("click", toggleInputMethod);
  viewPrevBtn && viewPrevBtn.addEventListener("click", viewPreviousSubmissions);

  // Add event listeners to all Create Class buttons to open the QR overlay
  document.querySelectorAll('.create-class-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = btn.closest('.card');
      if (card) {
        // Store course information
        currentCourse = {
          name: card.getAttribute('data-module-name') || card.querySelector('h2').textContent,
          code: card.getAttribute('data-module-code') || card.querySelector('p').textContent
        };
        
        // Update the overlay with course information
        document.getElementById('selected-course-name').textContent = currentCourse.name;
        document.getElementById('selected-course-code').textContent = currentCourse.code;
        
        // Clear any previous QR code
        if (qrCodeInstance) {
          qrCodeInstance.clear();
        }
        qrDisplayArea.style.display = "none";
        pinDisplay.textContent = "";
        timerDisplay.textContent = "";
        
        openOverlay('qr-overlay');
      }
    });
  });

  // Use event delegation for view-details-btn to ensure it works for all cards
  document.querySelector('.card-grid')?.addEventListener('click', function(e) {
    const btn = e.target.closest('.view-details-btn');
    if (btn) {
      const card = btn.closest('.card');
      if (card) {
        const moduleName = card.getAttribute('data-module-name') || card.querySelector('h2').textContent;
        const moduleCode = card.getAttribute('data-module-code') || card.querySelector('p').textContent;
        document.getElementById('details-overlay-title').textContent = moduleName + ' (' + moduleCode + ')';
      }
      openOverlay('details-overlay');
    }
  });

  // Function to update course status indicators
  function updateCourseStatuses() {
    try {
      const courseSessions = JSON.parse(localStorage.getItem('courseSessions') || '[]');
      
      // Get all course codes
      const courseCodes = ['HCI', 'TEP', 'DES', 'INF', 'DEV', 'ITS', 'IS', 'SS'];
      
      courseCodes.forEach(courseCode => {
        const statusElement = document.getElementById(`course-status-${courseCode}`);
        const liveSessionBtn = document.getElementById(`live-session-${courseCode}`);
        const card = document.querySelector(`[data-module-code="${courseCode}"]`);
        
        if (statusElement && liveSessionBtn && card) {
          const activeSession = courseSessions.find(s => s.courseCode === courseCode && s.status === 'active');
          
          if (activeSession) {
            // Active session
            statusElement.innerHTML = '<span class="status-indicator active">Active Session</span>';
            liveSessionBtn.style.display = 'inline-block';
            card.classList.add('has-active-session');
            
            // Update live session button with session info
            liveSessionBtn.textContent = `Live: ${activeSession.pin}`;
            liveSessionBtn.href = `Lecturer.html#qrcode`;
          } else {
            // No active session
            statusElement.innerHTML = '<span class="status-indicator">No active session</span>';
            liveSessionBtn.style.display = 'none';
            card.classList.remove('has-active-session');
          }
        }
      });
    } catch (e) {
      console.warn('Failed to update course statuses:', e);
    }
  }

  // Function to check for expired sessions and update statuses
  function checkExpiredSessions() {
    try {
      const courseSessions = JSON.parse(localStorage.getItem('courseSessions') || '[]');
      let hasChanges = false;
      
      courseSessions.forEach(session => {
        if (session.status === 'active' && session.expiresAt && session.expiresAt !== null) {
          const expiresAt = new Date(session.expiresAt);
          const now = new Date();
          
          if (expiresAt < now) {
            session.status = 'closed';
            hasChanges = true;
          }
        }
      });
      
      if (hasChanges) {
        localStorage.setItem('courseSessions', JSON.stringify(courseSessions));
        updateCourseStatuses();
      }
    } catch (e) {
      console.warn('Failed to check expired sessions:', e);
    }
  }

  // Initialize course statuses on page load
  document.addEventListener('DOMContentLoaded', () => {
    updateCourseStatuses();
    
    // Check for expired sessions every minute
    setInterval(checkExpiredSessions, 60000);
    
    // Update statuses when localStorage changes (for cross-tab sync)
    window.addEventListener('storage', (e) => {
      if (e.key === 'courseSessions') {
        updateCourseStatuses();
      }
    });
  });

  // Function to load and display course sessions
  function loadCourseSessions(courseCode) {
    try {
      const courseSessions = JSON.parse(localStorage.getItem('courseSessions') || '[]');
      const courseAttendance = JSON.parse(localStorage.getItem('courseAttendanceRecords') || '[]');
      
      const sessionsList = document.getElementById('course-sessions-list');
      if (!sessionsList) return;
      
      const filteredSessions = courseSessions.filter(s => s.courseCode === courseCode);
      
      if (filteredSessions.length === 0) {
        sessionsList.innerHTML = '<p class="muted">No sessions found for this course.</p>';
        return;
      }
      
      let html = '';
      filteredSessions.forEach(session => {
        const created = new Date(session.created).toLocaleString();
        const statusClass = session.status === 'active' ? 'status-active' : 'status-closed';
        const attendanceCount = courseAttendance.filter(a => a.sessionId === session.id).length;
        
        html += `
          <div class="session-item ${statusClass}">
            <div class="session-header">
              <strong>Session: ${session.id}</strong>
              <span class="session-status">${session.status}</span>
            </div>
            <div class="session-details">
              <span>PIN: ${session.pin}</span>
              <span>Created: ${created}</span>
              <span>Attendance: ${attendanceCount} students</span>
            </div>
            <div class="session-actions">
              <button class="btn btn-small view-attendance-btn" data-session-id="${session.id}">
                View Attendance
              </button>
            </div>
          </div>
        `;
      });
      
      sessionsList.innerHTML = html;
      
      // Add event listeners to view attendance buttons
      sessionsList.querySelectorAll('.view-attendance-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sessionId = btn.getAttribute('data-session-id');
          viewSessionAttendance(sessionId, courseCode);
        });
      });
      
    } catch (e) {
      console.warn('Failed to load course sessions:', e);
      document.getElementById('course-sessions-list').innerHTML = '<p class="muted">Error loading sessions.</p>';
    }
  }

  // Function to view session attendance
  function viewSessionAttendance(sessionId, courseCode) {
    try {
      const courseSessions = JSON.parse(localStorage.getItem('courseSessions') || '[]');
      const courseAttendance = JSON.parse(localStorage.getItem('courseAttendanceRecords') || '[]');
      
      const session = courseSessions.find(s => s.id === sessionId);
      const attendance = courseAttendance.filter(a => a.sessionId === sessionId);
      
      if (!session) {
        alert('Session not found.');
        return;
      }
      
      // Update session info
      document.getElementById('detail-session-id').textContent = session.id;
      document.getElementById('detail-course-name').textContent = session.courseName;
      document.getElementById('detail-pin').textContent = session.pin;
      document.getElementById('detail-status').textContent = session.status;
      
      // Update attendance table
      const tbody = document.getElementById('submission-detail-table-body');
      if (attendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="centered-cell">No attendance records found.</td></tr>';
      } else {
        tbody.innerHTML = '';
        attendance.forEach(record => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${record.studentName}</td>
            <td>${record.studentId}</td>
            <td>${new Date(record.timestamp).toLocaleString()}</td>
            <td><span class="status-badge present">${record.status}</span></td>
          `;
          tbody.appendChild(row);
        });
      }
      
      // Show attendance view
      document.getElementById('session-list-view').style.display = 'none';
      document.getElementById('submission-detail-view').style.display = 'block';
      
    } catch (e) {
      console.warn('Failed to view session attendance:', e);
      alert('Error loading attendance data.');
    }
  }

  // Function to go back to sessions list
  function backToSessions() {
    document.getElementById('submission-detail-view').style.display = 'none';
    document.getElementById('session-list-view').style.display = 'block';
  }

  // Add event listeners for details overlay
  document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('back-to-sessions-btn');
    const refreshBtn = document.getElementById('refresh-sessions-btn');
    const statusFilter = document.getElementById('session-status-filter');
    
    if (backBtn) {
      backBtn.addEventListener('click', backToSessions);
    }
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        const courseCode = getCurrentCourseCode();
        if (courseCode) {
          loadCourseSessions(courseCode);
        }
      });
    }
    
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        const courseCode = getCurrentCourseCode();
        if (courseCode) {
          loadCourseSessions(courseCode);
        }
      });
    }
  });

  // Helper function to get current course code from overlay title
  function getCurrentCourseCode() {
    const title = document.getElementById('details-overlay-title');
    if (title) {
      const match = title.textContent.match(/\(([A-Z]+)\)/);
      return match ? match[1] : null;
    }
    return null;
  }

  // --- Random pin generator api and qr code api ---
  function generateNewSession() {
    if (!currentCourse) {
      alert('No course selected. Please try again.');
      return;
    }

    currentPin = Math.floor(100000 + Math.random() * 900000).toString();
    pinDisplay.textContent = `PIN: ${currentPin}`;

    // Use QR Manager instead of creating duplicate QR codes
    if (window.app && window.app.modules && window.app.modules.qr) {
      // Let QR Manager handle QR generation
      window.app.modules.qr.generateNewSession();
    } else {
      // Fallback: Only create QR if no QR Manager exists
      if (qrCodeInstance) {
        qrCodeInstance.clear();
        qrCodeInstance.makeCode(currentPin);
      } else if (qrcodeContainer) {
        // Clear container first to prevent duplicates
        qrcodeContainer.innerHTML = '';
        qrCodeInstance = new QRCode(qrcodeContainer, {
          text: currentPin,
          width: 200,
          height: 200,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H,
        });
      }
    }

    qrDisplayArea.style.display = "block";
    
    // Update session information display
    const now = new Date();
    const sessionId = `S${currentCourse.code}${now.getTime()}`;
    
    document.getElementById('session-course-name').textContent = currentCourse.name;
    document.getElementById('session-course-code').textContent = currentCourse.code;
    document.getElementById('session-id').textContent = sessionId;
    document.getElementById('session-created').textContent = now.toLocaleString();
    
    // Store session in localStorage for tracking
    const session = {
      id: sessionId,
      courseName: currentCourse.name,
      courseCode: currentCourse.code,
      pin: currentPin,
      created: now.toISOString(),
      createdTime: now.toISOString(), // Add for compatibility
      expiresAt: null, // Add expiresAt property for student validation
      status: 'active'
    };
    
    // Save to localStorage
    const sessions = JSON.parse(localStorage.getItem('courseSessions') || '[]');
    sessions.unshift(session);
    localStorage.setItem('courseSessions', JSON.stringify(sessions));
    
    console.log("Generated PIN:", currentPin, "for course:", currentCourse.name);
  }

  window.setTimer = (minutes) => {
    if (!currentPin) {
      alert("Generate a PIN first.");
      return;
    }

    if (pinExpirationTimer) clearInterval(pinExpirationTimer);

    let seconds = minutes * 60;
    pinExpirationTimer = setInterval(() => {
      seconds--;
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      timerDisplay.textContent = `Expires in: ${min}:${
        sec < 10 ? "0" : ""
      }${sec}`;

      if (seconds <= 0) {
        clearInterval(pinExpirationTimer);
        timerDisplay.textContent = "Expired!";
        currentPin = null;
        pinDisplay.textContent = "PIN EXPIRED";
      }
    }, 1000);
  };

  function validateSubmission() {
    const name = studentNameInput.value.trim();
    const number = studentNumberInput.value.trim();
    const pin = pinInput.value.trim();

    if (name && number && currentPin && pin === currentPin) {
      submitAttendanceBtn.disabled = false;
    } else {
      submitAttendanceBtn.disabled = true;
    }
  }

  async function handleSubmission() {
    console.log("Submit button clicked");

    const name = studentNameInput.value.trim();
    const studentNumber = studentNumberInput.value.trim();

    if (!name || !studentNumber) {
      alert("Please enter name and student number.");
      return;
    }

    submitAttendanceBtn.disabled = true;
    submitAttendanceBtn.textContent = "Submitting...";

    try {
      const today = new Date().toISOString().slice(0, 10);
      const submissionData = {
        name,
        studentNumber,
        timestamp: serverTimestamp(),
        date: today,
      };

      const docRef = await addDoc(
        collection(db, `attendance/${today}/submissions`),
        submissionData
      );
      console.log("Submitted successfully:", docRef.id);

      alert("Attendance submitted!");
      closeOverlay("submit-overlay");

      // Clear form
      studentNameInput.value = "";
      studentNumberInput.value = "";
      pinInput.value = "";
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit. Try again.");
    } finally {
      submitAttendanceBtn.disabled = false;
      submitAttendanceBtn.textContent = "Submit";
    }
  }

  function toggleInputMethod() {
    const isPinVisible = pinInputArea.style.display !== "none";
    pinInputArea.style.display = isPinVisible ? "none" : "block";
    qrScanArea.style.display = isPinVisible ? "block" : "none";
    switchInputBtn.textContent = isPinVisible
      ? "Switch to Enter PIN"
      : "Switch to Scan QR";
  }

  function listenForSubmissions() {
    const today = new Date().toISOString().slice(0, 10);
    const q = query(collection(db, `attendance/${today}/submissions`));

    onSnapshot(q, (snapshot) => {
      submissionsTableBody.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const row = submissionsTableBody.insertRow();
        row.innerHTML = `
                    <td>${data.name}</td>
                    <td>${data.studentNumber}</td>
                    <td>${
                      data.timestamp
                        ? new Date(data.timestamp.toDate()).toLocaleString()
                        : "N/A"
                    }</td>
                    <td><i class="fas fa-check-circle" style="color: green;"></i> Confirmed</td>
                `;
      });
    });
  }

  async function viewPreviousSubmissions() {
    const selectedDate = datePicker.value;
    if (!selectedDate) {
      alert("Please select a date.");
      return;
    }

    submissionsTableBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

    const q = query(collection(db, `attendance/${selectedDate}/submissions`));
    const snapshot = await getDocs(q);

    submissionsTableBody.innerHTML = "";
    if (snapshot.empty) {
      submissionsTableBody.innerHTML =
        '<tr><td colspan="4">No submissions found.</td></tr>';
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const row = submissionsTableBody.insertRow();
      row.innerHTML = `
                <td>${data.name}</td>
                <td>${data.studentNumber}</td>
                <td>${
                  data.timestamp
                    ? new Date(data.timestamp.toDate()).toLocaleString()
                    : "N/A"
                }</td>
                <td><i class="fas fa-check-circle" style="color: green;"></i> Confirmed</td>
            `;
    });
  }
});
