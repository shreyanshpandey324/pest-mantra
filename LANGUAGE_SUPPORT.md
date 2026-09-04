# Pest Mantra — Hindi / English UI

The real production-mode build includes a persistent Hindi / English language switcher in both applications.

## Admin Web
- Language control is visible on the login screen and in the authenticated top bar.
- Main navigation, dashboard labels, common actions/statuses, login copy, filters and Product Tour copy switch between English and Hindi.
- The selected language is saved in browser local storage (`pest-mantra-language`) and persists across navigation/reloads on that browser.
- Technical identifiers, customer-entered data, API payload values and untranslated specialist copy safely fall back to English.

## Technician App
- Language control is visible on the login screen and authenticated job header.
- Core job, duty, status, service-proof and field-action labels support Hindi / English.
- The same browser preference key is used so the choice is persistent.

## Important
This is UI localization only. It does not alter database data, authentication, API contracts, role permissions or production workflows.
