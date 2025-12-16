const { getStore } = require('@netlify/blobs');
const { Resend } = require('resend');

exports.handler = async (event, context) => {
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

    // Get the reminders store
    const store = getStore('reminders');

    // Get all reminders
    const { blobs } = await store.list();
    
    if (!blobs || blobs.length === 0) {
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
    for (const blob of blobs) {
      try {
        checkedCount++;
        
        // Get reminder data
        const reminderJson = await store.get(blob.key);
        const reminder = JSON.parse(reminderJson);

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
            await store.set(reminder.id, JSON.stringify(reminder));
            
            sentCount++;
            console.log(`Successfully sent reminder: ${reminder.id}`);

          } catch (emailError) {
            console.error(`Failed to send email for ${reminder.id}:`, emailError);
            // Continue to next reminder even if this one fails
          }
        }
      } catch (reminderError) {
        console.error(`Error processing reminder ${blob.key}:`, reminderError);
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
