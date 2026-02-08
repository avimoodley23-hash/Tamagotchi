/* Pet Pal v2, Tamagotchi + Nintendogs style */

const STORAGE_KEY = "petpal_v2";
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const nowMs = () => Date.now();

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const minutesBetween = (aMs, bMs) => (bMs - aMs) / 60000;

const PERSONALITIES = [
  { id: "sweet", name: "Sweet", vibe: "loves cuddles, gets sad if ignored" },
  { id: "chaos", name: "Chaotic", vibe: "energetic, makes mess, loves games" },
  { id: "foodie", name: "Foodie", vibe: "treats matter, gets hangry fast" },
  { id: "shy", name: "Shy", vibe: "slow to bond, but very loyal" },
];

const EVOLUTIONS = [
  { id: "fancy", name: "Fancy", rule: "kept clean and cared for" },
  { id: "goofy", name: "Goofy", rule: "played often and happy" },
  { id: "gremlin", name: "Gremlin", rule: "neglected, grumpy, chaotic" },
  { id: "buddy", name: "Buddy", rule: "high bond, steady care" },
];

const ITEMS = {
  outfits: [
    { id: "none", label: "No Outfit", unlockBond: 0 },
    { id: "bow", label: "🎀 Bow", unlockBond: 20 },
    { id: "cap", label: "🧢 Cap", unlockBond: 40 },
    { id: "hoodie", label: "🧥 Hoodie", unlockBond: 65 },
  ],
  backgrounds: [
    { id: "aurora", label: "🌌 Aurora", unlockBond: 0 },
    { id: "park", label: "🌳 Park", unlockBond: 25 },
    { id: "kitchen", label: "🍳 Kitchen", unlockBond: 45 },
    { id: "beach", label: "🏖️ Beach", unlockBond: 70 },
  ],
};

const TRICKS = [
  { id: "sit", label: "Sit", unlockBond: 15 },
  { id: "roll", label: "Roll", unlockBond: 35 },
  { id: "hi", label: "High Five", unlockBond: 55 },
];

function pickPersonality() {
  return PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
}

function defaultState() {
  const persona = pickPersonality();
  return {
    name: "",
    personaId: persona.id,
    bornAt: nowMs(),
    lastTickAt: nowMs(),
    lastVisitDay: dayKey(),
    streak: 1,

    stage: "Egg",
    evolution: "none",

    hunger: 35,        // 0 full, 100 starving
    happiness: 65,     // 0 sad, 100 happy
    energy: 70,        // 0 tired, 100 energetic
    cleanliness: 75,   // 0 dirty, 100 clean
    bond: 10,          // 0 cold, 100 besties

    sick: false,
    asleep: false,
    refuses: false,

    outfit: "none",
    background: "aurora",

    inventory: {
      snacks: 2,
      medicine: 1,
      toys: 0,
    },

    diary: [],         // { day, text }
    score: 0,
    round: 0,

    lastDiaryDay: "",
    lastRoutineHintDay: "",
  };
}

let state = load() || defaultState();

/* DOM */
const el = (id) => document.getElementById(id);
const ui = {
  petName: el("petName"),
  petStage: el("petStage"),
  petPersona: el("petPersona"),
  moodBadge: el("moodBadge"),
  healthBadge: el("healthBadge"),
  streakBadge: el("streakBadge"),
  petFace: el("petFace"),
  flies: el("flies"),
  speech: el("speechBubble"),
  log: el("log"),
  timePill: el("timePill"),

  hungerFill: el("hungerFill"),
  happyFill: el("happyFill"),
  energyFill: el("energyFill"),
  cleanFill: el("cleanFill"),
  bondFill: el("bondFill"),

  hungerVal: el("hungerVal"),
  happyVal: el("happyVal"),
  energyVal: el("energyVal"),
  cleanVal: el("cleanVal"),
  bondVal: el("bondVal"),

  nameBtn: el("nameBtn"),
  feedBtn: el("feedBtn"),
  treatBtn: el("treatBtn"),
  playBtn: el("playBtn"),
  cleanBtn: el("cleanBtn"),
  medicineBtn: el("medicineBtn"),
  sleepBtn: el("sleepBtn"),
  walkBtn: el("walkBtn"),
  shareBtn: el("shareBtn"),
  resetBtn: el("resetBtn"),
  codeBtn: el("codeBtn"),

  outfitChips: el("outfitChips"),
  bgChips: el("bgChips"),

  trickHint: el("trickHint"),
  trickSitBtn: el("trickSitBtn"),
  trickRollBtn: el("trickRollBtn"),
  trickHiBtn: el("trickHiBtn"),
  trainBtn: el("trainBtn"),

  diaryBox: el("diaryBox"),

  startGameBtn: el("startGameBtn"),
  arena: el("arena"),
  treat: el("treat"),
  scorePill: el("scorePill"),
  roundPill: el("roundPill"),
  gameMsg: el("gameMsg"),
};

