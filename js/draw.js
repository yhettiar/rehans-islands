/* Draw: calm free-drawing canvas with prompts and a small saved gallery. */

const Draw = (() => {
  const COLORS = ["#3D405B", "#E07A5F", "#81B29A", "#8EAAC4", "#F2CC8F", "#B8A9C9", "#C97B84", "#6B705C"];
  const SIZES = [4, 9, 16];
  const MAX_SAVED = 12;

  let canvas, ctx;
  let drawing = false;
  let color = COLORS[0];
  let sizeIdx = 1;
  let erasing = false;
  let sized = false;

  function enter() {
    canvas = document.getElementById("draw-canvas");
    ctx = canvas.getContext("2d");
    // size the canvas to its on-screen box (after layout)
    requestAnimationFrame(() => {
      const box = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      // keep existing artwork when re-entering at same size
      if (!sized || canvas.width !== Math.round(box.width * dpr)) {
        canvas.width = Math.round(box.width * dpr);
        canvas.height = Math.round(box.height * dpr);
        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, box.width, box.height);
        sized = true;
      }
    });
    renderGallery();
  }

  function pos(e) {
    const box = canvas.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  }

  function start(e) {
    e.preventDefault();
    drawing = true;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1); // dot on tap
    stroke();
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    stroke();
  }
  function stroke() {
    ctx.strokeStyle = erasing ? "#FFFFFF" : color;
    ctx.lineWidth = erasing ? SIZES[2] * 2 : SIZES[sizeIdx];
    ctx.stroke();
  }
  function end() { drawing = false; }

  function renderGallery() {
    const g = document.getElementById("gallery");
    g.innerHTML = "";
    App.state.drawings.forEach(src => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Saved drawing";
      g.appendChild(img);
    });
  }

  function saveDrawing() {
    // downscale so localStorage stays small
    const thumb = document.createElement("canvas");
    const scale = 300 / canvas.width;
    thumb.width = 300;
    thumb.height = Math.round(canvas.height * scale);
    thumb.getContext("2d").drawImage(canvas, 0, 0, thumb.width, thumb.height);
    App.state.drawings.unshift(thumb.toDataURL("image/jpeg", 0.7));
    if (App.state.drawings.length > MAX_SAVED) App.state.drawings.pop();
    App.save();
    Sound.correct();
    App.addStar();
    renderGallery();
  }

  function clearCanvas() {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  document.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("draw-canvas");

    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);

    // palette
    const pal = document.getElementById("palette");
    COLORS.forEach((c, i) => {
      const b = document.createElement("button");
      b.className = "swatch" + (i === 0 ? " selected" : "");
      b.style.background = c;
      b.setAttribute("aria-label", `Colour ${i + 1}`);
      b.addEventListener("click", () => {
        color = c;
        erasing = false;
        document.getElementById("eraser-btn").classList.remove("selected");
        pal.querySelectorAll(".swatch").forEach(s => s.classList.remove("selected"));
        b.classList.add("selected");
        Sound.tap();
      });
      pal.appendChild(b);
    });

    // brush size cycles small → medium → large
    const brushBtn = document.getElementById("brush-size-btn");
    const dot = document.getElementById("brush-dot");
    brushBtn.addEventListener("click", () => {
      sizeIdx = (sizeIdx + 1) % SIZES.length;
      const d = 6 + sizeIdx * 6;
      dot.style.width = `${d}px`;
      dot.style.height = `${d}px`;
      Sound.tap();
    });

    document.getElementById("eraser-btn").addEventListener("click", e => {
      erasing = !erasing;
      e.currentTarget.classList.toggle("selected", erasing);
      Sound.tap();
    });
    document.getElementById("clear-btn").addEventListener("click", () => {
      clearCanvas();
      Sound.tap();
    });
    document.getElementById("save-btn").addEventListener("click", saveDrawing);

    // prompt shuffle
    document.getElementById("prompt-shuffle").addEventListener("click", () => {
      const p = Data.pick(Data.drawPrompts);
      document.getElementById("draw-prompt").textContent = p;
      Speech.say(p);
      Sound.tap();
    });
  });

  return { enter };
})();
