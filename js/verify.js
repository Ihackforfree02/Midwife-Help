const params = new URLSearchParams(window.location.search);
const email = params.get("email");

const targetEmailEl = document.getElementById("targetEmail");
const demoCodeEl = document.getElementById("demoCode");
const form = document.getElementById("verifyForm");
const errorBox = document.getElementById("verifyError");

const account = email ? findAccount(email) : null;

if (!account) {
  targetEmailEl.textContent = "your email";
  demoCodeEl.textContent = "N/A — no account found";
} else {
  targetEmailEl.textContent = account.email;
  demoCodeEl.textContent = account.verified ? "already verified" : account.verificationCode;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!account) {
    errorBox.textContent = "We couldn't find that account. Try signing up again.";
    errorBox.classList.add("visible");
    return;
  }

  const code = document.getElementById("code").value.trim();
  const result = verifyAccount(account.email, code);

  if (result.ok) {
    window.location.href = "index.html?justVerified=1";
  } else {
    errorBox.textContent = result.reason;
    errorBox.classList.add("visible");
  }
});
