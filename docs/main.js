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

  // Engraved rays around the hero sigil.
  const rays = document.getElementById("rays");
  if (rays) {
    const ns = "http://www.w3.org/2000/svg";
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const inner = i % 4 === 0 ? 150 : 162;
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", (200 + Math.cos(a) * inner).toFixed(1));
      line.setAttribute("y1", (200 + Math.sin(a) * inner).toFixed(1));
      line.setAttribute("x2", (200 + Math.cos(a) * 182).toFixed(1));
      line.setAttribute("y2", (200 + Math.sin(a) * 182).toFixed(1));
      rays.appendChild(line);
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
      ember: Math.random() < 0.18,
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
        glow.addColorStop(0, `rgba(240, 214, 160, ${0.55 * fade})`);
        glow.addColorStop(0.35, `rgba(201, 162, 90, ${0.18 * fade})`);
        glow.addColorStop(1, "rgba(201, 162, 90, 0)");
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
