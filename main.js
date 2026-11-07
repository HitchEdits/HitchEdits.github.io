// HitchEdits portfolio interactions.

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
const tipEl = document.getElementById("scrubTip");
let marks = [];
let ticks = [];

const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);

// A section's name for the tick label: data-name if set, otherwise its heading.
const nameOf = el => el.dataset.name || el.querySelector("h2")?.textContent.trim() || el.id;

// Marks are stored as scroll positions: a section's timecode is hit when its top
// reaches 40% down the viewport. The top of the page is always 00:00:00:00 and
// the last section is pinned to the bottom, so the readout spans the whole page.
function measure() {
  const max = maxScroll();
  const sections = [...document.querySelectorAll("[data-tc]")].map(el => ({
    y: Math.min(Math.max(1, el.getBoundingClientRect().top + scrollY - innerHeight * 0.4), max),
    f: toFrames(el.dataset.tc),
    name: nameOf(el)
  }));
  if (sections.length) sections[sections.length - 1].y = max;
  marks = [{ y: 0, f: 0, name: "Showreel" }].concat(sections).sort((a, b) => a.y - b.y);

  // Rebuild the ticks, one per section (not the page top).
  ticks.forEach(t => t.el.remove());
  ticks = marks.slice(1).map(m => {
    const el = document.createElement("span");
    el.className = "scrub-tick";
    el.style.left = (max ? m.y / max : 0) * 100 + "%";
    trackEl.insertBefore(el, headEl);
    return { el, p: max ? m.y / max : 0 };
  });
}

// Which section a 0–1 page position falls in.
const sectionAt = p => {
  const y = p * maxScroll();
  let name = marks[0]?.name;
  for (const m of marks) if (m.y <= y + 1) name = m.name;
  return name;
};

const setHead = p => {
  fillEl.style.width = headEl.style.left = p * 100 + "%";
  const name = sectionAt(p);
  if (tipEl.textContent !== name) tipEl.textContent = name;
  tipEl.style.setProperty("--p", p * 100 + "%");
  ticks.forEach(t => t.el.classList.toggle("passed", t.p <= p + 0.001));
  trackEl.setAttribute("aria-valuenow", Math.round(p * 100));
  trackEl.setAttribute("aria-valuetext", `${Math.round(p * 100)}%, ${name}`);
};

function draw() {
  const max = maxScroll();
  // While seeking, the playhead belongs to the pointer; the page catches up to it.
  if (target === null) setHead(max > 0 ? Math.min(scrollY / max, 1) : 0);

  const y = scrollY >= max - 1 ? max : scrollY; // sub-pixel scroll heights never quite reach max
  let i = marks.findIndex(m => m.y > y);
  if (i === -1) i = marks.length;
  const a = marks[i - 1] || marks[0];
  const b = marks[i];

  const f = b ? a.f + (b.f - a.f) * ((y - a.y) / (b.y - a.y || 1)) : a.f;
  tcEl.textContent = toTC(Math.max(0, f));
}

/* Pointer capture hands the cursor to the capturing element, so a playhead's
   custom cursor vanishes the moment a drag starts. Hold it on <html> instead. */
const scrubCursor = on => document.documentElement.classList.toggle("scrubbing", on);