/* Storage */
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

/* UX helpers */
function log(msg) {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  ui.log.textContent = `${time} , ${msg}`;
}
function speak(msg) {
  ui.speech.textContent = msg;
}

function persona() {
  return PERSONALITIES.find((p) => p.id === state.personaId) || PERSONALITIES[0];
}

function stageFromAge() {
  const ageHrs = (nowMs() - state.bornAt) / 36e5;
  if (ageHrs < 1) return "Egg";
  if (ageHrs < 8) return "Baby";
  if (ageHrs < 36) return "Teen";
  return "Adult";
}

function overallNeed() {
  const hungerNeed = state.hunger;
  const sadNeed = 100 - state.happiness;
  const tiredNeed = 100 - state.energy;
  const dirtyNeed = 100 - state.cleanliness;
  return Math.round((hungerNeed + sadNeed + tiredNeed + dirtyNeed) / 4);
}

function moodLabel() {
  if (state.asleep) return "😴 Sleeping";
  if (state.refuses) return "😤 Grumpy";
  const need = overallNeed();
  if (need > 70) return "😟 Needs you";
  if (need > 45) return "🙂 Okay";
  return "😍 Thriving";
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
  if (state.refuses) return "ಠ_ಠ";
  const need = overallNeed();
  if (need > 80) return "ಥ_ಥ";
  if (need > 60) return "•︵•";
  if (need > 40) return "•ᴗ•";
  return "ᵔᴗᵔ";
}

function setFill(fillEl, pct, base = "140,255,223") {
  fillEl.style.width = `${clamp(pct, 0, 100)}%`;
  fillEl.style.background = `rgba(${base}, ${0.30 + (pct / 100) * 0.55})`;
}

function applyBackground() {
  const bg = state.background;
  const map = {
    aurora: [
      "radial-gradient(700px 500px at 30% 20%, rgba(140,255,223,0.20), transparent 60%)",
      "radial-gradient(900px 600px at 80% 30%, rgba(180,140,255,0.18), transparent 60%)",
    ],
    park: [
      "radial-gradient(700px 500px at 30% 20%, rgba(160,255,160,0.14), transparent 60%)",
      "radial-gradient(900px 600px at 70% 40%, rgba(120,255,200,0.12), transparent 60%)",
    ],
    kitchen: [
      "radial-gradient(700px 500px at 25% 25%, rgba(255,220,160,0.14), transparent 60%)",
      "radial-gradient(900px 600px at 80% 40%, rgba(255,180,120,0.10), transparent 60%)",
    ],
    beach: [
      "radial-gradient(700px 500px at 25% 25%, rgba(150,220,255,0.14), transparent 60%)",
      "radial-gradient(900px 600px at 80% 40%, rgba(255,240,180,0.10), transparent 60%)",
    ],
  };
  const layers = map[bg] || map.aurora;
  document.body.style.background = `${layers[0]}, ${layers[1]}, var(--bg)`;
}

function outfitPrefix() {
  const o = state.outfit;
  if (o === "bow") return "🎀 ";
  if (o === "cap") return "🧢 ";
  if (o === "hoodie") return "🧥 ";
  return "";
}

/* Evolution */
function computeCareProfile() {
  const cleanScore = state.cleanliness;
  const happyScore = state.happiness;
  const bondScore = state.bond;
  const neglectScore = overallNeed(); // higher is worse
  return { cleanScore, happyScore, bondScore, neglectScore };
}

function pickEvolution() {
  if (state.stage !== "Adult") return "none";
  const { cleanScore, happyScore, bondScore, neglectScore } = computeCareProfile();

  if (neglectScore > 70) return "gremlin";
  if (bondScore >= 70 && neglectScore < 55) return "buddy";
  if (cleanScore >= 80 && neglectScore < 60) return "fancy";
  if (happyScore >= 80 && neglectScore < 60) return "goofy";
  return "buddy";
}

