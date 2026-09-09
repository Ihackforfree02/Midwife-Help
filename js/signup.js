const form = document.getElementById("signupForm");
const errorBox = document.getElementById("signupError");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!name || !email || !password) {
    errorBox.textContent = "Please fill in your name, email, and password.";
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

  const account = createAccount({ name, email, phone, password, isAdmin: false });
  window.location.href = `verify.html?email=${encodeURIComponent(account.email)}`;
});
