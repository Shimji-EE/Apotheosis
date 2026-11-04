// The creator's menu takes on the hero's class (Charl, 2026-11-04: "the actual class and features
// should customise the character menu as you go ... subtle and intentional").
//   - Each class has its own corner ornament on the three panels, its own tab-marker shape and a
//     faint engraving of its emblem behind the details panel. Changing class lets the panels breathe
//     red once, slowly, as they take the new shape.
//   - Every class feature the hero has reached leaves a small mark at the end of the tab bar, so the
//     menu fills in as the hero levels. New marks settle in; the rest stay still.
// Grave Red only: the ornaments are thin red line work, never new colours.
window.CreatorMotifs = (() => {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Corner ornaments, drawn for the top-left corner of a 44 x 44 box (rotated for the other three).
  const L = "M5 30V5h25"; // the plain bracket every class keeps under its own mark
  const CORNER = {
    Barbarian: `${L}M12 20l8-8M12 26l14-14M12 32l20-20`, // torn claw slashes
    Bard: `${L}M10 26c0-9 7-16 16-16M14 30c0-9 7-16 16-16`, // a lyre's paired arcs
    Cleric: `${L}M5 5l12 12M5 5l16 6M5 5l6 16M17 17m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0`, // rays from the corner
    Druid: `${L}M9 34c0-14 11-25 25-25M22 12c-3 4-3 8 0 10c3-2 3-6 0-10M12 22c4-3 8-3 10 0c-2 3-6 3-10 0`, // vine with two leaves
    Fighter: "M5 30V11l6-6h19M10 30V16l6-6h14M14 14h4v4h-4Z", // notched steel with a rivet
    Monk: `${L}M30 16a14 14 0 1 0-14 14`, // an open ensō
    Paladin: `${L}M10 10h12v7c0 5-6 8-6 8s-6-3-6-8ZM16 13v8M13 16h6`, // a small sworn shield
    Ranger: `${L}M9 9l20 20M9 9h7M9 9v7M24 24l5-1-1 5`, // an arrow along the diagonal
    Rogue: "M5 26V5h21M9 34L34 9M26 12l5 5", // a thin blade with a crossguard
    Sorcerer: `${L}M12 30c-4-8 4-10 2-18c6 5 8 10 4 18M18 30c0-4 3-6 2-10`, // a flame wisp
    Warlock: `${L}M10 18c4-6 12-6 16 0c-4 6-12 6-16 0ZM18 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0`, // a watching eye
    Wizard: `${L}M5 20a15 15 0 0 1 15-15M5 26a21 21 0 0 1 21-21M13 13m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0`, // arcane rings
    Artificer: `${L}M5 20a15 15 0 0 1 15-15M7 13l-3-1M10 9l-2-3M14 6l-1-3M18 5V2M13 13m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0`, // gear teeth
    "Blood Hunter": `${L}M14 5v10M14 15c-2 3 0 5 0 5s2-2 0-5M22 5v6M22 11c-1.5 2 0 4 0 4s1.5-2 0-4`, // drips
    Mystic: `${L}M18 10l7 12h-14ZM18 17m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0`, // the third eye
    "Carlislean Lycanthrope": `${L}M10 30c2-8 6-14 14-18M15 33c2-8 6-14 14-18M20 35c2-7 5-12 13-16`, // raking claws
  };
  // Tab marker shapes (the numbered badge in each tab).
  const MARK = {
    Barbarian: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
    Fighter: "polygon(25% 0, 75% 0, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0 75%, 0 25%)",
    Paladin: "polygon(0 0, 100% 0, 100% 55%, 50% 100%, 0 55%)",
    Rogue: "polygon(50% 0, 88% 42%, 50% 100%, 12% 42%)",
    Wizard: "round", Sorcerer: "round", Mystic: "round",
    Warlock: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
    Monk: "round", Cleric: "polygon(50% 0, 61% 35%, 100% 50%, 61% 65%, 50% 100%, 39% 65%, 0 50%, 39% 35%)",
    Artificer: "polygon(25% 0, 75% 0, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0 75%, 0 25%)",
  };
  const svgUri = (d, rot) => `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 44' width='44' height='44'><g transform='rotate(${rot} 22 22)' fill='none' stroke='#d0313f' stroke-opacity='.62' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'><path d='${d}'/></g></svg>`)}")`;

  let clsNow = null;
  // cls: the (first) class; second: the gestalt class or ""; emblemSrc: the class emblem's URL or "".
  function apply({ cls, second, emblemSrc }) {
    const key = `${cls}|${second || ""}`;
    if (key === clsNow) return;
    const root = document.body.style;
    const d = CORNER[cls] || L;
    // A gestalt hero wears both: the first class at the top corners, the second at the bottom.
    const d2 = second ? CORNER[second] || L : d;
    root.setProperty("--cc-c-tl", svgUri(d, 0));
    root.setProperty("--cc-c-tr", svgUri(d, 90));
    root.setProperty("--cc-c-br", svgUri(d2, 180));
    root.setProperty("--cc-c-bl", svgUri(d2, 270));
    // Round classes draw their badge with border-radius, so the thin red ring stays whole.
    const round = MARK[cls] === "round";
    root.setProperty("--cc-mark", round ? "none" : MARK[cls] || "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)");
    root.setProperty("--cc-mark-r", round ? "50%" : "0");
    root.setProperty("--cc-engrave", emblemSrc ? `url("${new URL(emblemSrc, location.href).href}")` : "none");
    document.body.dataset.cls = cls.toLowerCase().replace(/[^a-z]+/g, "-");
    if (clsNow !== null && !still) {
      document.body.classList.remove("cc-reshape"); void document.body.offsetWidth; document.body.classList.add("cc-reshape");
    }
    clsNow = key;
  }

  // marks: [[name, imgNode]] for the class features reached so far, oldest first.
  let seen = null;
  function marks(list) {
    const known = seen;
    seen = new Set(list.map(([n]) => n));
    const shown = list.slice(-12);
    const out = document.createElement("span");
    out.className = "cc-marks";
    out.setAttribute("aria-label", `${list.length} class features`);
    if (list.length > shown.length) out.append(Object.assign(document.createElement("span"), { className: "cc-marks-more", textContent: `+${list.length - shown.length}` }));
    shown.forEach(([n, img], i) => {
      const m = document.createElement("span");
      m.className = `cc-mark${known && !known.has(n) && !still ? " is-new" : ""}`;
      m.title = n;
      m.style.setProperty("--i", i);
      m.append(img);
      out.append(m);
    });
    return out;
  }

  return { apply, marks };
})();
