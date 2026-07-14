/* Puzzles: adaptive addition/subtraction, multiplication/division, missing numbers. */

const Puzzles = (() => {
  const R = (lo, hi) => Data.rand(lo, hi);

  // ---- level tables ----
  const ADD_LEVELS = [
    { name: "Little sums",        gen: () => pair(R(2, 9), R(2, 9)) },
    { name: "Tens and ones",      gen: () => pair(R(10, 99), R(2, 9)) },
    { name: "Two-digit adding",   gen: () => pair(R(10, 99), R(10, 99), true) },
    { name: "Into the hundreds",  gen: () => pair(R(100, 999), R(10, 99), true) },
    { name: "Big number adding",  gen: () => pair(R(100, 999), R(100, 999), true) },
    { name: "Thousand land",      gen: () => pair(R(1000, 4999), R(100, 999), true) },
  ];
  // from level 3, ~30% of "add" questions are subtraction
  function pair(a, b, allowSub = false) {
    if (allowSub && Math.random() < 0.3) {
      const big = Math.max(a, b), small = Math.min(a, b);
      return { text: `${big} − ${small}`, answer: big - small, op: "sub", a: big, b: small };
    }
    return { text: `${a} + ${b}`, answer: a + b, op: "add", a, b };
  }

  const MUL_LEVELS = [
    { name: "First times tables", gen: () => mul(Data.pick([2, 5, 10]), R(1, 5)) },
    { name: "Tables to six",      gen: () => mul(R(2, 6), R(2, 10)) },
    { name: "All twelve tables",  gen: () => mul(R(2, 12), R(2, 12)) },
    { name: "Beyond twelve",      gen: () => Math.random() < 0.3 ? sq(R(2, 15)) : mul(R(13, 15), R(2, 12)) },
    { name: "Big multiplying",    gen: () => mul(R(13, 49), R(2, 9)) },
    { name: "Sharing (division)", gen: () => div(R(2, 12), R(2, 12)) },
  ];
  const mul = (a, b) => ({ text: `${a} × ${b}`, answer: a * b, op: "mul", a, b });
  const sq  = (a)    => ({ text: `${a} × ${a}`, answer: a * a, op: "mul", a, b: a });
  const div = (a, b) => ({ text: `${a * b} ÷ ${a}`, answer: b, op: "div", a, b });

  // missing-number questions borrow difficulty from the other two tracks
  function genMissing() {
    const lvl = App.state.tracks.missing.level;
    if (Math.random() < 0.5) {
      const a = R(2, lvl * 12), ans = R(2, lvl * 12);
      return { text: `${a} + ▢ = ${a + ans}`, answer: ans, op: "missing" };
    }
    const b = R(2, Math.min(12, 2 + lvl * 2)), ans = R(2, Math.min(12, 2 + lvl * 2));
    return { text: `▢ × ${b} = ${ans * b}`, answer: ans, op: "missing", a: ans, b };
  }
  const MISSING_MAX = 5;

  // ---- round state ----
  let current = null;      // {text, answer, op, a, b, track}
  let entry = "";
  let misses = 0;
  let awaitingNext = false;

  const $q = () => document.getElementById("puzzle-question");
  const $a = () => document.getElementById("puzzle-answer");
  const $h = () => document.getElementById("puzzle-hint");
  const $f = () => document.getElementById("puzzle-feedback");

  function subtitle() {
    const t = App.state.tracks;
    return `${ADD_LEVELS[t.add.level - 1].name} · ${MUL_LEVELS[t.mul.level - 1].name}`;
  }

  function enter() { nextQuestion(true); }

  function nextQuestion(first = false) {
    if (!first && App.checkSession()) return;
    const t = App.state.tracks;
    // weighted rotation: add 40%, mul 40%, missing 20%
    const roll = Math.random();
    if (roll < 0.4) {
      current = ADD_LEVELS[t.add.level - 1].gen();
      current.track = "add";
    } else if (roll < 0.8) {
      current = MUL_LEVELS[t.mul.level - 1].gen();
      current.track = "mul";
    } else {
      current = genMissing();
      current.track = "missing";
    }
    entry = "";
    misses = 0;
    awaitingNext = false;
    $q().textContent = current.text.includes("=") ? current.text : `${current.text} = ?`;
    $a().textContent = " ";
    $a().className = "answer-display";
    $h().innerHTML = "";
    $f().textContent = " ";
    $f().className = "feedback-line";
    document.getElementById("puzzle-level-pill").textContent =
      current.track === "add" ? ADD_LEVELS[App.state.tracks.add.level - 1].name :
      current.track === "mul" ? MUL_LEVELS[App.state.tracks.mul.level - 1].name :
      "Missing number";
  }

  function showHint() {
    const h = $h();
    h.innerHTML = "";
    if ((current.op === "mul" || current.op === "missing") && current.a && current.b &&
        current.a <= 12 && current.b <= 12) {
      // dot array — rows light up in two colours to suggest skip counting
      const grid = document.createElement("div");
      grid.className = "dot-grid";
      grid.style.gridTemplateColumns = `repeat(${current.b}, 14px)`;
      for (let r = 0; r < current.a; r++)
        for (let c = 0; c < current.b; c++) {
          const d = document.createElement("span");
          d.className = "dot" + (r % 2 ? " alt" : "");
          grid.appendChild(d);
        }
      h.appendChild(grid);
      const cap = document.createElement("div");
      cap.textContent = `${current.a} rows of ${current.b}`;
      h.appendChild(cap);
    } else if (current.op === "mul") {
      h.textContent = splitHintMul(current.a, current.b);
    } else if (current.op === "add" || current.op === "sub") {
      h.textContent = splitHintAdd(current);
    } else if (current.op === "div") {
      h.textContent = `How many groups of ${current.a} make ${current.a * current.b}?`;
    } else {
      h.textContent = "What number fits in the box?";
    }
  }

  function splitHintMul(a, b) {
    const tensB = Math.floor(b / 10) * 10;
    if (tensB >= 10) return `Split it: ${a} × ${tensB} then ${a} × ${b - tensB}`;
    const tensA = Math.floor(a / 10) * 10;
    if (tensA >= 10) return `Split it: ${tensA} × ${b} then ${a - tensA} × ${b}`;
    return `Count up in ${Math.min(a, b)}s, ${Math.max(a, b)} times`;
  }
  function splitHintAdd(cur) {
    const { a, b, op } = cur;
    const sign = op === "sub" ? "−" : "+";
    if (b >= 10) {
      const tens = Math.floor(b / 10) * 10;
      return `Split it: ${a} ${sign} ${tens}, then ${sign} ${b - tens}`;
    }
    return `Count ${op === "sub" ? "back" : "on"} from ${a}`;
  }

  function check() {
    if (awaitingNext || entry === "") return;
    const guess = parseInt(entry, 10);
    if (guess === current.answer) {
      awaitingNext = true;
      $a().classList.add("good");
      $f().textContent = Data.pick(Data.praise);
      Sound.correct();
      const gotIsland = App.addStar();
      const maxLv = current.track === "add" ? ADD_LEVELS.length :
                    current.track === "mul" ? MUL_LEVELS.length : MISSING_MAX;
      App.recordResult(current.track, misses === 0, maxLv, lv => levelName(current.track, lv));
      setTimeout(() => nextQuestion(), gotIsland ? 600 : 1100);
    } else {
      misses += 1;
      entry = "";
      $a().textContent = " ";
      $a().classList.remove("oops");
      void $a().offsetWidth; // restart animation
      $a().classList.add("oops");
      if (misses === 1) {
        $f().textContent = Data.pick(Data.encourage);
        $f().className = "feedback-line soft";
        showHint();
      } else {
        // second miss: show the answer kindly, move on, no penalty messaging
        awaitingNext = true;
        $f().textContent = `It was ${current.answer}. Tricky one. Next!`;
        $f().className = "feedback-line soft";
        $a().textContent = current.answer;
        const maxLv = current.track === "add" ? ADD_LEVELS.length :
                      current.track === "mul" ? MUL_LEVELS.length : MISSING_MAX;
        App.recordResult(current.track, false, maxLv, lv => levelName(current.track, lv));
        setTimeout(() => nextQuestion(), 1800);
      }
    }
  }

  function levelName(track, lv) {
    if (track === "add") return `Adding: ${ADD_LEVELS[lv - 1].name}`;
    if (track === "mul") return `Times tables: ${MUL_LEVELS[lv - 1].name}`;
    return `Missing numbers: level ${lv}`;
  }

  function key(k) {
    if (k === "hint") { Sound.tap(); showHint(); return; }
    if (k === "check") { check(); return; }
    if (awaitingNext) return;
    Sound.tap();
    if (k === "back") entry = entry.slice(0, -1);
    else if (entry.length < 6) entry += k;
    $a().textContent = entry || " ";
    $a().className = "answer-display";
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("numpad").addEventListener("click", e => {
      const b = e.target.closest("button");
      if (b) key(b.dataset.key);
    });
  });

  return { enter, subtitle };
})();
