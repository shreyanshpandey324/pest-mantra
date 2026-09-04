# Assignment Priority Escalation

Pest Mantra now supports a technician acknowledgement + reminder policy when an Admin assigns a job.

## Admin assignment levels

The existing internal project-priority values are kept for backward compatibility, while the UI presents the clearer three-level operational policy:

- **Normal** (`normal`) — one assignment alert.
- **Medium** (`high`) — immediate alert, then reminders every 15 minutes while unacknowledged, up to 3 browser notifications.
- **High** (`urgent`) — immediate alert, then reminders every 5 minutes while unacknowledged, up to 6 browser notifications.

The Admin can choose the level in both the Smart Dispatch assignment modal and the standard project assignment panel.

## Technician acknowledgement

The Technician app displays an unacknowledged assignment banner above My Jobs.

- High alerts use a stronger red/pulsing visual treatment.
- Medium alerts use a warning treatment.
- Normal alerts remain visible without aggressive escalation.
- Technician taps **Acknowledge** to persist acknowledgement on the backend and stop reminder escalation.
- If browser notifications are permitted, reminder notifications are shown while the Technician web app is open.
- If browser notifications are blocked, the persistent in-app alert still remains until acknowledgement.

## Admin visibility

Project detail shows **Acknowledgement pending** or **Technician acknowledged** with timestamp.

Zero-Chaos Exception Inbox also escalates unacknowledged assignments:

- High assignment not acknowledged after 5 minutes → critical exception.
- Medium assignment not acknowledged after 15 minutes → high exception.

## Production push note

This change does not pretend to provide closed-app push delivery. True background/mobile push when the Technician app is closed requires a push provider such as Firebase Cloud Messaging and its production credentials/service worker configuration. The current implementation provides persisted acknowledgement, in-app escalation, Admin exception escalation, and browser notifications while the app is active.
