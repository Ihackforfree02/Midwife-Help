const alreadySetUp = document.getElementById("alreadySetUp");
const setupForm = document.getElementById("setupForm");

if (anyAdminExists()) {
  alreadySetUp.style.display = "block";
  setupForm.style.display = "none";
} else {
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

    if (findAccount(email)) {
      errorBox.textContent = "An account with that email already exists.";
      errorBox.classList.add("visible");
      return;
    }

    createAccount({ name, email, phone: "", password, isAdmin: true });
    setCurrentUser(email);
    window.location.href = "dashboard.html";
  });
}