/* Routine, streak, diary */
function updateStreak() {
  const today = dayKey();
  if (!state.lastVisitDay) {
    state.lastVisitDay = today;
    state.streak = 1;
    return;
  }
  if (state.lastVisitDay === today) return;

  const prev = new Date(state.lastVisitDay);
  const cur = new Date(today);
  const diffDays = Math.round((cur - prev) / 86400000);

  if (diffDays === 1) state.streak = clamp(state.streak + 1, 1, 999);
  else state.streak = 1;

  state.lastVisitDay = today;
}

function maybeAddDiaryEntry() {
  const today = dayKey();
  if (state.lastDiaryDay === today) return;

  const p = persona().id;
  const mood = moodLabel();
  const snippets = {
    sweet: [
      "I liked seeing you today. I feel safe when you check on me.",
      "I was thinking about you. Thank you for being gentle with me.",
    ],
    chaos: [
      "I zoomed around in my head all day. Next time, more games please!",
      "I want to cause a tiny amount of harmless trouble. Love you.",
    ],
    foodie: [
      "I dreamt about snacks. Not sure if that was you, but thanks in advance.",
      "My ideal day is you, me, and unlimited treats. Just saying.",
    ],
    shy: [
      "I’m still learning you, but I’m starting to trust you more.",
      "Quiet day. I was happy you came back.",
    ],
  };

  const pick = snippets[p][Math.floor(Math.random() * snippets[p].length)];
  const entry = {
    day: today,
    text: `${mood}. ${pick}`,
  };

  state.diary.unshift(entry);
  state.diary = state.diary.slice(0, 14);
  state.lastDiaryDay = today;
}

function maybeRoutineHint() {
  const today = dayKey();
  if (state.lastRoutineHintDay === today) return;

  const hr = new Date().getHours();
  if (hr >= 6 && hr <= 10) {
    speak("Good morning ☀️ Feed me, then maybe a quick walk?");
    log("Morning routine hint");
    state.lastRoutineHintDay = today;
  } else if (hr >= 19 && hr <= 23) {
    speak("It’s getting late. A clean up and sleep would be lovely 😴");
    log("Bedtime routine hint");
    state.lastRoutineHintDay = today;
  }
}

/* Needs ticking */
function tick(deltaMs) {
  const minutes = deltaMs / 60000;
  if (minutes <= 0) return;

  const p = persona().id;

  const asleepFactor = state.asleep ? 0.35 : 1.0;

  let hungerRate = 0.18;
  let happyDrop = 0.12;
  let energyRate = state.asleep ? -0.50 : 0.16;
  let cleanDrop = 0.10;

  if (p === "foodie") hungerRate *= 1.18;
  if (p === "sweet") happyDrop *= 1.10;
  if (p === "chaos") cleanDrop *= 1.20;
  if (p === "shy") happyDrop *= 0.92;

  hungerRate *= asleepFactor;
  happyDrop *= asleepFactor;
  cleanDrop *= asleepFactor;

  state.hunger = clamp(state.hunger + minutes * hungerRate, 0, 100);
  state.happiness = clamp(state.happiness - minutes * happyDrop, 0, 100);
  state.energy = clamp(state.energy - minutes * energyRate, 0, 100);
  state.cleanliness = clamp(state.cleanliness - minutes * cleanDrop, 0, 100);

  const need = overallNeed();

  // Refusal logic, gets grumpy if ignored, resolves when cared for
  if (!state.refuses && !state.asleep && need > 82 && Math.random() < (minutes / 14)) {
    state.refuses = true;
  }
  if (state.refuses && need < 65) {
    state.refuses = false;
  }

  // Sickness chance when needs are bad
  if (!state.sick && need > 80) {
    const chance = Math.min(0.20, (need - 80) / 100) * (minutes / 6);
    if (Math.random() < chance) state.sick = true;
  }

  // Recover slowly if cared for
  if (state.sick && need < 55 && Math.random() < (minutes / 30)) {
    state.sick = false;
  }

  state.stage = stageFromAge();
  state.evolution = pickEvolution();

  state.lastTickAt = nowMs();
}

function catchUp() {
  const delta = nowMs() - state.lastTickAt;
  tick(delta);
  updateStreak();
  maybeAddDiaryEntry();
  maybeRoutineHint();
  save();
  render();
}

