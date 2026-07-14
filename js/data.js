/* Shared data: number words, praise lines, fact-card islands, story templates, draw prompts. */

const Data = {
  // ---- number → words (up to 9999) ----
  ones: ["zero","one","two","three","four","five","six","seven","eight","nine","ten",
    "eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"],
  tens: ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"],

  numToWords(n) {
    if (n < 20) return this.ones[n];
    if (n < 100) {
      const t = this.tens[Math.floor(n / 10)];
      return n % 10 ? `${t}-${this.ones[n % 10]}` : t;
    }
    if (n < 1000) {
      const h = `${this.ones[Math.floor(n / 100)]} hundred`;
      return n % 100 ? `${h} and ${this.numToWords(n % 100)}` : h;
    }
    const th = `${this.ones[Math.floor(n / 1000)]} thousand`;
    return n % 1000 ? `${th} ${n % 1000 < 100 ? "and " : ""}${this.numToWords(n % 1000)}` : th;
  },

  // ---- process praise (never "you're so smart") ----
  praise: [
    "Nice thinking!",
    "You worked that out carefully.",
    "Great strategy!",
    "You stuck with it. Well done!",
    "Clever way to solve that.",
    "Your brain is getting stronger!",
    "Careful counting — it worked!",
    "You checked it properly. Nice.",
  ],
  encourage: [
    "Have another go. Take your time.",
    "Almost! Look again slowly.",
    "Tricky one. Try once more.",
    "Take a breath and try again.",
  ],

  // ---- islands: unlocked every 25 stars, each carries a maths fact ----
  islands: [
    { emoji: "🐢", name: "Turtle Rock", fact: "Zero was invented after all the other numbers!" },
    { emoji: "🌳", name: "Ten Tree", fact: "Ten is the first number with two digits." },
    { emoji: "🐝", name: "Hexagon Hive", fact: "Bees build with hexagons, shapes with 6 sides." },
    { emoji: "🏔️", name: "Square Mountain", fact: "144 is a dozen dozens. That's 12 × 12!" },
    { emoji: "🌀", name: "Spiral Bay", fact: "Snail shells grow in a number pattern called a spiral." },
    { emoji: "⭐", name: "Star Harbour", fact: "A prime number can only be divided by 1 and itself." },
    { emoji: "🌋", name: "Volcano of 1000", fact: "One thousand is ten hundreds stacked up!" },
    { emoji: "🐙", name: "Octopus Reef", fact: "An octopus has 8 arms. Two octopuses have 16!" },
    { emoji: "🌙", name: "Moon Meadow", fact: "The Moon is about 384,000 km away. That's a big number!" },
    { emoji: "♾️", name: "Infinity Falls", fact: "Numbers never end. There is always one more." },
  ],

  // ---- story sums ----
  storyNames: ["Ari", "Bo", "Mia", "Sam", "Zoe", "Kai", "Ivy", "Leo"],
  storyObjects: ["apples", "blocks", "stickers", "shells", "marbles", "crayons", "dinosaurs", "balloons"],
  storyTemplates: {
    add: (n1, n2, a, b, obj) => `${n1} has ${a} ${obj}. ${n2} gives ${n1} ${b} more. How many ${obj} now?`,
    sub: (n1, n2, a, b, obj) => {
      const B = String(b).charAt(0).toUpperCase() + String(b).slice(1);
      return `There are ${a} ${obj}. ${B} roll away. How many are left?`;
    },
    mul: (n1, n2, a, b, obj) => `${n1} has ${a} bags. Each bag has ${b} ${obj}. How many ${obj} altogether?`,
  },

  // ---- draw prompts ----
  drawPrompts: [
    "Draw anything you like!",
    "Draw the number 8 as something silly.",
    "Draw 12 dots in neat rows.",
    "Draw a house made of squares and triangles.",
    "Write your name in your favourite colour.",
    "Draw 3 groups of 4 things.",
    "Draw a monster with 7 eyes.",
    "Draw the biggest number you know.",
    "Draw a pattern: circle, square, circle, square…",
    "Draw your family as number blocks.",
    "Write the word 'ten' and decorate it.",
    "Draw half of a pizza.",
  ],

  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  rand(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); },
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
};
