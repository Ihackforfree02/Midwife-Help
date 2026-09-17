// ---------------------------------------------------------------------
// Require login. If nobody's logged in on this browser, bounce back
// to the login page rather than showing an empty/broken dashboard.
// ---------------------------------------------------------------------
const currentUser = getCurrentUser();
if (!currentUser) {
  window.location.href = "index.html";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDuration(totalSeconds) {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(Math.floor(totalSeconds));
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  return `${sign}${mins}:${secs.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------
// Toasts — small pop-ups bottom-right for things that just happened.
// ---------------------------------------------------------------------
function showToast(title, body, type) {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = "toast" + (type === "danger" ? " toast-danger" : type === "warn" ? " toast-warn" : "");
  el.innerHTML = `<strong>${escapeHtml(title)}</strong>${body ? escapeHtml(body) : ""}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 6000);
}

// ---------------------------------------------------------------------
// Personalise the sidebar + profile fields, and show the Admin panel
// link only to admins.
// ---------------------------------------------------------------------
function renderContactFieldList(containerId, values) {
  const wrap = document.getElementById(containerId);
  wrap.innerHTML = "";
  const list = values && values.length ? values : [""];
  list.forEach((val) => addContactFieldRow(wrap, val));
}

function addContactFieldRow(wrap, value) {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "0.5rem";
  row.style.marginBottom = "0.5rem";

  const input = document.createElement("input");
  input.type = "text";
  input.value = value || "";
  input.style.flex = "1";
  input.style.padding = "0.6em 0.75em";
  input.style.border = "1px solid var(--color-border)";
  input.style.borderRadius = "var(--radius-s)";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn btn-ghost";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => row.remove());

  row.appendChild(input);
  row.appendChild(removeBtn);
  wrap.appendChild(row);
}

function collectContactFieldValues(containerId) {
  const wrap = document.getElementById(containerId);
  return Array.from(wrap.querySelectorAll("input")).map((i) => i.value.trim()).filter(Boolean);
}

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

  renderContactFieldList("phonesListWrap", user.phones || []);
  renderContactFieldList("emailsListWrap", user.emails || []);

  document.getElementById("adminNavItem").style.display = user.isAdmin ? "block" : "none";
}

renderCurrentUser();

document.getElementById("addPhoneFieldBtn").addEventListener("click", () => {
  addContactFieldRow(document.getElementById("phonesListWrap"), "");
});

document.getElementById("addEmailFieldBtn").addEventListener("click", () => {
  addContactFieldRow(document.getElementById("emailsListWrap"), "");
});

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
    if (target === "appointments") renderAppointmentsTable();
    if (target === "chat") renderChatContacts();
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
// Profile editing: name, login email, additional emails, phone
// numbers, and profile picture. Saved back into this browser's
// account storage via auth.js.
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
    phones: collectContactFieldValues("phonesListWrap"),
    emails: collectContactFieldValues("emailsListWrap"),
  };
  if (pendingAvatarDataUrl) updates.avatar = pendingAvatarDataUrl;

  updateAccount(user.email, updates);
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

// ---------------------------------------------------------------------
// Patient messages (sent via contact.html), shown on the Reminders page.
// ---------------------------------------------------------------------
let lastSeenMessageCount = getMessages().filter((m) => !m.read).length;

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
        renderNotifications();
      });
      actions.appendChild(readBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-ghost";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      deleteMessage(message.id);
      renderPatientMessages();
      renderNotifications();
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
  clearPatientForm();
});

savePatientBtn.addEventListener("click", () => {
  const name = document.getElementById("newPatientName").value.trim();
  const note = document.getElementById("newPatientNote").value.trim();
  const dueDate = document.getElementById("newPatientDueDate").value;
  const phone = document.getElementById("newPatientPhone").value.trim();
  const reminderDate = document.getElementById("newPatientReminderDate").value;
  const reminderNote = document.getElementById("newPatientReminderNote").value.trim();

  if (!name) {
    document.getElementById("newPatientName").focus();
    return;
  }

  addPatient({ name, note, dueDate, phone });

  if (reminderDate || reminderNote) {
    addReminder({
      title: `Reminder for ${name}`,
      note: reminderNote,
      datetime: reminderDate,
      patientName: name,
    });
  }

  clearPatientForm();
  addPatientForm.style.display = "none";
  addPatientBtn.style.display = "inline-flex";

  renderPatients();
  renderReminders();
});

