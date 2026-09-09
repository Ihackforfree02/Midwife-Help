# Midwife Connect

A website for a midwife organisation's daily dashboard: log in, then see today's
appointments, a live countdown timer, and reminders.

Built with plain HTML5, CSS, and JavaScript — no build step, so it works
directly on GitHub Pages.

## Structure

```
midwife-connect/
├── index.html          Login page
├── dashboard.html       Dashboard (overview, appointments, reminders, patients, settings)
├── css/
│   └── styles.css       All styling (colours, type, layout)
├── js/
│   ├── login.js         Demo login check
│   └── dashboard.js      Sidebar navigation + demo countdown timer
├── images/
│   ├── logo.svg              Placeholder logo — swap for the real one
│   ├── hero-placeholder.svg  Placeholder brand image on the login page
│   └── avatar-placeholder.svg Placeholder profile photo
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

## Demo login

This is a front-end-only demo. There's no real backend or account system yet,
so the login form just checks against a hardcoded email/password in `login.js`:

- Email: `demo@midwifeconnect.org`
- Password: `demo1234`

**Before this handles any real names, patient details, or staff logins**, the
login form needs to submit to a real authentication server instead. That's a
separate piece of work (outside the scope of the Arduino/STEM project) and
should not be skipped if this were ever used with real data.

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