/* Inventory and actions */
function actionGuard(kind = "normal") {
  if (state.asleep && kind !== "wake") {
    speak("Shhh... I’m sleeping. Wake me first ☀️");
    log("Tried to interact while sleeping");
    return false;
  }
  if (state.refuses && kind !== "care") {
    speak("Nope. I’m grumpy. Feed me or clean me first 😤");
    log("Pet refused action");
    return false;
  }
  return true;
}

function bondGain(n) {
  state.bond = clamp(state.bond + n, 0, 100);
}

function feed() {
  if (!actionGuard("care")) return;

  const p = persona().id;
  const hungry = state.hunger;

  state.hunger = clamp(state.hunger - 22, 0, 100);
  state.cleanliness = clamp(state.cleanliness - 6, 0, 100);
  state.happiness = clamp(state.happiness + (p === "foodie" ? 7 : 4), 0, 100);
  bondGain(2);

  speak(hungry > 60 ? "Yum! I was starving 😭🍎" : "Snack time! 🍎");
  log("Fed your pet");
  save();
  render();
}

function treatAction() {
  if (!actionGuard("care")) return;
  if (state.inventory.snacks <= 0) {
    speak("No treats left. Go for a walk to find snacks 🍪");
    log("No treats in inventory");
    return;
  }

  state.inventory.snacks -= 1;
  state.happiness = clamp(state.happiness + 12, 0, 100);
  state.hunger = clamp(state.hunger - 10, 0, 100);
  bondGain(4);

  speak("TREAT?! You’re my favorite human 🍪😍");
  log("Gave a treat");
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

  const p = persona().id;
  const extra = p === "chaos" ? 6 : 0;

  state.happiness = clamp(state.happiness + 16 + extra, 0, 100);
  state.energy = clamp(state.energy - 12, 0, 100);
  state.hunger = clamp(state.hunger + 6, 0, 100);
  state.cleanliness = clamp(state.cleanliness - (p === "chaos" ? 6 : 3), 0, 100);
  bondGain(3);

  speak("Yay! Again! 🎾");
  log("Played together");
  save();
  render();
}

function clean() {
  if (!actionGuard("care")) return;

  state.cleanliness = clamp(state.cleanliness + 30, 0, 100);
  state.happiness = clamp(state.happiness - 2, 0, 100);
  bondGain(2);

  speak("All fresh! ✨🛁");
  log("Cleaned your pet");
  save();
  render();
}

function medicine() {
  if (!actionGuard("care")) return;

  if (!state.sick) {
    speak("I’m not sick, but thank you for caring ❤️");
    log("Tried medicine while healthy");
    return;
  }
  if (state.inventory.medicine <= 0) {
    speak("No medicine left. Walks might find some 💊");
    log("No medicine in inventory");
    return;
  }

  state.inventory.medicine -= 1;
  state.sick = false;
  state.happiness = clamp(state.happiness + 6, 0, 100);
  bondGain(5);

  speak("I feel better already. You’re the best 💊");
  log("Gave medicine");
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

function walk() {
  if (!actionGuard()) return;

  if (state.energy < 18) {
    speak("I’m too tired for a walk. Sleep first 😴");
    log("Too tired to walk");
    return;
  }

  state.energy = clamp(state.energy - 14, 0, 100);
  state.hunger = clamp(state.hunger + 6, 0, 100);
  state.happiness = clamp(state.happiness + 10, 0, 100);
  bondGain(4);

  const roll = Math.random();
  let found = "";

  if (roll < 0.35) {
    state.inventory.snacks += 1;
    found = "Found a snack 🍪";
  } else if (roll < 0.55) {
    state.inventory.toys += 1;
    found = "Found a toy 🧸";
  } else if (roll < 0.68) {
    state.inventory.medicine += 1;
    found = "Found medicine 💊";
  } else {
    found = "Saw something interesting and got excited ✨";
  }

  speak(`Walk time! ${found}`);
  log(`Went for a walk. ${found}`);
  save();
  render();
}

function namePet() {
  const current = state.name || "";
  const name = prompt("What’s your pet’s name?", current);
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed) return;

  state.name = trimmed.slice(0, 16);
  speak(`Hi! I’m ${state.name} 🐾`);
  log(`Named pet: ${state.name}`);
  save();
  render();
}

function enterCode() {
  const code = prompt("Enter secret code");
  if (!code) return;
  const c = code.trim().toLowerCase();

  if (c === "treatsfrommom" || c === "goodgirl" || c === "goodboy") {
    state.inventory.snacks += 3;
    bondGain(3);
    speak("Secret gift unlocked! Treat stash boosted 🍪🍪🍪");
    log("Secret code redeemed, treats added");
  } else {
    speak("Hmm, that code didn’t work 😅");
    log("Invalid secret code");
  }

  save();
  render();
}

