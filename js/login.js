// ---------------------------------------------------------------------
// Login handling.
//
// Checks the email/password against accounts stored in this browser's
// localStorage (see auth.js). Admin accounts always skip verification.
// Everyone else must have verified their email first (see verify.html).
// ---------------------------------------------------------------------

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");
const verifiedNotice = document.getElementById("verifiedNotice");
const adminSetupHint = document.getElementById("adminSetupHint");

// Show a friendly notice if they just came from verifying their email.
const params = new URLSearchParams(window.location.search);
if (params.get("justVerified")) {
  verifiedNotice.classList.add("visible");
}

// If nobody has set up an admin account in this browser yet, point to it.
if (!anyAdminExists()) {
  adminSetupHint.style.display = "block";
}

form.addEventListener("submit", function (event) {
  event.preventDefault();
  errorBox.classList.remove("visible");

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  const account = findAccount(email);

  if (!account || account.password !== password) {
    errorBox.textContent = "That email and password don't match our records.";
    errorBox.classList.add("visible");
    return;
  }

  if (!account.isAdmin && !account.verified) {
    errorBox.textContent = "This account hasn't been verified yet. Check the verification page you were sent to when signing up.";
    errorBox.classList.add("visible");
    return;
  }

  setCurrentUser(account.email);
  window.location.href = "dashboard.html";
});
