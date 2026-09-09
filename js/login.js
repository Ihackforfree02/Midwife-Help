// ---------------------------------------------------------------------
// Demo login handling.
//
// IMPORTANT: This is a front-end-only placeholder for the school project.
// It does NOT check credentials against a real server, and it does not
// keep anyone securely logged in — it just demonstrates the flow.
// Before this site handles real patient or staff data, the login form
// needs to submit to a real authentication backend instead of the
// hardcoded check below.
// ---------------------------------------------------------------------

const DEMO_EMAIL = "demo@midwifeconnect.org";
const DEMO_PASSWORD = "demo1234";

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    window.location.href = "dashboard.html";
  } else {
    errorBox.classList.add("visible");
  }
});
