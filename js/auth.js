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

function addPatient({ name, note }) {
  const patients = getPatients();
  const patient = { id: Date.now().toString(), name, note: note || "" };
  patients.push(patient);
  savePatients(patients);
  return patient;
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
    createdAt: new Date().toISOString(),
  };
  reminders.push(reminder);
  saveReminders(reminders);
  return reminder;
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

function createAccount({ name, email, phone, password, isAdmin }) {
  const accounts = getAccounts();
  const account = {
    name,
    email: email.trim().toLowerCase(),
    phone: phone || "",
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
