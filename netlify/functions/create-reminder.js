const { getStore } = require('@netlify/blobs');
const fs = require('fs').promises;
const path = require('path');

// Helper functions for local storage
const LOCAL_STORAGE_DIR = path.join('/tmp', 'reminders');

async function initLocalStorage() {
  try {
    await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating local storage directory:', error);
  }
}

async function saveToLocalStorage(key, value) {
  await initLocalStorage();
  const filePath = path.join(LOCAL_STORAGE_DIR, `${key}.json`);
  await fs.writeFile(filePath, value, 'utf8');
}

// Check if we're running in local dev or production
const isLocalDev = !process.env.NETLIFY_DEV || process.env.CONTEXT === 'dev';

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { email, reminderText, reminderDate, reminderTime } = JSON.parse(event.body);

    // Validate inputs
    if (!email || !reminderText || !reminderDate || !reminderTime) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields'
        })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid email format'
        })
      };
    }

    // Create datetime and validate it's in the future
    const reminderDateTime = new Date(`${reminderDate}T${reminderTime}`);
    if (reminderDateTime <= new Date()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Reminder time must be in the future'
        })
      };
    }

    // Create unique ID for this reminder
    const reminderId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create reminder object
    const reminder = {
      id: reminderId,
      email: email,
      text: reminderText,
      scheduledTime: reminderDateTime.toISOString(),
      createdAt: new Date().toISOString(),
      sent: false
    };

    // Store the reminder (local or Netlify Blobs)
    try {
      const store = getStore('reminders');
      await store.set(reminderId, JSON.stringify(reminder));
      console.log('Reminder saved to Netlify Blobs:', reminderId);
    } catch (blobError) {
      // Fallback to local storage if Blobs aren't available
      console.log('Netlify Blobs not available, using local storage');
      await saveToLocalStorage(reminderId, JSON.stringify(reminder));
      console.log('Reminder saved to local storage:', reminderId);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Reminder created successfully',
        reminderId: reminderId
      })
    };

  } catch (error) {
    console.error('Error creating reminder:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error: ' + error.message
      })
    };
  }
};
