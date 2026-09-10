// ---------------------------------------------------------------------
// Require login. If nobody's logged in on this browser, bounce back
// to the login page rather than showing an empty/broken dashboard.
// ---------------------------------------------------------------------
const currentUser = getCurrentUser();
if (!currentUser) {
  window.location.href = "index.html";
}

// ---------------------------------------------------------------------
// Personalise the sidebar + greeting, and show the Admin panel link
// only to admins.
// ---------------------------------------------------------------------
function renderCurrentUser() {
  const user = getCurrentUser();
  if (!user) return;

  document.getElementById("sidebarName").textContent = user.name;
  document.getElementById("sidebarRole").textContent = user.isAdmin ? "Administrator" : "Midwife";
  document.getElementById("greetingHeading").textContent = `Good morning, ${user.name.split(" ")[0]}`;

  const avatarSrc = user.avatar || "images/avatar-placeholder.svg";
  document.getElementById("sidebarAvatar").src = avatarSrc;
  document.getElementById("profileAvatarPreview").src = avatarSrc;

  document.getElementById("fullName").value = user.name;
  document.getElementById("profileEmail").value = user.email;
  document.getElementById("profilePhone").value = user.phone || "";

  document.getElementById("adminNavItem").style.display = user.isAdmin ? "block" : "none";
}

renderCurrentUser();

// ---------------------------------------------------------------------
// Sidebar navigation: shows/hides views. No page reloads, no routing
// library needed — just plain DOM show/hide.
// ---------------------------------------------------------------------
const navLinks = document.querySelectorAll(".nav-link");
const views = document.querySelectorAll(".view");

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const target = link.dataset.view;

    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    views.forEach((v) => v.classList.remove("active"));
    document.getElementById("view-" + target).classList.add("active");

    if (target === "admin") renderAdminTable();
    if (target === "reminders") renderPatientMessages();
  });
});

// ---------------------------------------------------------------------
// Logout — clears the current session and returns to the login page.
// ---------------------------------------------------------------------
document.getElementById("logoutBtn").addEventListener("click", () => {
  logout();
  window.location.href = "index.html";
});

// ---------------------------------------------------------------------
// Profile editing: name, email, phone, and profile picture.
// Saved back into this browser's account storage via auth.js.
// ---------------------------------------------------------------------
const avatarInput = document.getElementById("avatarInput");
const profileAvatarPreview = document.getElementById("profileAvatarPreview");
let pendingAvatarDataUrl = null;

document.getElementById("changePhotoBtn").addEventListener("click", () => {
  avatarInput.click();
});

avatarInput.addEventListener("change", () => {
  const file = avatarInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    pendingAvatarDataUrl = reader.result;
    profileAvatarPreview.src = pendingAvatarDataUrl;
  };
  reader.readAsDataURL(file);
});

document.getElementById("saveProfileBtn").addEventListener("click", () => {
  const user = getCurrentUser();
  if (!user) return;

  const updates = {
    name: document.getElementById("fullName").value.trim() || user.name,
    email: document.getElementById("profileEmail").value.trim().toLowerCase() || user.email,
    phone: document.getElementById("profilePhone").value.trim(),
  };
  if (pendingAvatarDataUrl) updates.avatar = pendingAvatarDataUrl;

  updateAccount(user.email, updates);

  // Email may have changed, so re-point "who's logged in" at the new address.
  setCurrentUser(updates.email);

  renderCurrentUser();

  const saved = document.getElementById("profileSaved");
  saved.classList.add("visible");
  setTimeout(() => saved.classList.remove("visible"), 2500);
});

