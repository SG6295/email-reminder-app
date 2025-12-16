const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, reminderText, reminderDate, reminderTime } = JSON.parse(event.body);

    // Validate inputs
    if (!email || !reminderText || !reminderDate || !reminderTime) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Create reminder object
    const reminder = {
      email,
      text: reminderText,
      date: reminderDate,
      time: reminderTime,
      dateTime: new Date(`${reminderDate}T${reminderTime}`).toISOString(),
      sent: false,
      createdAt: new Date().toISOString()
    };

    // Store in Netlify Blobs (simple key-value storage)
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('reminders');
    const id = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await store.set(id, JSON.stringify(reminder));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Reminder created successfully',
        id
      })
    };
  } catch (error) {
    console.error('Error creating reminder:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create reminder',
        details: error.message
      })
    };
  }
};