function clearPatientForm() {
  ["newPatientName", "newPatientNote", "newPatientDueDate", "newPatientPhone",
   "newPatientReminderDate", "newPatientReminderNote"].forEach((id) => {
    document.getElementById(id).value = "";
  });
}

// ---------------------------------------------------------------------
// Patient notes panel.
// ---------------------------------------------------------------------
let activeNotesPatientId = null;

function openPatientNotes(patient) {
  activeNotesPatientId = patient.id;
  document.getElementById("patientNotesTitle").textContent = `Notes — ${patient.name}`;
  document.getElementById("patientNotesCard").style.display = "block";
  renderPatientNotes();
}

document.getElementById("closePatientNotesBtn").addEventListener("click", () => {
  activeNotesPatientId = null;
  document.getElementById("patientNotesCard").style.display = "none";
});

document.getElementById("savePatientNoteBtn").addEventListener("click", () => {
  const input = document.getElementById("newPatientNoteText");
  const text = input.value.trim();
  if (!text || !activeNotesPatientId) return;
  addPatientNote(activeNotesPatientId, text);
  input.value = "";
  renderPatientNotes();
});

document.getElementById("newPatientNoteText").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("savePatientNoteBtn").click();
});

function renderPatientNotes() {
  const list = document.getElementById("patientNotesList");
  const patient = getPatients().find((p) => p.id === activeNotesPatientId);
  if (!patient) return;

  const notes = patient.notes || [];
  if (notes.length === 0) {
    list.innerHTML = '<p class="alert-meta">No notes yet.</p>';
    return;
  }

  list.innerHTML = "";
  notes.forEach((note) => {
    const item = document.createElement("div");
    item.className = "alert-item";
    item.innerHTML = `
      <div style="flex:1;">
        <div>${escapeHtml(note.text)}</div>
        <div class="alert-meta">${new Date(note.timestamp).toLocaleString()}</div>
      </div>
    `;
    list.appendChild(item);
  });
}

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

    const gestation = gestationFromDueDate(patient.dueDate);
    const detailBits = [];
    if (patient.note) detailBits.push(escapeHtml(patient.note));
    if (patient.phone) detailBits.push(escapeHtml(patient.phone));
    if (gestation) {
      const dueText = gestation.overdue
        ? `${Math.abs(gestation.daysUntilDue)} days past due`
        : `${gestation.daysUntilDue} days to go`;
      detailBits.push(`<strong>${gestation.label} weeks</strong> · ${dueText}`);
    }

    item.innerHTML = `
      <div class="schedule-info">
        <div class="schedule-name">${escapeHtml(patient.name)}</div>
        ${detailBits.length ? `<div class="schedule-type">${detailBits.join(" · ")}</div>` : ""}
      </div>
    `;

    if (gestation && gestation.overdue) {
      const badge = document.createElement("span");
      badge.className = "badge badge-current";
      badge.textContent = "Overdue";
      badge.style.marginRight = "0.5rem";
      item.appendChild(badge);
    }

    const notesBtn = document.createElement("button");
    notesBtn.className = "btn btn-ghost";
    notesBtn.textContent = `Notes${patient.notes && patient.notes.length ? ` (${patient.notes.length})` : ""}`;
    notesBtn.style.marginRight = "0.4rem";
    notesBtn.addEventListener("click", () => openPatientNotes(patient));
    item.appendChild(notesBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-ghost";
    deleteBtn.textContent = "Remove";
    deleteBtn.addEventListener("click", () => {
      deletePatient(patient.id);
      if (activeNotesPatientId === patient.id) {
        activeNotesPatientId = null;
        document.getElementById("patientNotesCard").style.display = "none";
      }
      renderPatients();
    });
    item.appendChild(deleteBtn);
    list.appendChild(item);
  });
}

renderPatients();

// ---------------------------------------------------------------------
// Reminders: standalone, or linked to a patient (set from the Add
// Patient form). Reminders fire a toast + notification the moment
// their set time arrives, checked periodically below.
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
  renderNotifications();
});