// ---------------------------------------------------------------------
// Admin panel: list every account in this browser, promote/revoke
// admin, and manually verify someone who's stuck.
// ---------------------------------------------------------------------
function renderAdminTable() {
  const tbody = document.getElementById("adminAccountsTable");
  const accounts = getAccounts();
  const me = getCurrentUser();

  tbody.innerHTML = "";

  accounts.forEach((account) => {
    const row = document.createElement("tr");

    const verifiedBadge = account.verified
      ? '<span class="badge badge-done">Verified</span>'
      : '<span class="badge badge-current">Pending</span>';

    const roleBadge = account.isAdmin
      ? '<span class="badge badge-done">Admin</span>'
      : '<span class="badge badge-upcoming">Staff</span>';

    const isSelf = me && me.email === account.email;

    row.innerHTML = `
      <td>${escapeHtml(account.name)}</td>
      <td>${escapeHtml(account.email)}</td>
      <td>${verifiedBadge}</td>
      <td>${roleBadge}</td>
      <td style="text-align:right; white-space:nowrap;"></td>
    `;

    const actionsCell = row.querySelector("td:last-child");

    if (!account.verified) {
      const verifyBtn = document.createElement("button");
      verifyBtn.className = "btn btn-ghost";
      verifyBtn.textContent = "Verify manually";
      verifyBtn.style.marginRight = "0.4rem";
      verifyBtn.addEventListener("click", () => {
        updateAccount(account.email, { verified: true, verificationCode: null });
        renderAdminTable();
      });
      actionsCell.appendChild(verifyBtn);
    }

    if (!isSelf) {
      const roleBtn = document.createElement("button");
      roleBtn.className = "btn btn-ghost";
      roleBtn.textContent = account.isAdmin ? "Revoke admin" : "Make admin";
      roleBtn.addEventListener("click", () => {
        updateAccount(account.email, {
          isAdmin: !account.isAdmin,
          verified: account.isAdmin ? account.verified : true,
        });
        renderAdminTable();
      });
      actionsCell.appendChild(roleBtn);
    }

    tbody.appendChild(row);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------------------------------------------------------------------
// Patient messages (sent via contact.html), shown on the Reminders page.
// ---------------------------------------------------------------------
function renderPatientMessages() {
  const list = document.getElementById("patientMessagesList");
  const messages = getMessages();

  if (messages.length === 0) {
    list.innerHTML = '<p style="color:var(--color-ink-soft); margin:0;">No patient messages yet.</p>';
    return;
  }

  list.innerHTML = "";

  messages.forEach((message) => {
    const item = document.createElement("div");
    item.className = "alert-item " + (message.urgent ? "danger" : "");

    const when = new Date(message.timestamp).toLocaleString();
    const contactLine = message.contact ? ` · ${escapeHtml(message.contact)}` : "";
    const readTag = message.read ? "" : ' <span class="badge badge-current">New</span>';

    item.innerHTML = `
      <div style="flex:1;">
        <div class="alert-title">${escapeHtml(message.patientName)}${contactLine}${readTag}</div>
        <div class="alert-meta">${when}</div>
        <p style="margin:0.5rem 0 0 0; color:var(--color-ink);">${escapeHtml(message.body)}</p>
      </div>
    `;

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.flexDirection = "column";
    actions.style.gap = "0.4rem";

    if (!message.read) {
      const readBtn = document.createElement("button");
      readBtn.className = "btn btn-ghost";
      readBtn.textContent = "Mark read";
      readBtn.addEventListener("click", () => {
        markMessageRead(message.id);
        renderPatientMessages();
      });
      actions.appendChild(readBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-ghost";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      deleteMessage(message.id);
      renderPatientMessages();
    });
    actions.appendChild(deleteBtn);

    item.appendChild(actions);
    list.appendChild(item);
  });
}

renderPatientMessages();

// ---------------------------------------------------------------------
// DEMO countdown timer.
//
// This runs entirely in the browser so the dashboard is functional on
// its own. Later, this is the piece to replace: instead of counting
// down a local JS number, poll the Arduino's /timeleft endpoint (see
// the project README) and display whatever it returns.
// ---------------------------------------------------------------------
const appointments = [
  { name: "Antenatal check — Patient A", minutes: 20 },
  { name: "First consultation — Patient B", minutes: 30 },
  { name: "Postnatal review — Patient C", minutes: 20 },
  { name: "Antenatal check — Patient D", minutes: 20 },
  { name: "Antenatal check — Patient E", minutes: 20 },
];

let currentIndex = 2; // demo starts partway through the day, matching the sample schedule
let secondsLeft = 14 * 60 + 32; // demo starting point

const timerDisplay = document.getElementById("timerDisplay");
const timerFill = document.getElementById("timerFill");
const timerSub = document.getElementById("timerSub");
const nextApptBtn = document.getElementById("nextApptBtn");

function formatTime(totalSeconds) {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(totalSeconds);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  return `${sign}${mins}:${secs.toString().padStart(2, "0")}`;
}

function renderTimer() {
  const appt = appointments[currentIndex];
  const totalSeconds = appt.minutes * 60;
  const fraction = Math.max(0, Math.min(1, secondsLeft / totalSeconds));

  timerDisplay.textContent = formatTime(secondsLeft);
  timerFill.style.width = `${fraction * 100}%`;
  timerSub.textContent = `Appointment ${currentIndex + 1} of ${appointments.length}`;

  timerDisplay.classList.remove("state-warn", "state-over");
  timerFill.classList.remove("state-warn", "state-over");

  if (secondsLeft <= 0) {
    timerDisplay.classList.add("state-over");
    timerFill.classList.add("state-over");
  } else if (secondsLeft <= 120) {
    timerDisplay.classList.add("state-warn");
    timerFill.classList.add("state-warn");
  }
}

setInterval(() => {
  secondsLeft -= 1;
  renderTimer();
}, 1000);

nextApptBtn.addEventListener("click", () => {
  if (currentIndex < appointments.length - 1) {
    currentIndex += 1;
    secondsLeft = appointments[currentIndex].minutes * 60;
    renderTimer();
  }
});

renderTimer();
