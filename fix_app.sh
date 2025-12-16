#!/bin/bash

# Automated Fix Script for Email Reminder App
# This script will fix your broken backend

set -e  # Exit on any error

echo "============================================"
echo "Email Reminder App - Automated Fix"
echo "============================================"
echo ""

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ ERROR: This doesn't look like the email-reminder-app directory"
    echo "Please run this script from the root of your project"
    exit 1
fi

echo "✓ Found email-reminder-app project"
echo ""

# Backup old files
echo "📦 Creating backup of old files..."
mkdir -p .backup
cp netlify/functions/create-reminder.js .backup/create-reminder.js.old 2>/dev/null || true
cp netlify/functions/check-reminders.js .backup/check-reminders.js.old 2>/dev/null || true
cp package.json .backup/package.json.old 2>/dev/null || true
echo "✓ Backup created in .backup/ directory"
echo ""

# Copy new files
echo "📝 Applying fixes..."

# Create reminder function
cat > netlify/functions/create-reminder.js << 'ENDOFFILE'
const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

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

    const store = getStore('reminders');
    const reminderId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const reminder = {
      id: reminderId,
      email: email,
      text: reminderText,
      scheduledTime: reminderDateTime.toISOString(),
      createdAt: new Date().toISOString(),
      sent: false
    };

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
ENDOFFILE

echo "✓ Fixed create-reminder.js"

# Check reminders function
cat > netlify/functions/check-reminders.js << 'ENDOFFILE'
const { getStore } = require('@netlify/blobs');
const { Resend } = require('resend');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Email service not configured' })
      };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const store = getStore('reminders');
    const { blobs } = await store.list();
    
    if (!blobs || blobs.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'No reminders to check',
          checked: 0,
          sent: 0
        })
      };
    }

    const now = new Date();
    let checkedCount = 0;
    let sentCount = 0;

    for (const blob of blobs) {
      try {
        checkedCount++;
        const reminderJson = await store.get(blob.key);
        const reminder = JSON.parse(reminderJson);

        if (reminder.sent) continue;

        const scheduledTime = new Date(reminder.scheduledTime);
        if (scheduledTime <= now) {
          console.log(`Sending reminder: ${reminder.id}`);

          try {
            await resend.emails.send({
              from: 'reminders@resend.dev',
              to: reminder.email,
              subject: '⏰ Reminder from Email Reminder App',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #667eea;">🔔 Your Reminder</h2>
                  <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="font-size: 18px; margin: 0;">${reminder.text}</p>
                  </div>
                  <p style="color: #666; font-size: 14px;">
                    Scheduled for: ${new Date(reminder.scheduledTime).toLocaleString()}
                  </p>
                </div>
              `
            });

            reminder.sent = true;
            reminder.sentAt = new Date().toISOString();
            await store.set(reminder.id, JSON.stringify(reminder));
            
            sentCount++;
            console.log(`Successfully sent reminder: ${reminder.id}`);

          } catch (emailError) {
            console.error(`Failed to send email for ${reminder.id}:`, emailError);
          }
        }
      } catch (reminderError) {
        console.error(`Error processing reminder ${blob.key}:`, reminderError);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Reminder check complete',
        checked: checkedCount,
        sent: sentCount
      })
    };

  } catch (error) {
    console.error('Error in check-reminders:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to check reminders',
        details: error.message
      })
    };
  }
};
ENDOFFILE

echo "✓ Fixed check-reminders.js"

# Update package.json
cat > package.json << 'ENDOFFILE'
{
  "name": "email-reminder-app",
  "version": "1.0.0",
  "description": "Simple email reminder service",
  "main": "index.html",
  "scripts": {
    "dev": "netlify dev"
  },
  "dependencies": {
    "@netlify/blobs": "^8.1.0",
    "resend": "^4.0.0"
  },
  "devDependencies": {
    "netlify-cli": "^17.0.0"
  }
}
ENDOFFILE

echo "✓ Fixed package.json (removed Supabase)"
echo ""

# Show git status
echo "📊 Changes made:"
git diff --stat

echo ""
echo "============================================"
echo "✅ FIX COMPLETE"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Review the changes above"
echo "2. Run: git add -A"
echo "3. Run: git commit -m 'Fix: Rewrite backend to use Netlify Blobs'"
echo "4. Run: git push origin main"
echo "5. Wait for Netlify to redeploy (2-3 minutes)"
echo "6. Test your app!"
echo ""
echo "Old files backed up in .backup/ directory"
echo ""
