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
const navLinks = document.querySelectorAll(".nav-link:not(.mail-toggle-btn)");
const views = document.querySelectorAll(".view");

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const target = link.dataset.view;

    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    views.forEach((v) => v.classList.remove("active"));
    document.getElementById("view-" + target).classList.add("active");

    if (target === "admin") renderAdminTable();
    if (target === "reminders") { renderPatientMessages(); renderReminders(); }
    if (target === "settings") renderAccountSwitcher();
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
// Patients: add / list / delete.
// ---------------------------------------------------------------------
const addPatientBtn = document.getElementById("addPatientBtn");
const addPatientForm = document.getElementById("addPatientForm");
const cancelPatientBtn = document.getElementById("cancelPatientBtn");
const savePatientBtn = document.getElementById("savePatientBtn");

addPatientBtn.addEventListener("click", () => {
  addPatientForm.style.display = "block";
  addPatientBtn.style.display = "none";
  document.getElementById("newPatientName").focus();
});

cancelPatientBtn.addEventListener("click", () => {
  addPatientForm.style.display = "none";
  addPatientBtn.style.display = "inline-flex";
  document.getElementById("newPatientName").value = "";
  document.getElementById("newPatientNote").value = "";
  document.getElementById("newPatientReminderDate").value = "";
  document.getElementById("newPatientReminderNote").value = "";
});

savePatientBtn.addEventListener("click", () => {
  const name = document.getElementById("newPatientName").value.trim();
  const note = document.getElementById("newPatientNote").value.trim();
  const reminderDate = document.getElementById("newPatientReminderDate").value;
  const reminderNote = document.getElementById("newPatientReminderNote").value.trim();

  if (!name) {
    document.getElementById("newPatientName").focus();
    return;
  }

  addPatient({ name, note });

  if (reminderDate || reminderNote) {
    addReminder({
      title: `Reminder for ${name}`,
      note: reminderNote,
      datetime: reminderDate,
      patientName: name,
    });
  }

  document.getElementById("newPatientName").value = "";
  document.getElementById("newPatientNote").value = "";
  document.getElementById("newPatientReminderDate").value = "";
  document.getElementById("newPatientReminderNote").value = "";
  addPatientForm.style.display = "none";
  addPatientBtn.style.display = "inline-flex";

  renderPatients();
  renderReminders();
});