/* Drag (or click) the track to scrub. The playhead snaps to the pointer and the
   page eases after it every frame, so the timecode rolls instead of jumping. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
let target = null;   // 0–1 while seeking, null otherwise
let dragging = false;
let easing = false;
let lastSet = null;  // where glide last put the page, to notice the user scrolling over it

function glide() {
  // Stop if seeking was released, or someone scrolled the page themselves mid-glide.
  if (target === null || (lastSet !== null && Math.abs(scrollY - lastSet) > 3)) {
    easing = false; lastSet = null;
    if (!dragging) target = null;
    draw();
    return;
  }
  const goal = target * maxScroll();
  const d = goal - scrollY;
  // Browsers round scroll positions, so finish within 2px rather than chasing sub-pixels forever.
  if (Math.abs(d) < 2 || reduceMotion.matches) {
    scrollTo({ top: goal, behavior: "instant" });
    easing = false; lastSet = null;
    if (!dragging) target = null;
    draw();
    return;
  }
  // "instant" overrides html's smooth scroll-behavior; the easing here replaces it.
  scrollTo({ top: scrollY + d * 0.2, behavior: "instant" });
  lastSet = scrollY;
  requestAnimationFrame(glide);
}

const seek = p => {
  target = Math.min(Math.max(p, 0), 1);
  setHead(target);
  if (!easing) { easing = true; requestAnimationFrame(glide); }
};
// Like snapping in an NLE: near a tick, the playhead locks onto the section start.
// The snap zone is at most 8px, and never more than a quarter of the gap between
// ticks, so a short track on a phone can still land between sections.
const seekTo = e => {
  const r = trackEl.getBoundingClientRect();
  let p = (e.clientX - r.left) / r.width;
  const gaps = ticks.slice(1).map((t, i) => (t.p - ticks[i].p) * r.width);
  const snap = Math.min(8, (gaps.length ? Math.min(...gaps) : Infinity) / 4);
  const near = ticks.find(t => Math.abs(t.p - p) * r.width <= snap);
  if (near) p = near.p;
  seek(p);
};

trackEl.addEventListener("pointerdown", e => {
  if (e.button !== 0) return;
  e.preventDefault(); // no text selection or native drag, which would cancel the pointer
  try { trackEl.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
  trackEl.classList.add("dragging");
  scrubCursor(true);
  dragging = true;
  seekTo(e);
});
trackEl.addEventListener("pointermove", e => {
  if (dragging) seekTo(e);
});
const endDrag = () => {
  dragging = false;
  trackEl.classList.remove("dragging");
  scrubCursor(false);
  if (!easing) target = null;
};
trackEl.addEventListener("pointerup", endDrag);
trackEl.addEventListener("pointercancel", endDrag);
trackEl.addEventListener("lostpointercapture", endDrag);

// Wheel or touch scrolling takes the page back from the scrubber.
const release = () => { if (!dragging) target = null; };
addEventListener("wheel", release, { passive: true });
addEventListener("touchstart", e => { if (!trackEl.contains(e.target)) release(); }, { passive: true });

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

/* ── 02 Pinned stage: scroll position drives the wipe ───────── */

/* The section is a tall runway with a sticky pin inside it, so scrolling
   past it reads as the messy cut being cleaned up in place rather than the
   page moving on. CSS does the drawing; this only measures. */
const stage = document.querySelector(".stage");
if (stage && !reduceMotion.matches) {
  const clamp01 = n => Math.min(Math.max(n, 0), 1);

  let queuedStage = false;
  const drawStage = () => {
    queuedStage = false;
    const run = stage.offsetHeight - innerHeight;
    if (run <= 0) return;                      // pin taller than the viewport

    const raw = clamp01(-stage.getBoundingClientRect().top / run);

    // Spend the first and last 15% of the runway holding still, so the frame
    // settles before the wipe starts and after it lands.
    const t = clamp01((raw - .15) / .7);

    // Smoothstep: eases both ends, so nothing starts or stops abruptly.
    stage.style.setProperty("--e", (t * t * (3 - 2 * t)).toFixed(4));

    // The cut edge fades in over the first sliver of the wipe and back out
    // over the last, so it never sits parked against either border.
    stage.style.setProperty("--edge", Math.min(t / .08, (1 - t) / .08, 1).toFixed(3));
  };

  // Same rAF throttle as the scrubber: one layout read per frame, not per event.
  const queueStage = () => {
    if (queuedStage) return;
    queuedStage = true;
    requestAnimationFrame(drawStage);
  };
  addEventListener("scroll", queueStage, { passive: true });
  addEventListener("resize", queueStage);
  drawStage();
}

/* ── Dialogue waveform ─────────────────────────────────────── */

