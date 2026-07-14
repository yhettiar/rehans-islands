/* Gentle audio: soft chimes via WebAudio, speech via SpeechSynthesis. */

const Sound = (() => {
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // one soft sine note, quiet and short
  function note(freq, when, dur = 0.35, vol = 0.08) {
    const a = ac();
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, a.currentTime + when);
    gain.gain.linearRampToValueAtTime(vol, a.currentTime + when + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + when + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(a.currentTime + when);
    osc.stop(a.currentTime + when + dur + 0.05);
  }

  return {
    setEnabled(v) { enabled = v; },
    tap() { if (enabled) note(523.25, 0, 0.12, 0.04); },                       // C5 tick
    correct() { if (enabled) { note(523.25, 0); note(659.25, 0.12); } },       // C5 → E5
    levelUp() { if (enabled) { note(523.25, 0); note(659.25, 0.14); note(783.99, 0.28, 0.5); } }, // C E G
    star() { if (enabled) note(880, 0, 0.25, 0.05); },
  };
})();

const Speech = (() => {
  let voice = null;

  function pickVoice() {
    const voices = speechSynthesis.getVoices();
    voice =
      voices.find(v => v.lang === "en-AU") ||
      voices.find(v => v.lang.startsWith("en-GB")) ||
      voices.find(v => v.lang.startsWith("en")) ||
      null;
  }
  if ("speechSynthesis" in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  return {
    say(text) {
      if (!("speechSynthesis" in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = 0.92;
      u.pitch = 1.0;
      speechSynthesis.speak(u);
    },
  };
})();
