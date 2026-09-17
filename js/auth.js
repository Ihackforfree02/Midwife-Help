// ---------------------------------------------------------------------
// Midwife Connect — account storage (demo).
//
// There is no backend here, so "accounts" live in this browser's
// localStorage. That means:
//   - Accounts created in one browser won't appear in another browser
//     or on another computer.
//   - Passwords are stored in plain text, which is fine for a school
//     demo but would NEVER be acceptable for a real product — a real
//     version needs a backend that hashes passwords properly.
//   - No verification emails are actually sent. The "code" is just
//     shown on screen so the flow can be demonstrated.
//
// Everything here is intentionally simple so it's easy to read and
// explain in a project write-up.
// ---------------------------------------------------------------------

const ACCOUNTS_KEY = "mc_accounts";
const CURRENT_USER_KEY = "mc_current_user";

function getAccounts() {
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function findAccount(email) {
  const normalized = email.trim().toLowerCase();
  return getAccounts().find((a) => a.email === normalized) || null;
}

function anyAdminExists() {
  return getAccounts().some((a) => a.isAdmin);
}

// ---------------------------------------------------------------------
// Patient messages / alerts.
//
// A patient fills in contact.html (no login needed) and the message is
// saved here, same idea as accounts: local to this browser only. In a
// real deployment with patients and midwives on different devices, this
// would need a real backend so a message written on one device is
// readable on another.
// ---------------------------------------------------------------------
const MESSAGES_KEY = "mc_messages";

function getMessages() {
  const raw = localStorage.getItem(MESSAGES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveMessages(messages) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

function addMessage({ patientName, contact, urgent, body }) {
  const messages = getMessages();
  const message = {
    id: Date.now().toString(),
    patientName,
    contact: contact || "",
    urgent: !!urgent,
    body,
    read: false,
    timestamp: new Date().toISOString(),
  };
  messages.unshift(message);
  saveMessages(messages);
  return message;
}

function markMessageRead(id) {
  const messages = getMessages();
  const message = messages.find((m) => m.id === id);
  if (message) message.read = true;
  saveMessages(messages);
}

function deleteMessage(id) {
  saveMessages(getMessages().filter((m) => m.id !== id));
}

// ---------------------------------------------------------------------
// Patients (very simple placeholder list — name + note). Same local
// storage pattern as everything else in this demo.
// ---------------------------------------------------------------------
const PATIENTS_KEY = "mc_patients";

function getPatients() {
  const raw = localStorage.getItem(PATIENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function savePatients(patients) {
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
}

function addPatient({ name, note, dueDate, phone }) {
  const patients = getPatients();
  const patient = {
    id: Date.now().toString(),
    name,
    note: note || "",
    dueDate: dueDate || "", // estimated due date (EDD), YYYY-MM-DD
    phone: phone || "",
    notes: [], // running handover/visit notes
  };
  patients.push(patient);
  savePatients(patients);
  return patient;
}

function updatePatient(id, updates) {
  const patients = getPatients();
  const patient = patients.find((p) => p.id === id);
  if (!patient) return null;
  Object.assign(patient, updates);
  savePatients(patients);
  return patient;
}

function addPatientNote(patientId, text) {
  const patients = getPatients();
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return null;
  if (!patient.notes) patient.notes = [];
  patient.notes.unshift({
    id: Date.now().toString(),
    text,
    timestamp: new Date().toISOString(),
  });
  savePatients(patients);
  return patient;
}

// ---------------------------------------------------------------------
// Gestational age from an estimated due date (EDD).
//
// Standard midwifery maths: a pregnancy is counted as 40 weeks from the
// last menstrual period, so weeks gestation = 40 weeks minus however
// long is left until the due date. Returned as "32+4" (weeks+days),
// which is how it's normally written on a chart.
// ---------------------------------------------------------------------
function gestationFromDueDate(dueDate) {
  if (!dueDate) return null;

  const due = new Date(dueDate + "T00:00:00");
  if (isNaN(due)) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilDue = Math.round((due - today) / msPerDay);
  const totalDays = 280 - daysUntilDue; // 280 days = 40 weeks

  if (totalDays < 0) return { label: "Not yet dated", weeks: 0, days: 0, overdue: false };

  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  const overdue = daysUntilDue < 0;

  return {
    label: `${weeks}+${days}`,
    weeks,
    days,
    overdue,
    daysUntilDue,
  };
}

function deletePatient(id) {
  savePatients(getPatients().filter((p) => p.id !== id));
}

// ---------------------------------------------------------------------
// Reminders. Can be created standalone, or linked to a patient (set
// while adding that patient). Same local-storage pattern as everything
// else here.
// ---------------------------------------------------------------------
const REMINDERS_KEY = "mc_reminders";

function getReminders() {
  const raw = localStorage.getItem(REMINDERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveReminders(reminders) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
}

function addReminder({ title, note, datetime, patientName }) {
  const reminders = getReminders();
  const reminder = {
    id: Date.now().toString(),
    title,
    note: note || "",
    datetime: datetime || "",
    patientName: patientName || "",
    done: false,
    fired: false, // whether its at-time notification has already been shown
    createdAt: new Date().toISOString(),
  };
  reminders.push(reminder);
  saveReminders(reminders);
  return reminder;
}

function markReminderFired(id) {
  const reminders = getReminders();
  const reminder = reminders.find((r) => r.id === id);
  if (reminder) reminder.fired = true;
  saveReminders(reminders);
}

function toggleReminderDone(id) {
  const reminders = getReminders();
  const reminder = reminders.find((r) => r.id === id);
  if (reminder) reminder.done = !reminder.done;
  saveReminders(reminders);
}

function deleteReminder(id) {
  saveReminders(getReminders().filter((r) => r.id !== id));
}

// ---------------------------------------------------------------------
// Appointments.
//
// Each appointment has a real start time (ISO datetime string, today's
// date) and a duration in minutes, plus a "done" flag the midwife sets
// manually (there's no way for the site to know an appointment finished
// early or ran over without being told). Everything time-related on the
// dashboard — the countdown timer, "time remaining today," schedule
// status badges — is calculated live from this data and the actual
// current time, rather than being hardcoded.
// ---------------------------------------------------------------------
const APPOINTMENTS_KEY = "mc_appointments";

function getAppointments() {
  const raw = localStorage.getItem(APPOINTMENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveAppointments(appointments) {
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
}

function getSortedAppointments() {
  return getAppointments()
    .slice()
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}

function addAppointment({ patientName, type, start, durationMinutes, done }) {
  const appointments = getAppointments();
  const appointment = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    patientName,
    type: type || "Appointment",
    start, // ISO datetime string
    durationMinutes: Number(durationMinutes) || 20,
    done: !!done,
  };
  appointments.push(appointment);
  saveAppointments(appointments);
  return appointment;
}

function updateAppointment(id, updates) {
  const appointments = getAppointments();
  const appointment = appointments.find((a) => a.id === id);
  if (!appointment) return null;
  Object.assign(appointment, updates);
  saveAppointments(appointments);
  return appointment;
}

function deleteAppointment(id) {
  saveAppointments(getAppointments().filter((a) => a.id !== id));
}

// ---------------------------------------------------------------------
// Seed a realistic-looking demo day the first time this loads, timed
// relative to right now so the dashboard looks "live" immediately:
// two appointments already finished, one in progress, two upcoming.
// ---------------------------------------------------------------------
function seedDemoAppointments() {
  if (getAppointments().length > 0) return;

  const now = new Date();
  const at = (minutesOffset) => new Date(now.getTime() + minutesOffset * 60000).toISOString();

  const demo = [
    { patientName: "Patient A", type: "Routine antenatal", start: at(-90), durationMinutes: 20, done: true },
    { patientName: "Patient B", type: "First consultation", start: at(-60), durationMinutes: 30, done: true },
    { patientName: "Patient C", type: "Postnatal review", start: at(-10), durationMinutes: 20, done: false },
    { patientName: "Patient D", type: "Routine antenatal", start: at(20), durationMinutes: 20, done: false },
    { patientName: "Patient E", type: "Routine antenatal", start: at(50), durationMinutes: 20, done: false },
  ];

  demo.forEach((appt) => addAppointment(appt));
}

seedDemoAppointments();

// ---------------------------------------------------------------------
// Staff-to-staff chat.
//
// A simple 1:1 message list between accounts on this device. Same
// local-storage limitation as everything else: since there's no
// backend, this only really demonstrates the concept when both
// "people" are accounts you've created in this same browser.
// ---------------------------------------------------------------------
const CHATS_KEY = "mc_chats";

function getChatMessages() {
  const raw = localStorage.getItem(CHATS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveChatMessages(messages) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(messages));
}

function sendChatMessage({ from, to, body }) {
  const messages = getChatMessages();
  const message = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    from: from.trim().toLowerCase(),
    to: to.trim().toLowerCase(),
    body,
    read: false,
    timestamp: new Date().toISOString(),
  };
  messages.push(message);
  saveChatMessages(messages);
  return message;
}

function getConversation(emailA, emailB) {
  const a = emailA.trim().toLowerCase();
  const b = emailB.trim().toLowerCase();
  return getChatMessages()
    .filter((m) => (m.from === a && m.to === b) || (m.from === b && m.to === a))
    .sort((x, y) => new Date(x.timestamp) - new Date(y.timestamp));
}

function markConversationRead(myEmail, otherEmail) {
  const me = myEmail.trim().toLowerCase();
  const other = otherEmail.trim().toLowerCase();
  const messages = getChatMessages();
  messages.forEach((m) => {
    if (m.to === me && m.from === other) m.read = true;
  });
  saveChatMessages(messages);
}

function countUnreadChatMessages(myEmail) {
  const me = myEmail.trim().toLowerCase();
  return getChatMessages().filter((m) => m.to === me && !m.read).length;
}

// ---------------------------------------------------------------------
// Export / import.
//
// This is the honest workaround for having no backend. Everything the
// site knows lives in this browser's localStorage, so the only way to
// move it to another device or browser is to hand it over as a file.
// Export writes one .json file; import reads it back and MERGES it in,
// so importing a colleague's export adds their accounts, patients and
// messages to yours rather than wiping what you already had.
// ---------------------------------------------------------------------
const ALL_KEYS = [ACCOUNTS_KEY, MESSAGES_KEY, PATIENTS_KEY, REMINDERS_KEY, APPOINTMENTS_KEY, CHATS_KEY];

function exportAllData() {
  const data = { exportedAt: new Date().toISOString(), version: 1 };
  ALL_KEYS.forEach((key) => {
    const raw = localStorage.getItem(key);
    data[key] = raw ? JSON.parse(raw) : [];
  });
  return data;
}

// Merge two lists of objects, keeping one copy per unique key.
function mergeById(existing, incoming, keyName) {
  const seen = new Map();
  existing.forEach((item) => seen.set(item[keyName], item));
  incoming.forEach((item) => {
    if (!seen.has(item[keyName])) seen.set(item[keyName], item);
  });
  return Array.from(seen.values());
}

function importAllData(data) {
  if (!data || typeof data !== "object") {
    return { ok: false, reason: "That file doesn't look like a Midwife Connect export." };
  }

  const summary = [];

  ALL_KEYS.forEach((key) => {
    const incoming = Array.isArray(data[key]) ? data[key] : [];
    if (incoming.length === 0) return;

    const rawExisting = localStorage.getItem(key);
    const existing = rawExisting ? JSON.parse(rawExisting) : [];

    // Accounts are keyed by email; everything else has an id.
    const keyName = key === ACCOUNTS_KEY ? "email" : "id";
    const merged = mergeById(existing, incoming, keyName);

    const added = merged.length - existing.length;
    if (added > 0) summary.push(`${added} ${key.replace("mc_", "")}`);

    localStorage.setItem(key, JSON.stringify(merged));
  });

  return {
    ok: true,
    summary: summary.length ? `Added ${summary.join(", ")}.` : "Nothing new to add — already up to date.",
  };
}

function createAccount({ name, email, phone, password, isAdmin }) {
  const accounts = getAccounts();
  const account = {
    name,
    email: email.trim().toLowerCase(),
    phones: phone ? [phone] : [], // list of phone numbers
    emails: [], // additional contact emails, separate from the login email above
    password, // plain text — demo only, see note above
    isAdmin: !!isAdmin,
    verified: !!isAdmin, // admins skip verification entirely
    verificationCode: isAdmin ? null : generateCode(),
    avatar: null, // will hold a data URL once a photo is uploaded
  };
  accounts.push(account);
  saveAccounts(accounts);
  return account;
}

// ---------------------------------------------------------------------
// Used by admin-setup.html. If an account with this email already
// exists on this device (e.g. from an earlier sign-up attempt that
// never got verified), this turns it into a working admin account and
// resets its password, rather than blocking with "already exists".
// If no account exists yet, it creates a fresh admin account.
// ---------------------------------------------------------------------
function claimAdmin({ name, email, password }) {
  const normalized = email.trim().toLowerCase();
  const existing = findAccount(normalized);

  if (existing) {
    return updateAccount(normalized, {
      name,
      password,
      isAdmin: true,
      verified: true,
      verificationCode: null,
    });
  }

  return createAccount({ name, email: normalized, phone: "", password, isAdmin: true });
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function verifyAccount(email, code) {
  const accounts = getAccounts();
  const account = accounts.find((a) => a.email === email.trim().toLowerCase());
  if (!account) return { ok: false, reason: "No account found." };
  if (account.verified) return { ok: true };
  if (account.verificationCode !== code) {
    return { ok: false, reason: "That code doesn't match." };
  }
  account.verified = true;
  account.verificationCode = null;
  saveAccounts(accounts);
  return { ok: true };
}

function setCurrentUser(email, remember = true) {
  const normalized = email.trim().toLowerCase();
  // Always clear both first so switching "remember" behaviour doesn't
  // leave a stale copy sitting in the other storage.
  localStorage.removeItem(CURRENT_USER_KEY);
  sessionStorage.removeItem(CURRENT_USER_KEY);

  if (remember) {
    localStorage.setItem(CURRENT_USER_KEY, normalized);
  } else {
    sessionStorage.setItem(CURRENT_USER_KEY, normalized);
  }
}

function getCurrentUser() {
  const email = localStorage.getItem(CURRENT_USER_KEY) || sessionStorage.getItem(CURRENT_USER_KEY);
  if (!email) return null;
  return findAccount(email);
}

function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  sessionStorage.removeItem(CURRENT_USER_KEY);
}

function updateAccount(email, updates) {
  const accounts = getAccounts();
  const account = accounts.find((a) => a.email === email.trim().toLowerCase());
  if (!account) return null;
  Object.assign(account, updates);
  saveAccounts(accounts);
  return account;
}

function deleteAccount(email) {
  const accounts = getAccounts().filter((a) => a.email !== email.trim().toLowerCase());
  saveAccounts(accounts);
}

// ---------------------------------------------------------------------
// Seed a single non-admin demo account so the dashboard can be explored
// immediately without going through sign-up. This does NOT create an
// admin — that only happens through the admin setup page, by whoever
// opens the site first.
// ---------------------------------------------------------------------
function seedDemoAccount() {
  if (!findAccount("demo@midwifeconnect.org")) {
    createAccount({
      name: "Demo User",
      email: "demo@midwifeconnect.org",
      phone: "",
      password: "demo1234",
      isAdmin: false,
    });
    // Demo account is pre-verified so it's usable immediately.
    updateAccount("demo@midwifeconnect.org", { verified: true, verificationCode: null });
  }
}

seedDemoAccount();
