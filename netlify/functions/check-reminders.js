const { Resend } = require('resend');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    // Initialize Resend with API key from environment variable
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Get all reminders from Netlify Blobs
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('reminders');
    const reminders = await store.list();

    const now = new Date();
    let sentCount = 0;

    // Check each reminder
    for await (const { key } of reminders) {
      const reminderData = await store.get(key);
      if (!reminderData) continue;

      const reminder = JSON.parse(reminderData);

      // Skip if already sent
      if (reminder.sent) continue;

      const reminderTime = new Date(reminder.dateTime);

      // If reminder time has passed, send email
      if (reminderTime <= now) {
        try {
          await resend.emails.send({
            from: 'Reminders <onboarding@resend.dev>',
            to: reminder.email,
            subject: `Reminder: ${reminder.text}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #667eea;">📧 Reminder Notification</h2>
                <p style="font-size: 16px; line-height: 1.5;">
                  This is your scheduled reminder:
                </p>
                <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0;">
                  <p style="font-size: 18px; font-weight: bold; margin: 0;">
                    ${reminder.text}
                  </p>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Scheduled for: ${new Date(reminder.dateTime).toLocaleString()}
                </p>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">
                  This email was sent by your Email Reminder App
                </p>
              </div>
            `
          });

          // Mark as sent
          reminder.sent = true;
          await store.set(key, JSON.stringify(reminder));
          sentCount++;

        } catch (emailError) {
          console.error(`Failed to send reminder ${key}:`, emailError);
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Checked reminders, sent ${sentCount} email(s)`,
        sentCount
      })
    };

  } catch (error) {
    console.error('Error checking reminders:', error);
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