/* Tricks and training */
function trickUnlocked(id) {
  const t = TRICKS.find((x) => x.id === id);
  return t ? state.bond >= t.unlockBond : false;
}

function doTrick(id) {
  if (!actionGuard()) return;

  if (!trickUnlocked(id)) {
    speak("Not yet! Train with me a bit more 🐾");
    log("Tried locked trick");
    return;
  }

  if (state.energy < 12) {
    speak("Too tired for tricks. Nap first 😴");
    log("Too tired for trick");
    return;
  }

  state.energy = clamp(state.energy - 8, 0, 100);
  state.happiness = clamp(state.happiness + 8, 0, 100);
  bondGain(2);

  const reactions = {
    sit: ["I sit like a pro. Treat please?", "Sitting! I’m so polite."],
    roll: ["ROLL! Did you see that?", "I rolled. I’m basically a star."],
    hi: ["High five! That felt cool.", "High five! We’re a team."],
  };

  const lines = reactions[id] || ["Yay!"];
  speak(lines[Math.floor(Math.random() * lines.length)]);
  log(`Did trick: ${id}`);
  save();
  render();
}

function train() {
  if (!actionGuard()) return;

  if (state.energy < 16) {
    speak("Training is hard work. I need sleep 😴");
    log("Too tired to train");
    return;
  }

  state.energy = clamp(state.energy - 10, 0, 100);
  state.happiness = clamp(state.happiness + 6, 0, 100);
  bondGain(6);

  speak("Training time! I’m learning you 🐾");
  log("Trained bond and tricks");
  save();
  render();
}

/* Unlock UI */
function renderChips(container, list, selectedId, onSelect) {
  container.innerHTML = "";
  list.forEach((item) => {
    const unlocked = state.bond >= item.unlockBond;
    if (!unlocked) return;

    const b = document.createElement("button");
    b.className = "chip" + (item.id === selectedId ? " on" : "");
    b.textContent = item.label;
    b.addEventListener("click", () => onSelect(item.id));
    container.appendChild(b);
  });
}

function updateOutfit(id) {
  state.outfit = id;
  speak("Cute choice ✨");
  log(`Outfit changed: ${id}`);
  save();
  render();
}

function updateBg(id) {
  state.background = id;
  applyBackground();
  speak("New room vibe unlocked ✨");
  log(`Background changed: ${id}`);
  save();
  render();
}

