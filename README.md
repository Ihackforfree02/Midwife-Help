# Midwife Connect

A website for a midwife organisation's daily dashboard: log in, then see today's
appointments, a live countdown timer, and reminders.

Built with plain HTML5, CSS, and JavaScript — no build step, so it works
directly on GitHub Pages.

## Structure

```
midwife-connect/
├── index.html           Login page
├── signup.html          New staff account sign-up
├── verify.html          Email verification (demo — code shown on screen)
├── admin-setup.html     One-time real admin account creation (local only)
├── contact.html         Patient message/alert form (no login needed)
├── dashboard.html       Dashboard (overview, appointments, reminders, patients, settings, admin panel)
├── css/
│   └── styles.css       All styling (colours, type, layout)
├── js/
│   ├── auth.js          Shared account storage (localStorage) — accounts, login, verification, admin
│   ├── login.js         Login page logic
│   ├── signup.js        Sign-up page logic
│   ├── verify.js        Verification page logic
│   ├── admin-setup.js   Admin setup page logic
│   └── dashboard.js     Sidebar navigation, profile editing, admin panel, demo countdown timer
├── images/
│   ├── logo.svg              Placeholder logo — swap for the real one
│   ├── hero-placeholder.svg  Placeholder brand image on the login page
│   └── avatar-placeholder.svg Placeholder profile photo
├── .gitignore
└── README.md
```

## Running it locally

No build tools needed — just open `index.html` in a browser, or serve the
folder with any static server. To view it like a real site (recommended,
since some browsers restrict things when opened directly as a file):

```
cd midwife-connect
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Accounts, sign-up, and verification

There's no backend, so accounts are stored in **this browser's localStorage**
(see `js/auth.js`). That has a few real consequences worth understanding:

- Accounts made in one browser don't exist in any other browser or device.
  There is no shared, central list of staff — each computer keeps its own.
- Passwords are stored in plain text. That's acceptable for a school demo,
  but a real product would need a proper backend that hashes passwords —
  never store real passwords like this in production.
- Signing up doesn't send a real email. `signup.html` generates a 6-digit
  code and simply displays it on the verification page, clearly labelled as
  demo mode, so the flow can be shown working without a mail server.

**One sample account is pre-loaded** so you can explore the dashboard
immediately without signing up:
- Email: `demo@midwifeconnect.org`
- Password: `demo1234`

### Setting up your own admin account

Go to `admin-setup.html` once, in your own browser. It lets you create an
admin account with your own real email and password — admins skip email
verification entirely. That account is saved only in `localStorage`, so
**it is never written into any file and never gets pushed to GitHub.**
This is deliberate: real credentials should never live in source code that
ends up in a public repository.

Once one admin exists, `admin-setup.html` won't let you create a second one
from that screen — instead, log in as the admin and use the **Admin panel**
in the dashboard to promote any other account to admin, or manually verify
someone who's stuck.

**Important:** because accounts are per-browser, your admin account only
exists on the device/browser where you ran the setup. If you open the
deployed GitHub Pages site on a different device, you'd need to run
`admin-setup.html` again there — this is a real limitation of a backend-free
static site, not a bug.

## Patient messages

`contact.html` lets a patient send a message or urgent alert with no login
needed. It's shown on the midwife's **Reminders** page under "Patient
messages."

Two honest limitations to know:
- **No real email forwarding.** A static site has nowhere to receive email —
  that needs a real mail server or a service like a webhook-based email
  forwarder feeding a backend. This project doesn't have a backend, so this
  isn't implemented; a message only travels from `contact.html` to the
  dashboard through this browser's local storage.
- **Same-browser only, for the same reason as accounts.** A message a
  patient sends on their own phone will not appear on a midwife's separate
  computer. To demo the feature, open `contact.html` and `dashboard.html` in
  the same browser.

If this ever became a real deployed tool, both of these would need a proper
backend (a small server or a service like Firebase) so messages — and real
emails — could actually move between different people's devices.

## Placeholder images

Everything in `/images` is an SVG placeholder so the site looks complete
without needing real photos. Swap in real files by keeping the same filename
(or update the `src` in the HTML if you rename them).

## Where the Arduino plugs in (not built yet)

The dashboard currently runs a **demo timer entirely in JavaScript**
(`dashboard.js`) so the site works standalone. When the Arduino side is
ready, replace that demo logic with real data from the device:

1. The Arduino hosts a small web server on the local network (see the
   project's Arduino sketch) with an endpoint like `/timeleft` that returns
   the seconds remaining as plain text, and possibly `/appointment` for
   which appointment number is active.
2. In `dashboard.js`, replace the `setInterval` countdown with a `fetch()`
   call to that endpoint every second or two, e.g.:

   ```js
   async function pollArduino() {
     const response = await fetch("http://<arduino-ip>/timeleft");
     const secondsLeft = await response.text();
     // update timerDisplay, timerFill, timerSub using secondsLeft
   }
   setInterval(pollArduino, 1000);
   ```

3. The physical button on the Arduino should trigger the "next appointment"
   step directly on the device, the same way the `nextApptBtn` button does
   in the browser right now.
4. Reminders/alerts (the **Reminders** page) can be extended the same way —
   have the Arduino report threshold crossings (e.g. "2 minutes left") and
   push them into that list instead of the static sample alerts shown now.

Nothing above needs to be done yet — the site works fully as a demo without
the device connected.

## Publishing to GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo settings, go to **Pages**, and set the source to the branch
   and root folder containing `index.html`.
3. GitHub will publish it at `https://<username>.github.io/<repo-name>/`.