function formatReminderDate(datetime) {
  if (!datetime) return "";
  const d = new Date(datetime);
  return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function renderReminders() {
  const reminders = getReminders().slice().sort((a, b) => {
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
      renderNotifications();
    });
    actions.appendChild(doneBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-ghost";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      deleteReminder(reminder.id);
      renderReminders();
      renderNotifications();
    });
    actions.appendChild(deleteBtn);

    item.appendChild(actions);
    list.appendChild(item);
  });
}

renderReminders();

// Check every few seconds for reminders whose time has arrived, and
// fire a toast + notification exactly once per reminder.
setInterval(() => {
  const now = new Date();
  let firedAny = false;

  getReminders().forEach((reminder) => {
    if (reminder.datetime && !reminder.fired && !reminder.done && new Date(reminder.datetime) <= now) {
      showToast("Reminder", reminder.title, "warn");
      markReminderFired(reminder.id);
      firedAny = true;
    }
  });

  if (firedAny) {
    if (document.getElementById("view-reminders").classList.contains("active")) renderReminders();
    renderNotifications();
  }
}, 3000);

// ---------------------------------------------------------------------
// Account switcher: quick-switch between accounts created on this
// device, without re-entering a password.
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

// =======================================================================
// APPOINTMENTS — full add/edit/cancel, backing the live timer below.
// =======================================================================
let editingAppointmentId = null;

const addAppointmentBtn = document.getElementById("addAppointmentBtn");
const addAppointmentForm = document.getElementById("addAppointmentForm");
const cancelAppointmentFormBtn = document.getElementById("cancelAppointmentFormBtn");
const saveAppointmentBtn = document.getElementById("saveAppointmentBtn");
const apptFormTitle = document.getElementById("apptFormTitle");

function combineTodayTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function timeInputValue(isoString) {
  const d = new Date(isoString);
  return d.toTimeString().slice(0, 5);
}

function openAppointmentForm(appointment) {
  if (appointment) {
    editingAppointmentId = appointment.id;
    apptFormTitle.textContent = "Edit appointment";
    document.getElementById("apptPatientName").value = appointment.patientName;
    document.getElementById("apptType").value = appointment.type;
    document.getElementById("apptStartTime").value = timeInputValue(appointment.start);
    document.getElementById("apptDuration").value = appointment.durationMinutes;
  } else {
    editingAppointmentId = null;
    apptFormTitle.textContent = "Add appointment";
    document.getElementById("apptPatientName").value = "";
    document.getElementById("apptType").value = "";
    document.getElementById("apptStartTime").value = "";
    document.getElementById("apptDuration").value = 20;
  }
  addAppointmentForm.style.display = "block";
  addAppointmentBtn.style.display = "none";
}

function closeAppointmentForm() {
  addAppointmentForm.style.display = "none";
  addAppointmentBtn.style.display = "inline-flex";
  editingAppointmentId = null;
}

addAppointmentBtn.addEventListener("click", () => openAppointmentForm(null));
cancelAppointmentFormBtn.addEventListener("click", closeAppointmentForm);

saveAppointmentBtn.addEventListener("click", () => {
  const patientName = document.getElementById("apptPatientName").value.trim();
  const type = document.getElementById("apptType").value.trim();
  const startTime = document.getElementById("apptStartTime").value;
  const durationMinutes = document.getElementById("apptDuration").value;

  if (!patientName || !startTime) {
    if (!patientName) document.getElementById("apptPatientName").focus();
    else document.getElementById("apptStartTime").focus();
    return;
  }

  const start = combineTodayTime(startTime);

  if (editingAppointmentId) {
    updateAppointment(editingAppointmentId, { patientName, type, start, durationMinutes });
  } else {
    addAppointment({ patientName, type, start, durationMinutes });
  }

  closeAppointmentForm();
  renderAppointmentsTable();
  renderOverview();
});

function appointmentStatus(appointment, currentApptId) {
  if (appointment.done) return { text: "Done", cls: "badge-done" };
  if (appointment.id === currentApptId) {
    const end = new Date(appointment.start).getTime() + appointment.durationMinutes * 60000;
    if (Date.now() > end) return { text: "Overdue", cls: "badge-current" };
    if (Date.now() >= new Date(appointment.start).getTime()) return { text: "In progress", cls: "badge-current" };
  }
  return { text: "Upcoming", cls: "badge-upcoming" };
}

