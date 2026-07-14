/* App shell: state, navigation, stars, islands, session timer, parent corner. */

const App = (() => {
  const SAVE_KEY = "numberworld-v1";
  const SESSION_MINUTES = 10;
  const STARS_PER_ISLAND = 25;

  const defaultState = () => ({
    name: "",
    sound: true,
    stars: 0,
    tracks: {
      add: { level: 1, history: [] },
      mul: { level: 1, history: [] },
      missing: { level: 1, history: [] },
      words: { level: 1, history: [] },
    },
    islandsUnlocked: 0,
    drawings: [],
  });

  let state = load();
  let sessionStart = null;
  let breakShown = false;

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { /* fresh start */ }
    return defaultState();
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* storage full */ }
  }

  // ---------- navigation ----------
  function go(name) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(`screen-${name}`).classList.add("active");
    if (name === "home") renderHome();
    if (name === "puzzles") Puzzles.enter();
    if (name === "words") Words.enter();
    if (name === "draw") Draw.enter();
    if (name !== "home" && !sessionStart) sessionStart = Date.now();
  }

  // ---------- stars & islands ----------
  function addStar() {
    state.stars += 1;
    save();
    document.querySelectorAll("#star-count, .star-count-live").forEach(el => (el.textContent = state.stars));
    const due = Math.floor(state.stars / STARS_PER_ISLAND);
    if (due > state.islandsUnlocked && state.islandsUnlocked < Data.islands.length) {
      state.islandsUnlocked = due;
      save();
      const isl = Data.islands[due - 1];
      celebrate(isl.emoji, `You found ${isl.name}!`, isl.fact);
      Sound.levelUp();
      return true; // caller can skip its own celebration
    }
    return false;
  }

  // ---------- adaptive engine (shared by tracks) ----------
  // Targets ~80% success: 4/5 recent correct → level up; ≤1/5 → gently step down.
  function recordResult(trackName, correct, maxLevel, levelUpMsg) {
    const t = state.tracks[trackName];
    t.history.push(correct);
    if (t.history.length > 5) t.history.shift();
    if (t.history.length === 5) {
      const wins = t.history.filter(Boolean).length;
      if (wins >= 4 && t.level < maxLevel) {
        t.level += 1;
        t.history = [];
        save();
        Sound.levelUp();
        celebrate("🔓", "You reached a new level!", levelUpMsg(t.level));
        return "up";
      }
      if (wins <= 1 && t.level > 1) {
        t.level -= 1;   // silent — no "you failed" moment
        t.history = [];
      }
    }
    save();
    return null;
  }

  // ---------- celebration overlay ----------
  function celebrate(emoji, title, text) {
    document.getElementById("celebrate-emoji").textContent = emoji;
    document.getElementById("celebrate-title").textContent = title;
    document.getElementById("celebrate-text").textContent = text;
    document.getElementById("celebrate-overlay").classList.add("active");
  }

  // ---------- session pacing ----------
  // Called at natural boundaries (between questions), never mid-task.
  function checkSession() {
    if (!sessionStart || breakShown) return false;
    if (Date.now() - sessionStart > SESSION_MINUTES * 60 * 1000) {
      breakShown = true;
      document.getElementById("break-text").textContent =
        `You earned ${state.stars} stars altogether. Time for a stretch?`;
      document.getElementById("break-overlay").classList.add("active");
      return true;
    }
    return false;
  }

  // ---------- home ----------
  function renderHome() {
    const g = document.getElementById("greeting");
    g.textContent = state.name ? `Hello, ${state.name}!` : "Number World";
    document.getElementById("star-count").textContent = state.stars;
    document.getElementById("sub-puzzles").textContent = Puzzles.subtitle();
    document.getElementById("sub-words").textContent = Words.subtitle();

    const row = document.getElementById("islands-row");
    row.innerHTML = "";
    Data.islands.forEach((isl, i) => {
      const el = document.createElement("button");
      el.className = "island" + (i < state.islandsUnlocked ? "" : " locked");
      el.innerHTML = `<span class="isl-emoji">${i < state.islandsUnlocked ? isl.emoji : "❔"}</span><span>${i < state.islandsUnlocked ? isl.name : "· · ·"}</span>`;
      if (i < state.islandsUnlocked) {
        el.addEventListener("click", () => { celebrate(isl.emoji, isl.name, isl.fact); Speech.say(isl.fact); });
      }
      row.appendChild(el);
    });
  }

  // ---------- parent corner ----------
  const trackLabels = { add: "Adding", mul: "Times tables", missing: "Missing numbers", words: "Words & reading" };
  function renderParent() {
    document.getElementById("name-input").value = state.name;
    document.getElementById("sound-toggle").checked = state.sound;
    const rep = document.getElementById("progress-report");
    rep.innerHTML =
      `<b>${state.stars}</b> stars earned · <b>${state.islandsUnlocked}</b> of ${Data.islands.length} islands found<br>` +
      Object.entries(state.tracks)
        .map(([k, t]) => `${trackLabels[k]}: <b>level ${t.level}</b>`)
        .join("<br>");
  }

  function wireUp() {
    // nav buttons
    document.querySelectorAll("[data-go]").forEach(btn =>
      btn.addEventListener("click", () => { Sound.tap(); go(btn.dataset.go); })
    );

    // overlays
    document.getElementById("celebrate-continue").addEventListener("click", () => {
      document.getElementById("celebrate-overlay").classList.remove("active");
    });
    document.getElementById("break-done").addEventListener("click", () => {
      document.getElementById("break-overlay").classList.remove("active");
      sessionStart = null;
      breakShown = false;
      go("home");
    });
    document.getElementById("break-more").addEventListener("click", () => {
      document.getElementById("break-overlay").classList.remove("active");
      sessionStart = Date.now() - (SESSION_MINUTES - 5) * 60 * 1000; // 5 more minutes
      breakShown = false;
    });

    // parent gate: hold 3 seconds
    const gate = document.getElementById("gate-overlay");
    const hold = document.getElementById("gate-hold");
    const fill = document.createElement("span");
    fill.className = "fill";
    hold.appendChild(fill);
    let holdTimer = null;
    const startHold = e => {
      e.preventDefault();
      fill.style.transition = "transform 3s linear";
      fill.style.transform = "scaleX(1)";
      holdTimer = setTimeout(() => {
        gate.classList.remove("active");
        renderParent();
        go("parent");
        endHold();
      }, 3000);
    };
    const endHold = () => {
      clearTimeout(holdTimer);
      fill.style.transition = "transform 0.2s ease";
      fill.style.transform = "scaleX(0)";
    };
    hold.addEventListener("pointerdown", startHold);
    hold.addEventListener("pointerup", endHold);
    hold.addEventListener("pointerleave", endHold);
    document.getElementById("parent-btn").addEventListener("click", () => gate.classList.add("active"));
    document.getElementById("gate-cancel").addEventListener("click", () => gate.classList.remove("active"));

    // parent settings
    document.getElementById("name-input").addEventListener("input", e => {
      state.name = e.target.value.trim();
      save();
    });
    document.getElementById("sound-toggle").addEventListener("change", e => {
      state.sound = e.target.checked;
      Sound.setEnabled(state.sound);
      save();
    });
    document.getElementById("reset-btn").addEventListener("click", () => {
      if (confirm("Reset all progress? This cannot be undone.")) {
        state = defaultState();
        save();
        renderParent();
        renderHome();
      }
    });

    Sound.setEnabled(state.sound);
    document.querySelectorAll(".star-count-live").forEach(el => (el.textContent = state.stars));
    renderHome();
  }

  document.addEventListener("DOMContentLoaded", wireUp);

  return {
    get state() { return state; },
    save, go, addStar, recordResult, celebrate, checkSession,
  };
})();
