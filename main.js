// HitchEdits: scrub readout, waveform, grade wipe, click-to-load video.

const FPS = 24;

const toFrames = tc => {
  const [h, m, s, f] = tc.split(":").map(Number);
  return ((h * 60 + m) * 60 + s) * FPS + f;
};
const toTC = n => {
  const p = (v) => String(v).padStart(2, "0");
  return [Math.floor(n / (3600 * FPS)) % 24, Math.floor(n / (60 * FPS)) % 60,
  Math.floor(n / FPS) % 60, Math.floor(n) % FPS].map(p).join(":");
};

/* ── Scrub gutter ──────────────────────────────────────────────
   Timecode is interpolated between each section's data-tc, so the
   readout actually lines up with where you are in the page. */

const tcEl = document.getElementById("tc");
const fillEl = document.getElementById("scrubFill");
const headEl = document.getElementById("scrubHead");
const trackEl = document.getElementById("scrubTrack");
let marks = [];

const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);

// Marks are stored as scroll positions: a section's timecode is hit when its top
// reaches 40% down the viewport. The top of the page is always 00:00:00:00 and
// the last section is pinned to the bottom, so the readout spans the whole page.
function measure() {
  const max = maxScroll();
  const sections = [...document.querySelectorAll("[data-tc]")].map(el => ({
    y: Math.min(Math.max(1, el.getBoundingClientRect().top + scrollY - innerHeight * 0.4), max),
    f: toFrames(el.dataset.tc)
  }));
  if (sections.length) sections[sections.length - 1].y = max;
  marks = [{ y: 0, f: 0 }].concat(sections).sort((a, b) => a.y - b.y);
}

function draw() {
  const max = maxScroll();
  const p = max > 0 ? Math.min(scrollY / max, 1) : 0;
  fillEl.style.width = headEl.style.left = p * 100 + "%";
  trackEl.setAttribute("aria-valuenow", Math.round(p * 100));

  const y = scrollY;
  let i = marks.findIndex(m => m.y > y);
  if (i === -1) i = marks.length;
  const a = marks[i - 1] || marks[0];
  const b = marks[i];

  const f = b ? a.f + (b.f - a.f) * ((y - a.y) / (b.y - a.y || 1)) : a.f;
  tcEl.textContent = toTC(Math.max(0, f));
}

// Drag (or click) anywhere on the track to jump the page there.
// "instant" overrides the smooth scroll-behavior so the page keeps up with the pointer.
const seek = p => scrollTo({ top: Math.min(Math.max(p, 0), 1) * maxScroll(), behavior: "instant" });
const seekTo = e => {
  const r = trackEl.getBoundingClientRect();
  seek((e.clientX - r.left) / r.width);
};

trackEl.addEventListener("pointerdown", e => {
  trackEl.setPointerCapture(e.pointerId);
  trackEl.classList.add("dragging");
  seekTo(e);
});
trackEl.addEventListener("pointermove", e => {
  if (trackEl.hasPointerCapture(e.pointerId)) seekTo(e);
});
const endDrag = () => trackEl.classList.remove("dragging");
trackEl.addEventListener("pointerup", endDrag);
trackEl.addEventListener("pointercancel", endDrag);

trackEl.addEventListener("keydown", e => {
  const p = scrollY / (maxScroll() || 1);
  const step = e.shiftKey ? 0.1 : 0.02;
  const to = { ArrowRight: p + step, ArrowUp: p + step, ArrowLeft: p - step, ArrowDown: p - step, Home: 0, End: 1 }[e.key];
  if (to === undefined) return;
  e.preventDefault();
  seek(to);
});

let queued = false;
addEventListener("scroll", () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { draw(); queued = false; });
}, { passive: true });
addEventListener("resize", () => { measure(); draw(); });

/* ── Dialogue waveform ─────────────────────────────────────── */

document.querySelectorAll(".wave").forEach(wave => {
  // Deterministic pseudo-noise, looks like speech, same every load.
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bars = 120, gap = 600 / bars;

  wave.innerHTML = Array.from({ length: bars }, (_, i) => {
    const env = Math.sin((i / bars) * Math.PI * 3.2) * 0.35 + 0.5; // phrasing
    const h = Math.max(2, (rnd() * 0.55 + env * 0.7) * 58);
    return `<rect x="${(i * gap).toFixed(1)}" y="${((64 - h) / 2).toFixed(1)}"
            width="${(gap * 0.55).toFixed(1)}" height="${h.toFixed(1)}"
            rx="1" opacity="${(0.35 + env * 0.5).toFixed(2)}"/>`;
  }).join("");
});

/* ── Grade wipe ────────────────────────────────────────────── */

const wipe = document.getElementById("wipe");
if (wipe) {
  const frame = document.querySelector(".compare-frame");
  const set = () => frame.style.setProperty("--pos", wipe.value + "%");
  wipe.addEventListener("input", set);
  set();
}

/* ── Media ─────────────────────────────────────────────────────
   Fill a slot by putting an ID in the markup:
     data-yt="dQw4w9WgXcQ"      (works with unlisted videos)
     data-img="stills/grade.jpg"
   Left empty, the slot shows colour bars instead. */

document.querySelectorAll("[data-img]").forEach(el => {
  const src = el.dataset.img;
  if (!src) return;
  if (el.tagName === "IMG") el.src = src;
  else Object.assign(el.style, {
    backgroundImage: `url("${src}")`, backgroundSize: "cover", backgroundPosition: "center"
  });
});

// Nothing loads from YouTube until you click. Keeps the page fast and cookie-free.
document.querySelectorAll("[data-yt]").forEach(el => {
  const id = el.dataset.yt;
  if (!id) return;

  const mount = el.querySelector(".monitor-screen") || el;
  mount.style.backgroundImage = `url("https://i.ytimg.com/vi/${id}/maxresdefault.jpg")`;
  mount.style.backgroundSize = "cover";
  mount.style.backgroundPosition = "center";

  const btn = document.createElement("button");
  btn.className = "play";
  btn.type = "button";
  btn.setAttribute("aria-label", "Play video");
  btn.addEventListener("click", () => {
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture";
    f.allowFullscreen = true;
    f.title = "HitchEdits video";
    btn.replaceWith(f);
  });
  mount.appendChild(btn);
});

document.getElementById("year").textContent = new Date().getFullYear();

// Fonts shift layout, so re-measure once they land.
measure(); draw();
if (document.fonts) document.fonts.ready.then(() => { measure(); draw(); });