function renderAppointmentsTable() {
  const appointments = getSortedAppointments();
  const tbody = document.getElementById("appointmentsTableBody");
  const emptyEl = document.getElementById("appointmentsEmpty");

  if (appointments.length === 0) {
    tbody.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  const currentAppt = getCurrentAppointment(appointments);
  tbody.innerHTML = "";

  appointments.forEach((appt) => {
    const status = appointmentStatus(appt, currentAppt ? currentAppt.id : null);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatClock(new Date(appt.start))}</td>
      <td>${escapeHtml(appt.patientName)}</td>
      <td>${escapeHtml(appt.type)}</td>
      <td>${appt.durationMinutes} min</td>
      <td><span class="badge ${status.cls}">${status.text}</span></td>
      <td style="text-align:right; white-space:nowrap;"></td>
    `;

    const actionsCell = row.querySelector("td:last-child");

    const doneBtn = document.createElement("button");
    doneBtn.className = "btn btn-ghost";
    doneBtn.textContent = appt.done ? "Mark not done" : "Mark done";
    doneBtn.style.marginRight = "0.3rem";
    doneBtn.addEventListener("click", () => {
      updateAppointment(appt.id, { done: !appt.done });
      renderAppointmentsTable();
      renderOverview();
    });
    actionsCell.appendChild(doneBtn);

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-ghost";
    editBtn.textContent = "Edit";
    editBtn.style.marginRight = "0.3rem";
    editBtn.addEventListener("click", () => openAppointmentForm(appt));
    actionsCell.appendChild(editBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-ghost";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      deleteAppointment(appt.id);
      renderAppointmentsTable();
      renderOverview();
    });
    actionsCell.appendChild(cancelBtn);

    tbody.appendChild(row);
  });
}

renderAppointmentsTable();

// =======================================================================
// OVERVIEW — stats, schedule, and the live countdown timer, all driven
// by real appointment data and the real current time.
// =======================================================================
function getCurrentAppointment(sortedAppointments) {
  return sortedAppointments.find((a) => !a.done) || null;
}

const timerDisplay = document.getElementById("timerDisplay");
const timerFill = document.getElementById("timerFill");
const timerSub = document.getElementById("timerSub");
const timerLabel = document.getElementById("timerLabel");
const timerPatient = document.getElementById("timerPatient");
const nextApptBtn = document.getElementById("nextApptBtn");
const editTimerBtn = document.getElementById("editTimerBtn");
const editTimerForm = document.getElementById("editTimerForm");

function renderOverview() {
  const appointments = getSortedAppointments();
  const total = appointments.length;
  const remaining = appointments.filter((a) => !a.done).length;
  const currentAppt = getCurrentAppointment(appointments);

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statRemaining").textContent = remaining;

  // Schedule list
  const scheduleList = document.getElementById("overviewScheduleList");
  const scheduleEmpty = document.getElementById("overviewScheduleEmpty");
  scheduleList.innerHTML = "";

  if (appointments.length === 0) {
    scheduleEmpty.style.display = "block";
  } else {
    scheduleEmpty.style.display = "none";

    // Work out the knock-on effect of running late: once we're past the
    // current appointment's scheduled end, every later appointment gets
    // pushed back by that much. This is the "what time will I actually
    // get to them" number, which matters more than the booked time.
    let delayMinutes = 0;
    if (currentAppt) {
      const currentEnd = new Date(currentAppt.start).getTime() + currentAppt.durationMinutes * 60000;
      if (Date.now() > currentEnd) {
        delayMinutes = Math.ceil((Date.now() - currentEnd) / 60000);
      }
    }

    appointments.forEach((appt) => {
      const status = appointmentStatus(appt, currentAppt ? currentAppt.id : null);
      const li = document.createElement("li");
      li.className = "schedule-item";

      const scheduled = new Date(appt.start);
      const isLaterThanCurrent = currentAppt && new Date(appt.start) > new Date(currentAppt.start);
      const showProjected = delayMinutes > 0 && isLaterThanCurrent && !appt.done;
      const projected = new Date(scheduled.getTime() + delayMinutes * 60000);

      li.innerHTML = `
        <div class="schedule-time">${formatClock(scheduled)}</div>
        <div class="schedule-info">
          <div class="schedule-name">${escapeHtml(appt.type)} — ${escapeHtml(appt.patientName)}</div>
          <div class="schedule-type">
            ${appt.durationMinutes} min${showProjected ? ` · <span style="color:var(--color-danger);">likely ${formatClock(projected)}</span>` : ""}
          </div>
        </div>
        <span class="badge ${status.cls}">${status.text}</span>
      `;
      scheduleList.appendChild(li);
    });
  }

  // Timer widget + "running over" stat
  const statOver = document.getElementById("statOver");
  const statOverLabel = document.getElementById("statOverLabel");

  if (!currentAppt) {
    timerLabel.textContent = total === 0 ? "No appointments yet" : "All done for today";
    timerPatient.textContent = total === 0 ? "Add one from the Appointments page" : "Nice work.";
    timerDisplay.textContent = "--:--";
    timerFill.style.width = "0%";
    timerFill.classList.remove("state-warn", "state-over");
    timerDisplay.classList.remove("state-warn", "state-over");
    timerSub.textContent = "";
    nextApptBtn.style.display = "none";
    editTimerBtn.style.display = "none";
    editTimerForm.style.display = "none";
    statOver.textContent = "—";
    statOverLabel.textContent = "Running over schedule";
    return;
  }

  nextApptBtn.style.display = "inline-flex";
  editTimerBtn.style.display = "inline-flex";

  const start = new Date(currentAppt.start);
  const end = new Date(start.getTime() + currentAppt.durationMinutes * 60000);
  const now = new Date();

  timerPatient.textContent = `${currentAppt.type} — ${currentAppt.patientName}`;

  timerDisplay.classList.remove("state-warn", "state-over");
  timerFill.classList.remove("state-warn", "state-over");

  if (now < start) {
    const secondsToStart = Math.floor((start - now) / 1000);
    timerLabel.textContent = "Upcoming appointment";
    timerDisplay.textContent = formatDuration(secondsToStart);
    timerFill.style.width = "0%";
    timerSub.textContent = `Starts at ${formatClock(start)}`;
    statOver.textContent = "On schedule";
    statOverLabel.textContent = "Next appointment status";
  } else if (now <= end) {
    const secondsLeft = Math.floor((end - now) / 1000);
    const fraction = Math.max(0, Math.min(1, secondsLeft / (currentAppt.durationMinutes * 60)));
    timerLabel.textContent = "Current appointment";
    timerDisplay.textContent = formatDuration(secondsLeft);
    timerFill.style.width = `${fraction * 100}%`;
    timerSub.textContent = `Ends at ${formatClock(end)}`;
    if (secondsLeft <= 120) {
      timerDisplay.classList.add("state-warn");
      timerFill.classList.add("state-warn");
    }
    statOver.textContent = "On schedule";
    statOverLabel.textContent = "Current appointment status";
  } else {
    const secondsOver = Math.floor((now - end) / 1000);
    timerLabel.textContent = "Overdue";
    timerDisplay.textContent = "+" + formatDuration(secondsOver);
    timerFill.style.width = "100%";
    timerSub.textContent = `Was due to end at ${formatClock(end)}`;
    timerDisplay.classList.add("state-over");
    timerFill.classList.add("state-over");
    statOver.textContent = `+${Math.ceil(secondsOver / 60)}m`;
    statOverLabel.textContent = "Running over schedule";
  }
}

nextApptBtn.addEventListener("click", () => {
  const appointments = getSortedAppointments();
  const currentAppt = getCurrentAppointment(appointments);
  if (!currentAppt) return;
  updateAppointment(currentAppt.id, { done: true });
  renderOverview();
  renderAppointmentsTable();
});

editTimerBtn.addEventListener("click", () => {
  const appointments = getSortedAppointments();
  const currentAppt = getCurrentAppointment(appointments);
  if (!currentAppt) return;
  document.getElementById("editTimerDuration").value = currentAppt.durationMinutes;
  editTimerForm.style.display = "block";
});

document.getElementById("cancelTimerEditBtn").addEventListener("click", () => {
  editTimerForm.style.display = "none";
});

document.getElementById("saveTimerEditBtn").addEventListener("click", () => {
  const appointments = getSortedAppointments();
  const currentAppt = getCurrentAppointment(appointments);
  if (!currentAppt) return;
  const newDuration = Number(document.getElementById("editTimerDuration").value) || currentAppt.durationMinutes;
  updateAppointment(currentAppt.id, { durationMinutes: newDuration });
  editTimerForm.style.display = "none";
  renderOverview();
  renderAppointmentsTable();
});

renderOverview();
setInterval(renderOverview, 1000);

// =======================================================================
// CHAT — simple messaging between accounts on this device.
// =======================================================================
let activeChatContact = null;

function renderChatContacts() {
  const wrap = document.getElementById("chatContactsList");
  const me = getCurrentUser();
  const others = getAccounts().filter((a) => a.email !== me.email);

  wrap.innerHTML = "";

  if (others.length === 0) {
    wrap.innerHTML = '<p class="alert-meta">No other accounts on this device yet.</p>';
    return;
  }

  others.forEach((account) => {
    const unread = getConversation(me.email, account.email).filter(
      (m) => m.to === me.email && !m.read
    ).length;

    const btn = document.createElement("button");
    btn.className = "chat-contact-btn" + (activeChatContact === account.email ? " active" : "");
    btn.innerHTML = `${escapeHtml(account.name)}${unread > 0 ? ` <span class="badge badge-current">${unread}</span>` : ""}`;
    btn.addEventListener("click", () => {
      activeChatContact = account.email;
      markConversationRead(me.email, account.email);
      renderChatContacts();
      renderChatThread();
      renderNotifications();
    });
    wrap.appendChild(btn);
  });
}

function renderChatThread() {
  const titleEl = document.getElementById("chatThreadTitle");
  const messagesEl = document.getElementById("chatThreadMessages");
  const inputRow = document.getElementById("chatInputRow");
  const me = getCurrentUser();

  if (!activeChatContact) {
    titleEl.textContent = "Select someone to chat with";
    messagesEl.innerHTML = "";
    inputRow.style.display = "none";
    return;
  }

  const contact = findAccount(activeChatContact);
  titleEl.textContent = contact ? contact.name : activeChatContact;
  inputRow.style.display = "flex";

  const conversation = getConversation(me.email, activeChatContact);
  messagesEl.innerHTML = "";

  if (conversation.length === 0) {
    messagesEl.innerHTML = '<p class="alert-meta">No messages yet — say hello.</p>';
  }

  conversation.forEach((msg) => {
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble " + (msg.from === me.email ? "mine" : "theirs");
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    bubble.innerHTML = `${escapeHtml(msg.body)}<span class="chat-time">${time}</span>`;
    messagesEl.appendChild(bubble);
  });

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

document.getElementById("chatSendBtn").addEventListener("click", sendChat);
document.getElementById("chatMessageInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});

function sendChat() {
  const me = getCurrentUser();
  const input = document.getElementById("chatMessageInput");
  const body = input.value.trim();
  if (!activeChatContact || !body) return;

  sendChatMessage({ from: me.email, to: activeChatContact, body });
  input.value = "";
  renderChatThread();
  renderChatContacts();
}

// =======================================================================
// NOTIFICATIONS — bell + dropdown, pulling together overdue reminders,
// unread patient messages, and unread chat messages.
// =======================================================================
const notifBellBtn = document.getElementById("notifBellBtn");
const notifDropdown = document.getElementById("notifDropdown");

notifBellBtn.addEventListener("click", () => {
  notifDropdown.classList.toggle("open");
});

document.addEventListener("click", (e) => {
  if (!notifDropdown.contains(e.target) && e.target !== notifBellBtn && !notifBellBtn.contains(e.target)) {
    notifDropdown.classList.remove("open");
  }
});

function goToView(viewName) {
  const link = document.querySelector(`.nav-link[data-view="${viewName}"]`);
  if (link) link.click();
  notifDropdown.classList.remove("open");
}

function renderNotifications() {
  const me = getCurrentUser();
  if (!me) return;

  const items = [];

  getMessages().filter((m) => !m.read).forEach((m) => {
    items.push({ label: `Message from ${m.patientName}`, view: "reminders" });
  });

  const now = new Date();
  getReminders().filter((r) => !r.done && r.datetime && new Date(r.datetime) <= now).forEach((r) => {
    items.push({ label: `Reminder: ${r.title}`, view: "reminders" });
  });

  getChatMessages().filter((m) => m.to === me.email && !m.read).forEach((m) => {
    const sender = findAccount(m.from);
    items.push({ label: `Chat: ${sender ? sender.name : m.from}`, view: "chat" });
  });

  const badge = document.getElementById("notifBellBadge");
  if (items.length === 0) {
    badge.style.display = "none";
  } else {
    badge.style.display = "flex";
    badge.textContent = items.length > 9 ? "9+" : items.length;
  }

  const list = document.getElementById("notifDropdownList");
  if (items.length === 0) {
    list.innerHTML = '<p class="alert-meta" style="padding:0.8rem;">Nothing new.</p>';
    return;
  }

  list.innerHTML = "";
  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "notif-dropdown-item";
    el.textContent = item.label;
    el.addEventListener("click", () => goToView(item.view));
    list.appendChild(el);
  });
}

renderNotifications();
setInterval(renderNotifications, 5000);

// Poll for newly-arrived unread messages/chats (works across tabs of
// this same browser, since they share localStorage) and toast them.
let lastMessageCount = getMessages().filter((m) => !m.read).length;
let lastChatCount = getChatMessages().filter((m) => m.to === currentUser.email && !m.read).length;

setInterval(() => {
  const messageCount = getMessages().filter((m) => !m.read).length;
  if (messageCount > lastMessageCount) {
    showToast("New patient message", "Check the Reminders page.");
  }
  lastMessageCount = messageCount;

  const chatCount = getChatMessages().filter((m) => m.to === currentUser.email && !m.read).length;
  if (chatCount > lastChatCount) {
    showToast("New chat message", "Check the Chat page.");
  }
  lastChatCount = chatCount;
}, 4000);

// =======================================================================
// EXPORT / IMPORT — the manual stand-in for real syncing.
// =======================================================================
document.getElementById("exportDataBtn").addEventListener("click", () => {
  const data = exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `midwife-connect-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();

  URL.revokeObjectURL(url);
  showToast("Exported", "Saved to your downloads.");
});

document.getElementById("importDataBtn").addEventListener("click", () => {
  document.getElementById("importFileInput").click();
});

document.getElementById("importFileInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const resultBox = document.getElementById("importResult");
    try {
      const data = JSON.parse(reader.result);
      const result = importAllData(data);

      resultBox.textContent = result.ok ? result.summary : result.reason;
      resultBox.style.background = result.ok ? "var(--color-ok-bg)" : "var(--color-danger-bg)";
      resultBox.style.color = result.ok ? "var(--color-primary-dark)" : "var(--color-danger)";
      resultBox.classList.add("visible");

      if (result.ok) {
        renderAccountSwitcher();
        renderPatients();
        renderReminders();
        renderAppointmentsTable();
        renderOverview();
        renderPatientMessages();
        renderNotifications();
      }
    } catch (e) {
      resultBox.textContent = "Couldn't read that file — make sure it's a Midwife Connect export.";
      resultBox.style.background = "var(--color-danger-bg)";
      resultBox.style.color = "var(--color-danger)";
      resultBox.classList.add("visible");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
});

// =======================================================================
// CROSS-TAB SYNC.
//
// The browser fires a "storage" event in OTHER tabs whenever this site's
// localStorage changes. So if the same person has the dashboard open in
// two tabs — or a patient sends a message from contact.html in another
// tab — this picks it up and re-renders straight away, no refresh.
// (Still same-browser only; it can't reach another device.)
// =======================================================================
window.addEventListener("storage", (event) => {
  if (!event.key || !event.key.startsWith("mc_")) return;

  renderNotifications();

  const activeView = document.querySelector(".view.active");
  const viewId = activeView ? activeView.id : "";

  if (viewId === "view-overview") renderOverview();
  if (viewId === "view-appointments") renderAppointmentsTable();
  if (viewId === "view-patients") renderPatients();
  if (viewId === "view-reminders") { renderReminders(); renderPatientMessages(); }
  if (viewId === "view-chat") { renderChatContacts(); renderChatThread(); }
  if (viewId === "view-settings") renderAccountSwitcher();
  if (viewId === "view-admin") renderAdminTable();
});
