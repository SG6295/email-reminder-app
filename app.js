// Handle form submission
document.getElementById('reminderForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const submitButton = this.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;

    // Disable button and show loading state
    submitButton.disabled = true;
    submitButton.textContent = 'Creating reminder...';

    const email = document.getElementById('email').value;
    const reminderText = document.getElementById('reminderText').value;
    const reminderDate = document.getElementById('reminderDate').value;
    const reminderTime = document.getElementById('reminderTime').value;

    // Validate that the date/time is in the future
    const reminderDateTime = new Date(`${reminderDate}T${reminderTime}`);
    if (reminderDateTime <= new Date()) {
        alert('Please select a future date and time!');
        submitButton.disabled = false;
        submitButton.textContent = originalText;
        return;
    }

    try {
        // Call the backend API to create reminder
        const response = await fetch('/api/create-reminder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                reminderText,
                reminderDate,
                reminderTime
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Show success message
            alert(`✓ Reminder created successfully!\n\nWe'll send an email to ${email} on ${reminderDateTime.toLocaleString()}`);

            // Reset form
            this.reset();

            // Save email to localStorage for convenience
            localStorage.setItem('lastEmail', email);
        } else {
            throw new Error(data.error || 'Failed to create reminder');
        }
    } catch (error) {
        console.error('Error creating reminder:', error);
        alert('Sorry, there was an error creating your reminder. Please try again.');
    } finally {
        // Re-enable button
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
});

// Set minimum date to today
document.getElementById('reminderDate').min = new Date().toISOString().split('T')[0];

// Pre-fill email if previously used
window.addEventListener('DOMContentLoaded', () => {
    const lastEmail = localStorage.getItem('lastEmail');
    if (lastEmail) {
        document.getElementById('email').value = lastEmail;
    }
});
