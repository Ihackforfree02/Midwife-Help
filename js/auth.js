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

function setCurrentUser(email) {
  localStorage.setItem(CURRENT_USER_KEY, email.trim().toLowerCase());
}

function getCurrentUser() {
  const email = localStorage.getItem(CURRENT_USER_KEY);
  if (!email) return null;
  return findAccount(email);
}

function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
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
