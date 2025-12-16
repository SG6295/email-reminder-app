const { getStore } = require('@netlify/blobs');
const { Resend } = require('resend');
const fs = require('fs').promises;
const path = require('path');

// Helper functions for local storage
const LOCAL_STORAGE_DIR = path.join('/tmp', 'reminders');

async function getFromLocalStorage() {
  try {
    const files = await fs.readdir(LOCAL_STORAGE_DIR);
    const reminders = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(LOCAL_STORAGE_DIR, file);
        const content = await fs.readFile(filePath, 'utf8');
        const key = file.replace('.json', '');
        reminders.push({ key, content });
      }
    }

    return reminders;
  } catch (error) {
    return [];
  }
}

async function updateLocalStorage(key, value) {
  const filePath = path.join(LOCAL_STORAGE_DIR, `${key}.json`);
  await fs.writeFile(filePath, value, 'utf8');
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Email service not configured' })
      };
    }

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Get all reminders (try Netlify Blobs first, fallback to local)
    let reminders = [];
    let usingLocalStorage = false;

    try {
      const store = getStore('reminders');
      const { blobs } = await store.list();

      if (blobs && blobs.length > 0) {
        for (const blob of blobs) {
          const content = await store.get(blob.key);
          reminders.push({ key: blob.key, content, store });
        }
        console.log('Using Netlify Blobs storage');
      }
    } catch (blobError) {
      // Fallback to local storage
      console.log('Netlify Blobs not available, using local storage');
      usingLocalStorage = true;
      const localReminders = await getFromLocalStorage();
      reminders = localReminders;
    }

    if (reminders.length === 0) {
      console.log('No reminders found');
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

    // Check each reminder
    for (const item of reminders) {
      try {
        checkedCount++;

        // Get reminder data
        const reminder = JSON.parse(item.content);

        // Skip if already sent
        if (reminder.sent) {
          continue;
        }

        // Check if reminder is due
        const scheduledTime = new Date(reminder.scheduledTime);
        if (scheduledTime <= now) {
          console.log(`Sending reminder: ${reminder.id}`);

          // Send email via Resend
          try {
            await resend.emails.send({
              from: 'reminders@resend.dev', // Resend's test email for free tier
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
                  <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                  <p style="color: #999; font-size: 12px;">
                    This email was sent by Email Reminder App
                  </p>
                </div>
              `
            });

            // Mark as sent
            reminder.sent = true;
            reminder.sentAt = new Date().toISOString();

            // Update storage
            if (usingLocalStorage) {
              await updateLocalStorage(item.key, JSON.stringify(reminder));
            } else if (item.store) {
              await item.store.set(reminder.id, JSON.stringify(reminder));
            }

            sentCount++;
            console.log(`Successfully sent reminder: ${reminder.id}`);

          } catch (emailError) {
            console.error(`Failed to send email for ${reminder.id}:`, emailError);
            // Continue to next reminder even if this one fails
          }
        }
      } catch (reminderError) {
        console.error(`Error processing reminder ${item.key}:`, reminderError);
        // Continue to next reminder
      }
    }

    console.log(`Checked ${checkedCount} reminders, sent ${sentCount}`);

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