/* Share card */
function shareCard() {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");

  const name = state.name ? state.name : "Your Pet";
  const stage = `${state.stage}${state.evolution !== "none" ? " , " + state.evolution : ""}`;
  const mood = moodLabel();
  const p = persona().name;
  const stats = [
    `Hunger: ${state.hunger}`,
    `Happiness: ${state.happiness}`,
    `Energy: ${state.energy}`,
    `Clean: ${state.cleanliness}`,
    `Bond: ${state.bond}`,
    `Streak: ${state.streak}`,
  ];

  ctx.fillStyle = "#0b0f1a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const g = ctx.createRadialGradient(340, 260, 40, 340, 260, 900);
  g.addColorStop(0, "rgba(140,255,223,0.18)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  roundRect(ctx, 90, 90, 900, 900, 48, true, true);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 64px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`${outfitPrefix()}${name}`, 150, 190);

  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.font = "500 32px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Stage: ${stage}`, 150, 245);
  ctx.fillText(`Personality: ${p}`, 150, 290);
  ctx.fillText(`Mood: ${mood}`, 150, 335);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 120px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(ui.petFace.textContent || "•ᴗ•", 150, 510);

  ctx.fillStyle = "rgba(255,255,255,0.80)";
  ctx.font = "600 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  stats.forEach((s, i) => ctx.fillText(s, 150, 590 + i * 52));

  ctx.fillStyle = "rgba(255,255,255,0.60)";
  ctx.font = "500 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Pet Pal", 820, 940);

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}_petpal.png`;
  a.click();

  speak("Share card saved 📸");
  log("Generated share card");
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/* Render diary */
function renderDiary() {
  ui.diaryBox.innerHTML = "";
  if (!state.diary.length) {
    ui.diaryBox.innerHTML = `<div class="entry"><div class="date">No entries yet</div><div>Come back tomorrow for a new diary note.</div></div>`;
    return;
  }
  state.diary.forEach((e) => {
    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `<div class="date">${e.day}</div><div>${escapeHtml(e.text)}</div>`;
    ui.diaryBox.appendChild(div);
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* Render */
function render() {
  state.stage = stageFromAge();
  state.evolution = pickEvolution();

  applyBackground();

  const evoText =
    state.evolution !== "none"
      ? ` , ${EVOLUTIONS.find((e) => e.id === state.evolution)?.name || state.evolution}`
      : "";

  ui.petName.textContent = (outfitPrefix() + (state.name ? state.name : "Your Pet")).trim();
  ui.petStage.textContent = `Stage: ${state.stage}${evoText}`;
  ui.petPersona.textContent = `Personality: ${persona().name} , ${persona().vibe}`;

  ui.moodBadge.textContent = moodLabel();
  ui.healthBadge.textContent = healthLabel();
  ui.streakBadge.textContent = `🔥 Streak: ${state.streak}`;

  ui.petFace.textContent = faceForState();

  ui.hungerVal.textContent = state.hunger;
  ui.happyVal.textContent = state.happiness;
  ui.energyVal.textContent = state.energy;
  ui.cleanVal.textContent = state.cleanliness;
  ui.bondVal.textContent = state.bond;

  // Hunger is inverted visually
  setFill(ui.hungerFill, 100 - state.hunger, "255,180,120");
  setFill(ui.happyFill, state.happiness, "140,255,223");
  setFill(ui.energyFill, state.energy, "180,140,255");
  setFill(ui.cleanFill, state.cleanliness, "160,255,160");
  setFill(ui.bondFill, state.bond, "255,220,160");

  ui.flies.hidden = state.cleanliness >= 30;

  const last = new Date(state.lastTickAt);
  ui.timePill.textContent = `⏳ Updated: ${last.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  ui.sleepBtn.textContent = state.asleep ? "Wake ☀️" : "Sleep 😴";

  ui.feedBtn.disabled = state.asleep;
  ui.treatBtn.disabled = state.asleep;
  ui.playBtn.disabled = state.asleep;
  ui.cleanBtn.disabled = state.asleep;
  ui.medicineBtn.disabled = state.asleep;
  ui.walkBtn.disabled = state.asleep;

  ui.scorePill.textContent = `Score: ${state.score}`;
  ui.roundPill.textContent = `Round: ${state.round}`;

  renderChips(ui.outfitChips, ITEMS.outfits, state.outfit, updateOutfit);
  renderChips(ui.bgChips, ITEMS.backgrounds, state.background, updateBg);

  ui.trickHint.textContent =
    `Unlocked at bond: Sit ${TRICKS[0].unlockBond}, Roll ${TRICKS[1].unlockBond}, High Five ${TRICKS[2].unlockBond}`;

  ui.trickSitBtn.disabled = !trickUnlocked("sit") || state.asleep;
  ui.trickRollBtn.disabled = !trickUnlocked("roll") || state.asleep;
  ui.trickHiBtn.disabled = !trickUnlocked("hi") || state.asleep;

  renderDiary();
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
    bondGain(2);
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
ui.treatBtn.addEventListener("click", treatAction);
ui.playBtn.addEventListener("click", play);
ui.cleanBtn.addEventListener("click", clean);
ui.medicineBtn.addEventListener("click", medicine);
ui.sleepBtn.addEventListener("click", toggleSleep);
ui.walkBtn.addEventListener("click", walk);
ui.shareBtn.addEventListener("click", shareCard);
ui.codeBtn.addEventListener("click", enterCode);

ui.trickSitBtn.addEventListener("click", () => doTrick("sit"));
ui.trickRollBtn.addEventListener("click", () => doTrick("roll"));
ui.trickHiBtn.addEventListener("click", () => doTrick("hi"));
ui.trainBtn.addEventListener("click", train);

ui.resetBtn.addEventListener("click", () => {
  const ok = confirm("Reset pet? This clears progress on this device.");
  if (!ok) return;
  state = defaultState();
  save();
  render();
  speak("Hi! Name me 🐣");
  log("Pet reset");
});

ui.startGameBtn.addEventListener("click", startGame);

/* Startup */
catchUp();
setInterval(catchUp, 15_000);

if (!state.name) {
  speak("Hi! Name me 🐣");
  log("Welcome! Name your pet to begin");
} else {
  speak(`Hi ${state.name}’s human 🐾`);
  log("Loaded saved pet");
}
