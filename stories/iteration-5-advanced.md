# Iteration 5 — Advanced Features & SaaS Readiness

> **Goal**: Take the core MVP of Kairox and add the advanced features needed to turn it into a premium, commercial-ready SaaS application. This includes multi-channel inputs, external integrations, user settings, and monetization.

| # | Story | Backend | Frontend | Database | Redis/Celery |
|---|-------|---------|----------|----------|--------------|
| 25 | Password Reset & User Settings | ✅ | ✅ | ✅ | ❌ |
| 26 | Voice Input Integration (OpenAI Whisper) | ✅ | ✅ | ❌ | ✅ |
| 27 | External Integrations (Calendar & Email) | ✅ | ✅ | ✅ | ✅ |
| 28 | Global Search & Command Palette | ✅ | ✅ | ❌ | ❌ |
| 29 | Admin Panel & Billing (Stripe) | ✅ | ✅ | ✅ | ✅ |

---

## Story 25: Password Reset & User Settings

**Description**: Add standard account management capabilities.
- **Forgot Password**: Implementation of the forgot password flow. Send emails with a secure, time-limited reset token using `itsdangerous` or standard JWT.
- **Settings Page**: A dedicated page for the user to change their full name, timezone, UI theme (Dark/Light mode preference), and notification preferences.
- **Email Delivery**: Integrate an email provider (SendGrid, Amazon SES, or Resend) to dispatch reset links and account-related notices.

## Story 26: Voice Input Integration (OpenAI Whisper)

**Description**: Allow users to speak their thoughts instead of typing them.
- **Frontend**: Add a microphone button to the `InputBox`. Record audio directly in the browser using the Web Audio API and generate a `.webm` or `.m4a` blob.
- **Backend**: Create an endpoint to accept audio file uploads.
- **AI Processing**: Use OpenAI's Whisper API (`client.audio.transcriptions.create`) to convert the audio to text.
- **Pipeline**: Feed the transcribed text directly into the existing `process_input` pipeline.
- *Bonus*: Handle basic filler words intelligently so messy voice inputs are still accurately tracked into tasks.

## Story 27: External Integrations (Calendar & Email Sync)

**Description**: Connect Kairox to the user's existing tools.
- **OAuth Setup**: Implement "Sign in with Google" to request Calendar and Gmail scopes.
- **Google Calendar Sync**: When an "Event" task is created and given a `due_at` time, use the Google Calendar API to push an event to the user's calendar. Auto-sync changes if the time gets updated.
- **Email Dispatching**: Allow users to actually send the generated drafts. When they click "Send" on an Email-type draft, use the Gmail API or an SMTP provider to send the drafted message to the specified recipient.

## Story 28: Global Search & Command Palette

**Description**: Provide a quick way to navigate the system using keyboard shortcuts.
- **Frontend**: Implement a Command Palette (accessible via `Cmd + K` or `Ctrl + K`).
- **Functionality**: 
  - Search across all Tasks (title/description), Drafts, and past Raw Inputs.
  - Quick action commands: `/add [task content]`, `/go timeline`, `/go structure`, `/settings`.
- **Backend**: Add a dedicated `GET /api/v1/search?q={query}` endpoint that uses PostgreSQL Full-Text Search (e.g., `to_tsvector`) across multiple tables to yield fast, relevant results.

## Story 29: Admin Panel & Billing (Stripe)

**Description**: Prepare the app for monetization and administration.
- **Admin Role**: Add a `role` or `is_admin` column to the `users` table.
- **Admin Dashboard**: A secure backend area (or frontend route protected by role guard) to view system health, active user counts, total AI tokens consumed (costs), and Celery worker status.
- **Stripe Integration**: 
  - Add subscription tiers (e.g., Free tier allows 50 inputs/month, Pro allows unlimited + Voice Input).
  - Stripe Checkout for onboarding paid users.
  - Stripe Webhooks to listen for subscription cancellations and renewals.
