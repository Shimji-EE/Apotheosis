(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Fade sections in as they scroll into view.
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  // Show the nav once the hero is behind us, and drift parallax layers.
  const nav = document.getElementById("nav");
  const layers = reduceMotion ? [] : [...document.querySelectorAll("[data-parallax]")];
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle("is-visible", y > window.innerHeight * 0.6);
    for (const el of layers) {
      const inHero = el.closest(".hero");
      // Stacked cards on narrow screens would drift into each other's captions.
      if (!inHero && window.innerWidth <= 800) {
        el.style.translate = "";
        continue;
      }
      const speed = parseFloat(el.dataset.parallax);
      const rect = el.getBoundingClientRect();
      const offset = rect.top + rect.height / 2 - window.innerHeight / 2;
      const shift = inHero ? y * speed : offset * speed;
      el.style.translate = `0 ${shift.toFixed(1)}px`;
    }
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  // Invented script for the hero columns: Slavic (Glagolitic) loops, crosses and
  // ladders, drawn with the straight strokes and hooks of Japanese brush writing.
  const glyphs = [
    "M10 3.5a2.6 2.6 0 1 0 0.01 0M3 11h14M10 11v6.5M6.5 17.5h7",
    "M6 3v14M14 3v14M6 3h8M10 15.5a1.8 1.8 0 1 0 0.01 0",
    "M4.5 4h11L10 11ZM4 14h12M7 17.5h6",
    "M5 4h10v8H5ZM10 8a1.6 1.6 0 1 0 0.01 0M10 12v5.5l-3 0.5",
    "M4 4h12M10 4v9M6 15a2 2 0 1 0 0.01 0M14 15a2 2 0 1 0 0.01 0",
    "M2.5 10h15M6 3.5a2.4 2.4 0 1 0 0.01 0M14 11.5a2.4 2.4 0 1 0 0.01 0",
    "M4 3v14M7 5h9M7 10h6M7 15h9M16 10a1.4 1.4 0 1 0 0.01 0",
    "M5 4h10v6H5v6h10M10 18.5a0.9 0.9 0 1 0 0.01 0",
    "M10 3.5a6 6 0 1 0 0.01 0M3.5 9.5h13M10 2v3",
    "M7 6v11M13 6v11M7 9h6M7 14h6M7 6l3-3.5L13 6",
    "M3.5 5h13l-2.5 3M10 5v12M6 12l-2.5 4M14 12l2.5 4",
    "M10 3v4M4 7h12M5.5 7v6a4.5 4.5 0 0 0 9 0V7M10 17v1.5",
  ];
  const ns = "http://www.w3.org/2000/svg";
  let seed = 7;
  const next = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (const host of document.querySelectorAll(".script")) {
    for (let c = 0; c < 2; c++) {
      const col = document.createElement("div");
      col.className = "script-col";
      for (let i = 0; i < 9; i++) {
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 20 20");
        const path = document.createElementNS(ns, "path");
        path.setAttribute("d", glyphs[Math.floor(next() * glyphs.length)]);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "currentColor");
        path.setAttribute("stroke-width", "1.5");
        path.setAttribute("stroke-linecap", "square");
        path.setAttribute("stroke-linejoin", "miter");
        svg.appendChild(path);
        col.appendChild(svg);
      }
      host.appendChild(col);
    }
  }

  // Slow dust and the odd ember drifting through the dark.
  if (reduceMotion) return;
  const canvas = document.getElementById("dust");
  const ctx = canvas.getContext("2d");
  let width, height, embers;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(70, (width * height) / 22000));
    embers = Array.from({ length: count }, () => spawn(true));
  }

  function spawn(anywhere) {
    return {
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + 10,
      r: Math.random() * 1.6 + 0.4,
      vy: Math.random() * 0.35 + 0.12,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: Math.random() * 0.01 + 0.004,
      life: Math.random() * 0.5 + 0.5,
      ember: Math.random() < 0.35,
    };
  }

  function frame() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < embers.length; i++) {
      const e = embers[i];
      e.y -= e.vy;
      e.sway += e.swaySpeed;
      e.x += Math.sin(e.sway) * 0.25;
      if (e.y < -10) embers[i] = spawn(false);
      const fade = Math.min(1, e.y / (height * 0.5)) * e.life;
      const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 4);
      if (e.ember) {
        glow.addColorStop(0, `rgba(255, 120, 80, ${0.8 * fade})`);
        glow.addColorStop(0.35, `rgba(200, 40, 58, ${0.3 * fade})`);
        glow.addColorStop(1, "rgba(200, 40, 58, 0)");
      } else {
        glow.addColorStop(0, `rgba(226, 216, 200, ${0.4 * fade})`);
        glow.addColorStop(0.35, `rgba(160, 150, 136, ${0.12 * fade})`);
        glow.addColorStop(1, "rgba(160, 150, 136, 0)");
      }
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
})();
