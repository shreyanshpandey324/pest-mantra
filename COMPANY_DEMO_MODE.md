# Company Demo Mode

For local company testing (`NODE_ENV=development`), the technician app login page no longer asks for a mobile number or OTP.

- Open `http://localhost:3001/login`
- Click **Open Technician App**
- The backend creates a real session for the first active technician account.
- Existing jobs, APIs, permissions, and technician-only role checks remain active.
- Production authentication is unchanged: the demo endpoint returns 404 in production and the normal OTP flow is shown.

If the demo button says that no technician is available, create/activate at least one technician in the Admin app.
