const STORAGE_KEY = "petpal_v1";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const nowMs = () => Date.now();

const defaultState = () => ({
  name: "",
  stage: "Egg",
  bornAt: nowMs(),
  lastTickAt: nowMs(),
  hunger: 35,        // 0 full, 100 starving
  happiness: 65,     // 0 sad, 100 happy
  energy: 70,        // 0 tired, 100 energetic
  cleanliness: 75,   // 0 dirty, 100 clean
  sick: false,
  asleep: false,
  score: 0,
  round: 0,
});

let state = load() || defaultState();

const el = (id) => document.getElementById(id);

const ui = {
  petName: el("petName"),
  petStage: el("petStage"),
  moodBadge: el("moodBadge"),
  healthBadge: el("healthBadge"),
  petFace: el("petFace"),
  speech: el("speechBubble"),
  log: el("log"),
  hungerFill: el("hungerFill"),
  happyFill: el("happyFill"),
  energyFill: el("energyFill"),
  cleanFill: el("cleanFill"),
  hungerVal: el("hungerVal"),
  happyVal: el("happyVal"),
  energyVal: el("energyVal"),
  cleanVal: el("cleanVal"),
  timePill: el("timePill"),

  nameBtn: el("nameBtn"),
  feedBtn: el("feedBtn"),
  playBtn: el("playBtn"),
  cleanBtn: el("cleanBtn"),
  sleepBtn: el("sleepBtn"),
  resetBtn: el("resetBtn"),

  startGameBtn: el("startGameBtn"),
  arena: el("arena"),
  treat: el("treat"),
  scorePill: el("scorePill"),
  roundPill: el("roundPill"),
  gameMsg: el("gameMsg"),
};

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function log(msg) {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  ui.log.textContent = `${time} , ${msg}`;
}

function speak(msg) {
  ui.speech.textContent = msg;
}

function stageFromAge() {
  const ageHrs = (nowMs() - state.bornAt) / 36e5;
  if (ageHrs < 1) return "Egg";
  if (ageHrs < 8) return "Baby";
  if (ageHrs < 36) return "Teen";
  return "Adult";
}

function moodLabel() {
  const need = overallNeed();
  if (state.asleep) return "😴 Sleeping";
  if (need > 70) return "😟 Needs you";
  if (need > 45) return "🙂 Okay";
  return "😍 Thriving";
}

function overallNeed() {
  // Higher number means more needs
  const hungerNeed = state.hunger;
  const sadNeed = 100 - state.happiness;
  const tiredNeed = 100 - state.energy;
  const dirtyNeed = 100 - state.cleanliness;
  return Math.round((hungerNeed + sadNeed + tiredNeed + dirtyNeed) / 4);
}

function healthLabel() {
  if (state.sick) return "🤒 Sick";
  const need = overallNeed();
  if (need > 75) return "⚠️ Risky";
  return "❤️ Healthy";
}

function faceForState() {
  if (state.asleep) return "ᶻ 𝗓 𐰁";
  if (state.sick) return "ᵕ︵ᵕ";
  const need = overallNeed();
  if (need > 80) return "ಥ_ಥ";
  if (need > 60) return "•︵•";
  if (need > 40) return "•ᴗ•";
  return "ᵔᴗᵔ";
}

function setFill(fillEl, val, invert = false) {
  const pct = invert ? (100 - val) : val;
  fillEl.style.width = `${clamp(pct, 0, 100)}%`;
  // quick color cues by swapping background via inline alpha
  if (!invert) {
    fillEl.style.background = `rgba(140,255,223,${0.35 + (pct / 100) * 0.55})`;
  } else {
    fillEl.style.background = `rgba(255,180,120,${0.35 + (pct / 100) * 0.55})`;
  }
}