document.querySelectorAll(".wave").forEach(wave => {
  // Deterministic pseudo-noise, looks like speech, same every load.
  let seed = +wave.dataset.seed || 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bars = +wave.dataset.bars || 120, fill = +wave.dataset.fill || .55, gap = 600 / bars;
  wave.innerHTML = Array.from({ length: bars }, (_, i) => {
    const env = Math.sin((i / bars) * Math.PI * 3.2) * 0.35 + 0.5; // phrasing
    const h = Math.max(2, (rnd() * 0.55 + env * 0.7) * 58);
    return `<rect x="${(i * gap).toFixed(1)}" y="${((64 - h) / 2).toFixed(1)}"
            width="${(gap * fill).toFixed(1)}" height="${h.toFixed(1)}"
            rx="1" opacity="${(0.35 + env * 0.5).toFixed(2)}"/>`;
  }).join("");
});

/* Audio comparison: both files share one transport and play one at a time. */
const audioPlayer = document.getElementById("audioPlayer");
if (audioPlayer) {
  const clips = {
    original: document.getElementById("audioOriginal"),
    fixed: document.getElementById("audioFixed")
  };
  const buttons = [...audioPlayer.querySelectorAll("[data-audio-version]")];
  const seekControl = document.getElementById("audioSeek");
  const playButton = document.getElementById("audioPlay");
  const playText = document.getElementById("audioPlayText");
  const currentLabel = document.getElementById("audioCurrent");
  const durationLabel = document.getElementById("audioDuration");
  const progress = document.getElementById("audioProgressRect");
  const status = document.getElementById("audioStatus");
  const setAudioStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle("sr", !isError);
  };
  let version = "original";
  let active = clips[version];
  let position = 0;
  let duration = Number(seekControl.max);
  let wantsPlayback = false;
  let request = 0;
  let animation = 0;

  const clock = seconds => {
    const whole = Math.max(0, Math.floor(seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
  };
  const paint = () => {
    const ratio = Math.min(1, Math.max(0, position / duration));
    seekControl.value = position;
    seekControl.setAttribute("aria-valuetext", `${clock(position)} of ${clock(duration)}`);
    currentLabel.textContent = clock(position);
    durationLabel.textContent = clock(duration);
    progress.setAttribute("width", ratio * 1000);
    audioPlayer.style.setProperty("--audio-progress", `${ratio * 100}%`);
    playButton.setAttribute("aria-pressed", String(wantsPlayback));
    playButton.setAttribute("aria-label", `${wantsPlayback ? "Pause" : "Play"} ${version} audio`);
    playText.textContent = wantsPlayback ? "Pause" : "Play";
  };
  const stop = () => {
    wantsPlayback = false;
    request++;
    active.pause();
    cancelAnimationFrame(animation);
    paint();
  };
  const tick = () => {
    if (!wantsPlayback || active.paused) return;
    position = Math.min(active.currentTime, duration);
    if (position >= duration) {
      stop();
      setAudioStatus("End of clip.");
      return;
    }
    paint();
    animation = requestAnimationFrame(tick);
  };
  const start = async () => {
    wantsPlayback = true;
    const attempt = ++request;
    const media = active;
    if (position >= duration - .02) position = 0;
    paint();
    setAudioStatus(`Loading ${version} audio…`);
    try {
      if (media.readyState < 1) {
        await new Promise((resolve, reject) => {
          const cleanup = () => {
            media.removeEventListener("loadedmetadata", loaded);
            media.removeEventListener("error", failed);
          };
          const loaded = () => { cleanup(); resolve(); };
          const failed = () => { cleanup(); reject(new Error("Audio unavailable")); };
          media.addEventListener("loadedmetadata", loaded);
          media.addEventListener("error", failed);
          if (media.error) media.load();
        });
      }
      if (attempt !== request) return;
      media.currentTime = Math.min(position, duration);
      await media.play();
      if (attempt !== request) {
        if (media !== active || !wantsPlayback) media.pause();
        return;
      }
      setAudioStatus(`Playing ${version} audio.`);
      cancelAnimationFrame(animation);
      tick();
    } catch {
      if (attempt !== request) return;
      stop();
      setAudioStatus("Audio couldn't play. Try again or select the other version.", true);
    }
  };

  buttons.forEach(button => button.addEventListener("click", () => {
    const next = button.dataset.audioVersion;
    if (next === version) return;
    const previous = active;
    if (previous.readyState >= 1) position = Math.min(previous.currentTime, duration);
    version = next;
    active = clips[version];
    request++;
    previous.pause();
    cancelAnimationFrame(animation);
    if (active.readyState >= 1) active.currentTime = position;
    buttons.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    audioPlayer.querySelectorAll("[data-audio-wave]").forEach(wave => {
      wave.style.display = wave.dataset.audioWave === version ? "" : "none";
    });
    setAudioStatus(`${version === "fixed" ? "Fixed" : "Original"} selected.`);
    paint();
    if (wantsPlayback) start();
  }));

  playButton.addEventListener("click", () => {
    if (wantsPlayback) {
      stop();
      setAudioStatus("Paused.");
    } else start();
  });
  seekControl.addEventListener("input", () => {
    position = Number(seekControl.value);
    if (active.readyState >= 1) active.currentTime = position;
    paint();
  });
  Object.values(clips).forEach(media => {
    media.addEventListener("loadedmetadata", () => {
      const lengths = Object.values(clips).map(clip => clip.duration).filter(Number.isFinite);
      if (lengths.length) duration = Math.min(...lengths);
      seekControl.max = duration;
      position = Math.min(position, duration);
      if (media === active) media.currentTime = position;
      paint();
    });
    media.addEventListener("ended", () => {
      if (media !== active) return;
      position = duration;
      stop();
      setAudioStatus("End of clip.");
    });
    media.addEventListener("pause", () => {
      if (media === active && wantsPlayback && !media.ended) stop();
    });
    media.addEventListener("error", () => {
      if (media !== active) return;
      stop();
      setAudioStatus("This audio file couldn't load. Try again or select the other version.", true);
    });
  });
  audioPlayer.querySelector(".audio-interface").hidden = false;
  audioPlayer.classList.add("is-enhanced");
  paint();
}

/* ── Grade wipe ────────────────────────────────────────────── */

// Drag anywhere on the frame. The hidden range input mirrors the position so
// keyboard and screen-reader users get the same control.
const wipe = document.getElementById("wipe");
const frame = document.getElementById("compareFrame");
if (wipe && frame) {
  const set = v => {
    v = Math.min(Math.max(v, 0), 100);
    wipe.value = v;
    frame.style.setProperty("--pos", v + "%");
    frame.classList.toggle("at-start", v < 12);
    frame.classList.toggle("at-end", v > 88);
  };
  const fromPointer = e => {
    const r = frame.getBoundingClientRect();
    set((e.clientX - r.left) / r.width * 100);
  };

  let wiping = false;
  frame.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    wiping = true;
    try { frame.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    frame.classList.add("dragging");
    fromPointer(e);
  });
  frame.addEventListener("pointermove", e => { if (wiping) fromPointer(e); });
  const stop = () => { wiping = false; frame.classList.remove("dragging"); };
  frame.addEventListener("pointerup", stop);
  frame.addEventListener("pointercancel", stop);
  frame.addEventListener("lostpointercapture", stop);

  wipe.addEventListener("input", () => set(+wipe.value));
  set(+wipe.value);
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
addEventListener("load", () => { measure(); draw(); });

const mcam = document.querySelector(".mcam");
if (mcam) {
  const head = mcam.querySelector(".mcam-head");
  const put = p => {
    p = Math.min(Math.max(p, 0), 100);
    mcam.style.setProperty("--p", p.toFixed(2) + "%");
    head.setAttribute("aria-valuenow", Math.round(p));
  };
  const move = e => {
    const r = mcam.getBoundingClientRect();
    put(((e.clientX - r.left) / r.width) * 100);
  };

  let down = false;
  mcam.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    down = true;
    try { mcam.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    scrubCursor(true);
    e.preventDefault();
    move(e);
  });
  mcam.addEventListener("pointermove", e => { if (down) move(e); });
  const up = () => { down = false; scrubCursor(false); };
  mcam.addEventListener("pointerup", up);
  mcam.addEventListener("pointercancel", up);
  mcam.addEventListener("lostpointercapture", up);

  head.addEventListener("keydown", e => {
    const at = parseFloat(mcam.style.getPropertyValue("--p")) || 38;
    const step = e.shiftKey ? 10 : 2;
    const to = { ArrowLeft: at - step, ArrowRight: at + step, Home: 0, End: 100 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    put(to);
  });
}
