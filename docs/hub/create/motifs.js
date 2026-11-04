// Animated corner trims for the creator's frames (Charl, 2026-11-04: "more whimsical/fantasy ... do not
// change the main UI, have it just be trims for the frames that are animated").
// Each corner of the options, character and details panels gets a filigree trim: curling vines along
// both edges that draw themselves in, a glint that runs along them, twinkling four-point stars, and the
// class's own small charm in the corner, which breathes. Changing class redraws the trims. A gestalt hero
// wears the first class at the top corners and the second at the bottom. Grave Red line work only.
// The trims are self-animating SVG backgrounds, so they need no script after they are set, and they
// hold still under prefers-reduced-motion.
window.CreatorMotifs = (() => {
  // Each class's charm, drawn in a 26 x 26 box that sits in the very corner.
  const CHARM = {
    Barbarian: "M8 16l6-7M11 19l8-9M14 22l8-9", // claw slashes
    Bard: "M6 18c0-7 5-12 12-12M10 21c0-7 5-12 12-12M15 13l3 3", // a lyre's arcs
    Cleric: "M8 8l5 5M8 8l7 2M8 8l2 7M14 14m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0", // a small sun
    Druid: "M8 20c0-7 5-12 12-12M15 9c-3 3-3 6 0 8c3-2 3-5 0-8M9 15c3-3 6-3 8 0c-2 3-5 3-8 0", // sprig
    Fighter: "M9 21V12l3-3h9M12 12h3v3h-3Z", // notched steel and a rivet
    Monk: "M21 13a8 8 0 1 0-8 8", // an open ensō
    Paladin: "M9 9h9v5c0 4-4.5 6-4.5 6S9 18 9 14ZM13.5 11v6M11 13.5h5", // a sworn shield
    Ranger: "M8 8l13 13M8 8h5M8 8v5M18 18l3-1-1 3", // an arrow
    Rogue: "M8 22L22 8M17 9l4 4", // a thin blade
    Sorcerer: "M10 21c-3-6 3-7 1-13c5 4 6 8 3 13", // a flame wisp
    Warlock: "M7 14c3.5-5 9.5-5 13 0c-3.5 5-9.5 5-13 0ZM13.5 14m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0", // an eye
    Wizard: "M7 15a8 8 0 0 1 8-8M7 20a13 13 0 0 1 13-13M12 12m-1.4 0a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0", // arcane rings
    Artificer: "M13 13m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M13 7v2M19 13h-2M13 19v-2M7 13h2", // a cog
    "Blood Hunter": "M11 7v7M11 14c-2 3 0 5 0 5s2-2 0-5M17 7v4M17 11c-1.5 2 0 3.5 0 3.5s1.5-1.5 0-3.5", // drips
    Mystic: "M13 7l6 10H7ZM13 13.5m-1.3 0a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0", // the third eye
    "Carlislean Lycanthrope": "M8 20c1-5 4-9 9-12M12 22c1-5 4-9 9-12", // raking claws
  };
  const STAR = "M0-3.2C.4-.4.4-.4 3.2 0C.4.4.4.4 0 3.2C-.4.4-.4.4-3.2 0C-.4-.4-.4-.4 0-3.2Z";
  // The filigree along the top edge (reflected across the diagonal for the left edge).
  const VINE = "M14 6C30 4 46 5 60 6S78 8 88 5";
  const CURLS = "M30 5c2-6 10-7 12-2c1 3-1 6-4 5c-2-1-2-3 0-4M52 6c1 4 6 6 9 3c2-2 0-5-2-4M70 6q4-5 10-3q-4 4-10 3Z";

  function trim(charm, rot) {
    const edge = `<path class='v' pathLength='1' d='${VINE}'/><path class='v c' pathLength='1' d='${CURLS}'/><path class='g' pathLength='1' d='${VINE}'/>`;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96' width='96' height='96'><style>
.v{fill:none;stroke:#d0313f;stroke-opacity:.6;stroke-width:1;stroke-linecap:round;stroke-dasharray:1;animation:draw 2.4s cubic-bezier(.2,.8,.2,1) both}
.c{animation-delay:.5s;stroke-opacity:.5}
.g{fill:none;stroke:#ff8a8f;stroke-width:1.4;stroke-linecap:round;stroke-dasharray:.06 .94;animation:run 7s linear 2.4s infinite both;filter:drop-shadow(0 0 1.5px #ec4a56)}
.ch{fill:none;stroke:#ec4a56;stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round;transform-origin:13px 13px;animation:breathe 4.5s ease-in-out infinite;filter:drop-shadow(0 0 2px #d0313f)}
.s{fill:#ff8a8f;transform-box:fill-box;transform-origin:center;animation:twinkle 3.2s ease-in-out infinite}
@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes run{from{stroke-dashoffset:1;opacity:0}8%{opacity:1}55%{opacity:1}62%,to{stroke-dashoffset:.2;opacity:0}}
@keyframes breathe{0%,100%{opacity:.55;transform:scale(.96)}50%{opacity:1;transform:scale(1.04)}}
@keyframes twinkle{0%,100%{opacity:0;transform:scale(.3) rotate(0)}45%{opacity:.95;transform:scale(1) rotate(45deg)}70%{opacity:0;transform:scale(.4) rotate(90deg)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.g,.s{opacity:0}}
</style><g transform='rotate(${rot} 48 48)'>
${edge}<g transform='matrix(0 1 1 0 0 0)'>${edge}</g>
<path class='ch' d='${charm}'/>
<path class='s' transform='translate(44 16)' d='${STAR}'/><path class='s' style='animation-delay:1.1s' transform='translate(16 44) scale(.8)' d='${STAR}'/><path class='s' style='animation-delay:2.2s' transform='translate(64 14) scale(.6)' d='${STAR}'/>
</g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  let now = null;
  // cls: the (first) class; second: the gestalt class or "".
  function apply({ cls, second }) {
    const key = `${cls}|${second || ""}`;
    if (key === now) return;
    now = key;
    const a = CHARM[cls] || "", b = second ? CHARM[second] || "" : a;
    const st = document.body.style;
    st.setProperty("--cc-c-tl", trim(a, 0));
    st.setProperty("--cc-c-tr", trim(a, 90));
    st.setProperty("--cc-c-br", trim(b, 180));
    st.setProperty("--cc-c-bl", trim(b, 270));
  }

  return { apply };
})();