function renderPatients() {
  const patients = getPatients();
  const emptyState = document.getElementById("patientsEmptyState");
  const listWrap = document.getElementById("patientsListWrap");
  const list = document.getElementById("patientsList");

  if (patients.length === 0) {
    emptyState.style.display = "block";
    listWrap.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  listWrap.style.display = "block";
  list.innerHTML = "";

  patients.forEach((patient) => {
    const item = document.createElement("li");
    item.className = "schedule-item";
    item.innerHTML = `
      <div class="schedule-info">
        <div class="schedule-name">${escapeHtml(patient.name)}</div>
        ${patient.note ? `<div class="schedule-type">${escapeHtml(patient.note)}</div>` : ""}
      </div>
    `;
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-ghost";
    deleteBtn.textContent = "Remove";
    deleteBtn.addEventListener("click", () => {
      deletePatient(patient.id);
      renderPatients();
    });
    item.appendChild(deleteBtn);
    list.appendChild(item);
  });
}

renderPatients();

// ---------------------------------------------------------------------
// Reminders: standalone, or linked to a patient (set from the Add
// Patient form).
// ---------------------------------------------------------------------
const addReminderBtn = document.getElementById("addReminderBtn");
const addReminderForm = document.getElementById("addReminderForm");
const cancelReminderBtn = document.getElementById("cancelReminderBtn");
const saveReminderBtn = document.getElementById("saveReminderBtn");

addReminderBtn.addEventListener("click", () => {
  addReminderForm.style.display = "block";
  addReminderBtn.style.display = "none";
  document.getElementById("newReminderTitle").focus();
});

cancelReminderBtn.addEventListener("click", () => {
  hideReminderForm();
});

function hideReminderForm() {
  addReminderForm.style.display = "none";
  addReminderBtn.style.display = "inline-flex";
  document.getElementById("newReminderTitle").value = "";
  document.getElementById("newReminderDate").value = "";
  document.getElementById("newReminderNote").value = "";
}

saveReminderBtn.addEventListener("click", () => {
  const title = document.getElementById("newReminderTitle").value.trim();
  const datetime = document.getElementById("newReminderDate").value;
  const note = document.getElementById("newReminderNote").value.trim();

  if (!title) {
    document.getElementById("newReminderTitle").focus();
    return;
  }

  addReminder({ title, note, datetime });
  hideReminderForm();
  renderReminders();
});

function formatReminderDate(datetime) {
  if (!datetime) return "";
  const d = new Date(datetime);
  return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function renderReminders() {
  const reminders = getReminders().slice().sort((a, b) => {
    // Ones with a date come first, soonest first; undated ones after.
    if (a.datetime && b.datetime) return new Date(a.datetime) - new Date(b.datetime);
    if (a.datetime) return -1;
    if (b.datetime) return 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  const list = document.getElementById("remindersList");
  const emptyState = document.getElementById("remindersEmptyState");

  if (reminders.length === 0) {
    emptyState.style.display = "block";
    list.innerHTML = "";
    return;
  }

  emptyState.style.display = "none";
  list.innerHTML = "";

  const now = new Date();

  reminders.forEach((reminder) => {
    const isOverdue = reminder.datetime && !reminder.done && new Date(reminder.datetime) < now;

    const item = document.createElement("div");
    item.className = "alert-item " + (reminder.done ? "" : isOverdue ? "danger" : "warn");
    if (reminder.done) item.style.opacity = "0.6";

    const dateLine = reminder.datetime ? formatReminderDate(reminder.datetime) : "No date set";
    const patientLine = reminder.patientName ? ` · ${escapeHtml(reminder.patientName)}` : "";
    const noteLine = reminder.note ? `<p style="margin:0.4rem 0 0 0; color:var(--color-ink);">${escapeHtml(reminder.note)}</p>` : "";

    item.innerHTML = `
      <div style="flex:1; ${reminder.done ? "text-decoration:line-through;" : ""}">
        <div class="alert-title">${escapeHtml(reminder.title)}${patientLine}</div>
        <div class="alert-meta">${dateLine}${isOverdue ? " · Overdue" : ""}</div>
        ${noteLine}
      </div>
    `;

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.flexDirection = "column";
    actions.style.gap = "0.4rem";

    const doneBtn = document.createElement("button");
    doneBtn.className = "btn btn-ghost";
    doneBtn.textContent = reminder.done ? "Mark not done" : "Mark done";
    doneBtn.addEventListener("click", () => {
      toggleReminderDone(reminder.id);
      renderReminders();
    });
    actions.appendChild(doneBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-ghost";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      deleteReminder(reminder.id);
      renderReminders();
    });
    actions.appendChild(deleteBtn);

    item.appendChild(actions);
    list.appendChild(item);
  });
}

renderReminders();

// ---------------------------------------------------------------------
// Account switcher: quick-switch between accounts created on this
// device, without re-entering a password. This is only reasonable
// because everything is stored locally on this one device anyway.
// ---------------------------------------------------------------------
function renderAccountSwitcher() {
  const wrap = document.getElementById("accountSwitcherList");
  const accounts = getAccounts();
  const me = getCurrentUser();

  wrap.innerHTML = "";

  accounts.forEach((account) => {
    const row = document.createElement("div");
    row.className = "device-row";

    const isSelf = me && me.email === account.email;

    row.innerHTML = `
      <div>
        <strong>${escapeHtml(account.name)}</strong>
        <div class="alert-meta">${escapeHtml(account.email)} ${account.isAdmin ? "· Admin" : ""}${isSelf ? " · Currently logged in" : ""}</div>
      </div>
    `;

    if (!isSelf) {
      const switchBtn = document.createElement("button");
      switchBtn.className = "btn btn-ghost";
      switchBtn.textContent = "Switch to this account";
      switchBtn.addEventListener("click", () => {
        setCurrentUser(account.email, true);
        window.location.reload();
      });
      row.appendChild(switchBtn);
    }

    wrap.appendChild(row);
  });
}

renderAccountSwitcher();

// ---------------------------------------------------------------------
// Gmail side panel.
//
// Google blocks Gmail from being shown inside an iframe (a security
// setting on Google's end — X-Frame-Options / CSP — which can't be
// worked around from this site). The iframe below is left in so it's
// clear what's being attempted, but in practice the part that actually
// works is the "Open Gmail" button underneath it.
// ---------------------------------------------------------------------
const mailToggleBtn = document.getElementById("mailToggleBtn");
const mailDrawer = document.getElementById("mailDrawer");
const mailDrawerClose = document.getElementById("mailDrawerClose");
const mailDrawerBackdrop = document.getElementById("mailDrawerBackdrop");

function openMailDrawer() {
  mailDrawer.classList.add("open");
  mailDrawerBackdrop.classList.add("open");
}

function closeMailDrawer() {
  mailDrawer.classList.remove("open");
  mailDrawerBackdrop.classList.remove("open");
}

mailToggleBtn.addEventListener("click", openMailDrawer);
mailDrawerClose.addEventListener("click", closeMailDrawer);
mailDrawerBackdrop.addEventListener("click", closeMailDrawer);

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
