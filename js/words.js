/* Words: number reading & spelling — the literacy bridge.
   Mode rotation: match numeral→word, build the word from letter tiles, story sums. */

const Words = (() => {
  const R = (lo, hi) => Data.rand(lo, hi);

  const LEVELS = [
    { name: "Numbers to ten",     range: [1, 10],  modes: ["match", "build"] },
    { name: "The teens",          range: [11, 20], modes: ["match", "build"] },
    { name: "Up to ninety-nine",  range: [21, 99], modes: ["match", "build", "story"] },
    { name: "Story sums",         range: [21, 99], modes: ["match", "story", "story"] },
    { name: "Hundreds in words",  range: [100, 999], modes: ["match", "story"] },
  ];

  let current = null; // { mode, answer, ... }
  let misses = 0;
  let awaitingNext = false;
  let entry = "";

  const $stage = () => document.getElementById("words-stage");
  const $f = () => document.getElementById("words-feedback");

  const lvl = () => LEVELS[App.state.tracks.words.level - 1];
  function subtitle() { return lvl().name; }

  function enter() { next(true); }

  function next(first = false) {
    if (!first && App.checkSession()) return;
    misses = 0;
    awaitingNext = false;
    entry = "";
    $f().textContent = " ";
    $f().className = "feedback-line";
    document.getElementById("words-level-pill").textContent = lvl().name;
    const mode = Data.pick(lvl().modes);
    if (mode === "match") renderMatch();
    else if (mode === "build") renderBuild();
    else renderStory();
  }

  function done(correct) {
    App.recordResult("words", correct, LEVELS.length, lv => `Words: ${LEVELS[lv - 1].name}`);
  }

  // ---------- mode: match numeral to word ----------
  function renderMatch() {
    const [lo, hi] = lvl().range;
    const n = R(lo, hi);
    const word = Data.numToWords(n);
    // two distractors: nearby numbers, so wrong options look plausible
    const opts = new Set([word]);
    while (opts.size < 3) {
      const d = Math.max(1, n + R(-9, 9));
      if (d !== n) opts.add(Data.numToWords(d));
    }
    current = { mode: "match", answer: word };

    $stage().innerHTML = `
      <div class="big-number">${n}</div>
      <button class="speak-btn" id="w-speak">🔈 hear it</button>
      <div class="word-options" id="w-opts"></div>`;
    document.getElementById("w-speak").addEventListener("click", () => Speech.say(String(n)));

    const box = document.getElementById("w-opts");
    Data.shuffle([...opts]).forEach(w => {
      const b = document.createElement("button");
      b.className = "word-option";
      b.textContent = w;
      b.addEventListener("click", () => {
        if (awaitingNext) return;
        if (w === current.answer) {
          awaitingNext = true;
          b.classList.add("good");
          $f().textContent = Data.pick(Data.praise);
          Sound.correct();
          Speech.say(w);
          const gotIsland = App.addStar();
          done(misses === 0);
          setTimeout(() => next(), gotIsland ? 600 : 1400);
        } else {
          misses += 1;
          b.classList.add("oops");
          $f().textContent = "Not that one. Listen again.";
          $f().className = "feedback-line soft";
          Speech.say(String(n));
          if (misses >= 2) {
            awaitingNext = true;
            [...box.children].find(x => x.textContent === current.answer).classList.add("good");
            done(false);
            setTimeout(() => next(), 1800);
          }
        }
      });
      box.appendChild(b);
    });
  }

  // ---------- mode: build the word from letter tiles ----------
  function renderBuild() {
    const [lo, hi] = lvl().range;
    const n = R(lo, Math.min(hi, 99));
    const word = Data.numToWords(n);
    const chars = word.split("");
    current = { mode: "build", answer: word, pos: 0 };

    $stage().innerHTML = `
      <div class="big-number">${n}</div>
      <button class="speak-btn" id="w-speak">🔈 hear it</button>
      <div class="letter-slots" id="w-slots"></div>
      <div class="letter-tiles" id="w-tiles"></div>`;
    document.getElementById("w-speak").addEventListener("click", () => Speech.say(word));
    Speech.say(word);

    const slots = document.getElementById("w-slots");
    chars.forEach(ch => {
      const s = document.createElement("div");
      if (ch === "-" || ch === " ") {
        s.className = "letter-slot gap";
        s.dataset.auto = ch;
      } else {
        s.className = "letter-slot";
      }
      slots.appendChild(s);
    });

    // letters only (hyphens/spaces auto-fill), shuffled
    const letters = chars.filter(c => c !== "-" && c !== " ");
    const tiles = document.getElementById("w-tiles");
    Data.shuffle(letters).forEach(ch => {
      const t = document.createElement("button");
      t.className = "letter-tile";
      t.textContent = ch;
      t.addEventListener("click", () => tapTile(t, ch, chars, slots));
      tiles.appendChild(t);
    });
  }

  function tapTile(tile, ch, chars, slots) {
    if (awaitingNext) return;
    // advance past auto-fill characters
    while (chars[current.pos] === "-" || chars[current.pos] === " ") {
      slots.children[current.pos].textContent = chars[current.pos] === "-" ? "‑" : "";
      current.pos += 1;
    }
    if (ch === chars[current.pos]) {
      Sound.tap();
      const slot = slots.children[current.pos];
      slot.textContent = ch;
      slot.classList.add("filled");
      tile.classList.add("used");
      current.pos += 1;
      while (chars[current.pos] === "-" || chars[current.pos] === " ") {
        slots.children[current.pos].textContent = chars[current.pos] === "-" ? "‑" : "";
        current.pos += 1;
      }
      if (current.pos >= chars.length) {
        awaitingNext = true;
        $f().textContent = Data.pick(Data.praise);
        Sound.correct();
        Speech.say(current.answer);
        const gotIsland = App.addStar();
        done(misses === 0);
        setTimeout(() => next(), gotIsland ? 600 : 1400);
      }
    } else {
      misses += 1;
      tile.classList.remove("oops");
      void tile.offsetWidth;
      tile.classList.add("oops");
      $f().textContent = "That letter comes later. Which one is next?";
      $f().className = "feedback-line soft";
    }
  }

  // ---------- mode: story sums (read + solve) ----------
  function renderStory() {
    const kind = Data.pick(["add", "sub", "mul"]);
    const level = App.state.tracks.words.level;
    let a, b, answer;
    if (kind === "mul") { a = R(2, 5); b = R(2, 5); answer = a * b; }
    else if (kind === "sub") { a = R(5, 8 + level * 4); b = R(2, Math.min(a - 1, 9)); answer = a - b; }
    else { a = R(3, 8 + level * 4); b = R(2, 9); answer = a + b; }

    const n1 = Data.pick(Data.storyNames);
    let n2 = Data.pick(Data.storyNames);
    while (n2 === n1) n2 = Data.pick(Data.storyNames);
    const obj = Data.pick(Data.storyObjects);
    // numbers ≤ 20 shown as words: the reading stretch
    const w = x => (x <= 20 ? Data.numToWords(x) : x);
    const text = Data.storyTemplates[kind](n1, n2, w(a), w(b), obj);
    current = { mode: "story", answer };

    $stage().innerHTML = `
      <div class="story-text">${text}</div>
      <button class="speak-btn" id="w-speak">🔈 read it to me</button>
      <div class="answer-display" id="w-answer">&nbsp;</div>
      <div class="numpad words-numpad" id="w-numpad">
        <button data-key="1">1</button><button data-key="2">2</button><button data-key="3">3</button>
        <button data-key="4">4</button><button data-key="5">5</button><button data-key="6">6</button>
        <button data-key="7">7</button><button data-key="8">8</button><button data-key="9">9</button>
        <button data-key="back" class="key-back">⌫</button><button data-key="0">0</button>
        <button data-key="check" class="key-check" style="grid-column:auto">✓</button>
      </div>`;
    document.getElementById("w-speak").addEventListener("click", () => Speech.say(text));

    const ans = document.getElementById("w-answer");
    document.getElementById("w-numpad").addEventListener("click", e => {
      const btn = e.target.closest("button");
      if (!btn || awaitingNext) return;
      const k = btn.dataset.key;
      if (k === "check") {
        if (entry === "") return;
        if (parseInt(entry, 10) === current.answer) {
          awaitingNext = true;
          ans.classList.add("good");
          $f().textContent = Data.pick(Data.praise);
          Sound.correct();
          const gotIsland = App.addStar();
          done(misses === 0);
          setTimeout(() => next(), gotIsland ? 600 : 1400);
        } else {
          misses += 1;
          entry = "";
          ans.textContent = " ";
          ans.classList.remove("oops");
          void ans.offsetWidth;
          ans.classList.add("oops");
          if (misses >= 2) {
            awaitingNext = true;
            ans.textContent = current.answer;
            $f().textContent = `It was ${current.answer}. Next story!`;
            $f().className = "feedback-line soft";
            done(false);
            setTimeout(() => next(), 1800);
          } else {
            $f().textContent = "Listen to the story again. What is it asking?";
            $f().className = "feedback-line soft";
            Speech.say(text);
          }
        }
        return;
      }
      Sound.tap();
      if (k === "back") entry = entry.slice(0, -1);
      else if (entry.length < 4) entry += k;
      ans.textContent = entry || " ";
    });
  }

  return { enter, subtitle };
})();
