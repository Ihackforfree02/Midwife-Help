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
  });
});

// ---------------------------------------------------------------------
// Logout — just sends the user back to the login page. There's no real
// session to clear yet since login.js doesn't set one.
// ---------------------------------------------------------------------
document.getElementById("logoutBtn").addEventListener("click", () => {
  window.location.href = "index.html";
});

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