function render() {
  state.stage = stageFromAge();

  ui.petName.textContent = state.name ? state.name : "Your Pet";
  ui.petStage.textContent = `Stage: ${state.stage}`;

  ui.moodBadge.textContent = moodLabel();
  ui.healthBadge.textContent = healthLabel();
  ui.petFace.textContent = faceForState();

  ui.hungerVal.textContent = state.hunger;
  ui.happyVal.textContent = state.happiness;
  ui.energyVal.textContent = state.energy;
  ui.cleanVal.textContent = state.cleanliness;

  // hunger is inverted visually, low hunger is good
  setFill(ui.hungerFill, state.hunger, true);
  setFill(ui.happyFill, state.happiness, false);
  setFill(ui.energyFill, state.energy, false);
  setFill(ui.cleanFill, state.cleanliness, false);

  const last = new Date(state.lastTickAt);
  ui.timePill.textContent = `⏳ Updated: ${last.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  ui.feedBtn.disabled = state.asleep;
  ui.playBtn.disabled = state.asleep;
  ui.cleanBtn.disabled = state.asleep;
  ui.nameBtn.disabled = false;

  ui.sleepBtn.textContent = state.asleep ? "Wake ☀️" : "Sleep 😴";

  ui.scorePill.textContent = `Score: ${state.score}`;
  ui.roundPill.textContent = `Round: ${state.round}`;
}

function tick(deltaMs) {
  const minutes = deltaMs / 60000;

  if (minutes <= 0) return;

  // If asleep, recover energy faster and decay slows down
  const asleepFactor = state.asleep ? 0.35 : 1.0;
  const hungerRate = 0.18 * asleepFactor;         // hunger increases
  const happyRate = 0.12 * asleepFactor;          // happiness decreases
  const energyRate = state.asleep ? -0.45 : 0.16;  // energy decreases, or recovers when asleep
  const cleanRate = 0.10 * asleepFactor;          // cleanliness decreases

  state.hunger = clamp(state.hunger + minutes * hungerRate, 0, 100);
  state.happiness = clamp(state.happiness - minutes * happyRate, 0, 100);
  state.energy = clamp(state.energy - minutes * energyRate, 0, 100);
  state.cleanliness = clamp(state.cleanliness - minutes * cleanRate, 0, 100);

  // Sickness chance if needs are ignored
  const need = overallNeed();
  if (!state.sick && need > 80) {
    const chance = Math.min(0.18, (need - 80) / 100) * (minutes / 5);
    if (Math.random() < chance) state.sick = true;
  }
  // Recover slowly if cared for
  if (state.sick && need < 55 && Math.random() < (minutes / 30)) {
    state.sick = false;
  }

  state.lastTickAt = nowMs();
}

function catchUp() {
  const delta = nowMs() - state.lastTickAt;
  tick(delta);
  save();
  render();
}

function actionGuard() {
  if (state.asleep) {
    speak("Shhh... I’m sleeping. Wake me first ☀️");
    log("Tried to interact while sleeping");
    return false;
  }
  return true;
}

function feed() {
  if (!actionGuard()) return;
  const before = state.hunger;

  state.hunger = clamp(state.hunger - 22, 0, 100);
  state.cleanliness = clamp(state.cleanliness - 6, 0, 100);
  state.happiness = clamp(state.happiness + 4, 0, 100);

  speak(before > 60 ? "Yum! I was starving 😭🍎" : "Snack time! 🍎");
  log("Fed your pet");
  save();
  render();
}

function play() {
  if (!actionGuard()) return;
  if (state.energy < 15) {
    speak("Too tired to play... can we nap? 😴");
    log("Pet too tired to play");
    return;
  }

  state.happiness = clamp(state.happiness + 16, 0, 100);
  state.energy = clamp(state.energy - 12, 0, 100);
  state.hunger = clamp(state.hunger + 6, 0, 100);

  speak("Yay! Again! 🎾");
  log("Played together");
  save();
  render();
}

function clean() {
  if (!actionGuard()) return;

  state.cleanliness = clamp(state.cleanliness + 28, 0, 100);
  state.happiness = clamp(state.happiness - 2, 0, 100);

  speak("All fresh! ✨🛁");
  log("Cleaned your pet");
  save();
  render();
}

function toggleSleep() {
  state.asleep = !state.asleep;

  if (state.asleep) {
    speak("Goodnight... 💤");
    log("Put pet to sleep");
  } else {
    speak("Morning! I’m up ☀️");
    log("Woke pet up");
  }

  save();
  render();
}

function namePet() {
  const current = state.name || "";
  const name = prompt("What’s your pet’s name?", current).trim();
  if (!name) return;

  state.name = name.slice(0, 16);
  speak(`Hi! I’m ${state.name} 🐾`);
  log(`Named pet: ${state.name}`);
  save();
  render();
}

function resetPet() {
  const ok = confirm("Reset pet? This clears progress on this device.");
  if (!ok) return;
  state = defaultState();
  save();
  render();
  speak("Hi! Name me 🐣");
  log("Pet reset");
}

/* Mini game */
let gameTimer = null;
let roundTimer = null;
let timeLeft = 0;
let inRound = false;

function randomArenaPos() {
  const rect = ui.arena.getBoundingClientRect();
  const pad = 12;
  const size = 54;
  const x = Math.random() * (rect.width - size - pad * 2) + pad;
  const y = Math.random() * (rect.height - size - pad * 2) + pad;
  return { x, y };
}

function startGame() {
  if (state.asleep) {
    ui.gameMsg.textContent = "Wake your pet first ☀️";
    return;
  }
  if (state.energy < 10) {
    ui.gameMsg.textContent = "Too sleepy for games, let your pet rest.";
    return;
  }
  if (inRound) return;

  inRound = true;
  state.round += 1;
  timeLeft = 6;

  ui.gameMsg.textContent = "Go!";
  ui.treat.hidden = false;
  moveTreat();

  roundTimer = setInterval(() => {
    timeLeft -= 1;
    ui.gameMsg.textContent = `Time left: ${timeLeft}s`;
    if (timeLeft <= 0) endRound(false);
  }, 1000);

  // little movement every 650ms
  gameTimer = setInterval(moveTreat, 650);

  save();
  render();
}

function moveTreat() {
  const { x, y } = randomArenaPos();
  ui.treat.style.left = `${x}px`;
  ui.treat.style.top = `${y}px`;
}

function endRound(won) {
  clearInterval(gameTimer);
  clearInterval(roundTimer);
  gameTimer = null;
  roundTimer = null;
  inRound = false;

  ui.treat.hidden = true;

  if (won) {
    state.score += 1;
    state.happiness = clamp(state.happiness + 10, 0, 100);
    state.energy = clamp(state.energy - 6, 0, 100);
    state.hunger = clamp(state.hunger + 3, 0, 100);
    ui.gameMsg.textContent = "Nice! Happiness boosted.";
    speak("That was fun! 🍪");
    log("Won a treat round");
  } else {
    state.energy = clamp(state.energy - 3, 0, 100);
    ui.gameMsg.textContent = "Missed it! Try again.";
    speak("Aww, I almost got it 😅");
    log("Lost a treat round");
  }

  save();
  render();
}

ui.treat?.addEventListener("click", () => {
  if (!inRound) return;
  endRound(true);
});

/* Wiring */
ui.nameBtn.addEventListener("click", namePet);
ui.feedBtn.addEventListener("click", feed);
ui.playBtn.addEventListener("click", play);
ui.cleanBtn.addEventListener("click", clean);
ui.sleepBtn.addEventListener("click", toggleSleep);
ui.resetBtn.addEventListener("click", resetPet);
ui.startGameBtn.addEventListener("click", startGame);

/* Start up */
catchUp();
setInterval(catchUp, 15_000);

if (!state.name) {
  speak("Hi! Name me 🐣");
  log("Welcome! Name your pet to begin");
} else {
  speak(`Hi ${state.name}’s human 🐾`);
  log("Loaded saved pet");
}