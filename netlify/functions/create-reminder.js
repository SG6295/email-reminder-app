const { getStore } = require('@netlify/blobs');

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

    // Get the reminders store
    const store = getStore('reminders');

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

    // Store in Netlify Blobs
    await store.set(reminderId, JSON.stringify(reminder));

    console.log('Reminder created:', reminderId);

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
