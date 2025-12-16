# Email Reminder App

A simple email reminder service that sends you email notifications at scheduled times.

## Features
- Create reminders with custom text, date, and time
- Receive actual emails at the scheduled time
- Works even when your browser is closed
- No account required - just enter your email
- Clean, modern interface
- Free hosting on Netlify

## How It Works

1. Enter your email address
2. Create a reminder with text, date, and time
3. We'll send you an email when the reminder is due
4. No need to keep your browser open!

## Deployment Guide

### Step 1: Get a Resend API Key (Free)
1. Go to [resend.com](https://resend.com) and sign up
2. Verify your email
3. Go to API Keys section
4. Create a new API key and copy it

### Step 2: Deploy to Netlify
1. Create account at [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub account
4. Select the `email-reminder-app` repository
5. In "Site settings" → "Environment variables", add:
   - Key: `RESEND_API_KEY`
   - Value: Your Resend API key from Step 1
6. Click "Deploy site"

### Step 3: Set Up Reminder Checking (Important!)
For reminders to be sent, we need to check for due reminders regularly:

1. Go to [cron-job.org](https://cron-job.org) (free service)
2. Create a free account
3. Create a new cron job:
   - Title: "Check Email Reminders"
   - URL: `https://your-site-name.netlify.app/api/check-reminders`
   - Schedule: Every 5 minutes
4. Save and enable the cron job

Done! Your email reminder service is now live.

## Testing Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file with your Resend API key:
   ```
   RESEND_API_KEY=your_key_here
   ```

3. Run locally:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:8888`

## Technology Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Netlify Functions (serverless)
- Storage: Netlify Blobs (key-value store)
- Email: Resend API
- Hosting: Netlify (free tier)
