// Request notification permission when page loads
if ('Notification' in window && Notification.permission === 'default') {
    showNotificationPrompt();
}

// Get reminders from localStorage
function getReminders() {
    const reminders = localStorage.getItem('reminders');
    return reminders ? JSON.parse(reminders) : [];
}

// Save reminders to localStorage
function saveReminders(reminders) {
    localStorage.setItem('reminders', JSON.stringify(reminders));
}

// Show notification prompt
function showNotificationPrompt() {
    const promptDiv = document.createElement('div');
    promptDiv.className = 'notification-prompt';
    promptDiv.innerHTML = `
        <p><strong>Enable notifications to receive your reminders!</strong></p>
        <button onclick="requestNotificationPermission()">Enable Notifications</button>
    `;
    document.querySelector('.container').insertBefore(promptDiv, document.querySelector('.form-card'));
}

// Request notification permission
function requestNotificationPermission() {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            const prompt = document.querySelector('.notification-prompt');
            if (prompt) prompt.remove();
            alert('Notifications enabled! You\'ll receive reminders when they\'re due.');
        }
    });
}

// Create a reminder
function createReminder(text, date, time) {
    const reminders = getReminders();
    const reminder = {
        id: Date.now(),
        text: text,
        date: date,
        time: time,
        dateTime: new Date(`${date}T${time}`).getTime(),
        notified: false
    };
    reminders.push(reminder);
    saveReminders(reminders);
    return reminder;
}

// Delete a reminder
function deleteReminder(id) {
    let reminders = getReminders();
    reminders = reminders.filter(r => r.id !== id);
    saveReminders(reminders);
    displayReminders();
}

// Display all reminders
function displayReminders() {
    const reminders = getReminders();
    const remindersList = document.getElementById('remindersList');

    if (reminders.length === 0) {
        remindersList.innerHTML = '<div class="empty-state">No reminders yet. Create one above!</div>';
        return;
    }

    // Sort by date/time
    reminders.sort((a, b) => a.dateTime - b.dateTime);

    remindersList.innerHTML = reminders.map(reminder => {
        const isPast = reminder.dateTime < Date.now();
        return `
            <div class="reminder-item" style="${isPast ? 'opacity: 0.6;' : ''}">
                <div class="reminder-info">
                    <div class="reminder-text">${reminder.text}</div>
                    <div class="reminder-time">
                        ${new Date(reminder.dateTime).toLocaleString()}
                        ${isPast ? '(Past)' : ''}
                    </div>
                </div>
                <button class="btn-delete" onclick="deleteReminder(${reminder.id})">Delete</button>
            </div>
        `;
    }).join('');
}

// Check for due reminders
function checkReminders() {
    const reminders = getReminders();
    const now = Date.now();

    reminders.forEach(reminder => {
        if (!reminder.notified && reminder.dateTime <= now) {
            // Show notification
            if (Notification.permission === 'granted') {
                new Notification('Reminder!', {
                    body: reminder.text,
                    icon: '📧'
                });
            }

            // Mark as notified
            reminder.notified = true;
        }
    });

    saveReminders(reminders);
}

// Handle form submission
document.getElementById('reminderForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const text = document.getElementById('reminderText').value;
    const date = document.getElementById('reminderDate').value;
    const time = document.getElementById('reminderTime').value;

    // Validate that the date/time is in the future
    const reminderDateTime = new Date(`${date}T${time}`);
    if (reminderDateTime <= new Date()) {
        alert('Please select a future date and time!');
        return;
    }

    createReminder(text, date, time);
    displayReminders();

    // Reset form
    this.reset();

    alert('Reminder created successfully!');
});

// Check reminders every minute
setInterval(checkReminders, 60000);

// Initial display
displayReminders();

// Set minimum date to today
document.getElementById('reminderDate').min = new Date().toISOString().split('T')[0];
