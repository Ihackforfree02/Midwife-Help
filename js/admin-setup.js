if (anyAdminExists()) {
  document.getElementById("existingAdminNotice").style.display = "block";
}

const form = document.getElementById("adminSetupForm");
const errorBox = document.getElementById("setupError");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!name || !email || !password) {
    errorBox.textContent = "Please fill in every field.";
    errorBox.classList.add("visible");
    return;
  }

  if (password !== confirmPassword) {
    errorBox.textContent = "Passwords don't match.";
    errorBox.classList.add("visible");
    return;
  }

  claimAdmin({ name, email, password });
  setCurrentUser(email, true);
  window.location.href = "dashboard.html";
});
