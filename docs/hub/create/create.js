// Character creator, laid out like Baldur's Gate 3's: tabs along the top, the options on the
// left, your character in the centre, and what the option does on the right. Rules come from
// the Apotheosis notes first (options.js), then published 5e books (catalogue.js). Flavour
// (background story, goals, traits, portrait) stays the player's to write on the dashboard.
(async () => {
  const { db, $, say, el, requireMember } = window.Hub;
  const O = window.CreatorOptions;
  const K = window.CreatorCatalogue;
  const member = await requireMember("../");
  if (!member) return;
  const { me } = member;

  // Who the character is for: yourself, or (for the DM) any member.
  const wanted = (new URLSearchParams(location.search).get("u") || me.username).toLowerCase();
  const { data: owner } = await db.from("profiles").select("id, username, display_name").eq("username", wanted).maybeSingle();
  if (!owner) return say("No one in the party goes by that name.", true);
  if (owner.id !== me.id && me.role !== "dm") return say("Only the DM can create characters for someone else.", true);
  $("back").href = `../profile/?u=${encodeURIComponent(owner.username)}`;
  $("back").textContent = `← ${owner.display_name}`;

  const getJSON = (u) => fetch(u).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  const [SRD, EMBLEMS, POWERS, BGICONS] = await Promise.all([
    getJSON("../srd.json"), getJSON("../icons/creator/manifest.json"), getJSON("../icons/powers/manifest.json"), getJSON("../icons/backgrounds/manifest.json"),
  ]);
  const keyOf = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const LABEL = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };
  const mod = (n) => Math.floor((n - 10) / 2);
  const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);
  const prof = (lv) => 2 + Math.floor((lv - 1) / 4);
  const SKILL_AB = { Acrobatics: "dex", "Animal Handling": "wis", Arcana: "int", Athletics: "str", Deception: "cha", History: "int", Insight: "wis",
    Intimidation: "cha", Investigation: "int", Medicine: "wis", Nature: "int", Perception: "wis", Performance: "cha", Persuasion: "cha",
    Religion: "int", "Sleight of Hand": "dex", Stealth: "dex", Survival: "wis" };

  // The notes' classes first, then the published ones they don't cover.
  const CLASSES = { ...O.CLASSES, ...K.CLASSES };
  const subclassesOf = (cls) => [
    ...(CLASSES[cls].subclasses || []).map((n) => [n, "notes"]),
    ...[...(K.MORE_SUBCLASSES[cls] || []), ...(CLASSES[cls].more || [])].map((n) => [n, "published"]),
  ];
  const BACKGROUNDS = [...O.BACKGROUNDS.map((b) => [b, "notes"]), ...K.MORE_BACKGROUNDS.filter((b) => !O.BACKGROUNDS.includes(b)).map((b) => [b, "published"])];

  // Everything the player has chosen so far.
  const s = {
    name: "", mode: "pure",
    speciesEd: "2024", species: "Human", sub: "", choice: "", humanFeat: "",
    parentA: "Elf", parentB: "Human", inherit: [],
    variant: "None", variantSub: "Crystalline",
    cls: "Fighter", subclass: "", level: 1, spell: "",
    gestalt: false, cls2: "Wizard", subclass2: "", saves: [],
    skills: [],
    method: "standard", base: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }, plus2: "str", plus1: "con",
    background: "Soldier", originFeat: "", improvements: {}, // level → { feat } or { a, b }
    religion: "None", alignment: "Neutral",
  };
  let tab = "species";
  // A species as the chosen rules edition writes it (2014 or 2024, the player's pick).
  function SP(name) {
    const b = O.SPECIES[name];
    return s.speciesEd === "2014" && b.y2014 ? { ...b, ...b.y2014 } : b;
  }
  const PLAYABLE = Object.keys(O.SPECIES).filter((n) => !O.SPECIES[n].npc);
  const variantHuman = () => s.mode === "pure" && s.species === "Human" && s.speciesEd === "2014";
  let focus = null; // what the right-hand panel explains

  /* ---------- derived values ---------- */

  const C = () => CLASSES[s.cls];
  const C2 = () => (s.gestalt ? CLASSES[s.cls2] : null);
  const subOf = (sp) => (O.SPECIES[sp].sub ? s.sub || Object.keys(O.SPECIES[sp].sub)[0] : "");

  // Ability score improvement levels reached. Gestalt (notes): each standard level's two ASIs are
  // worth one point each, and a feat takes both, so it still adds up to 2 points or one feat.
  function asiLevels() {
    const lv = new Set(K.ASI_STANDARD.filter((l) => l <= s.level));
    for (const cls of [s.cls, s.gestalt && s.cls2].filter(Boolean)) for (const l of K.ASI_EXTRA[cls] || []) if (l <= s.level) lv.add(l);
    return [...lv].sort((a, b) => a - b);
  }
  function scores() {
    const out = { ...s.base };
    if (s.plus2) out[s.plus2] += 2;
    if (s.plus1 && s.plus1 !== s.plus2) out[s.plus1] += 1;
    for (const l of asiLevels()) {
      const imp = s.improvements[l];
      if (imp && !imp.feat) for (const a of [imp.a, imp.b]) if (a) out[a] = Math.min(20, out[a] + 1);
    }
    return out;
  }
  const pointsSpent = () => O.ABILITIES.reduce((n, a) => n + (O.POINT_COST[s.base[a]] ?? 99), 0);
  function speciesInfo() {
    if (s.mode === "half") {
      const a = SP(s.parentA), b = SP(s.parentB);
      const sizes = ["Small", "Medium", "Large"];
      const [ia, ib] = [sizes.indexOf(a.size), sizes.indexOf(b.size)];
      const size = ia === ib ? a.size : Math.abs(ia - ib) === 1 ? sizes[Math.min(ia, ib)] : "Medium";
      return { label: `Half-blood ${s.parentA} / ${s.parentB}`, speed: Math.floor((a.speed + b.speed) / 2 / 5) * 5, size,
        need: Math.max(a.traits.length, b.traits.length) };
    }
    const sp = SP(s.species);
    const sub = sp.sub ? sp.sub[subOf(s.species)] : null;
    return { label: [s.species, sp.sub ? `(${subOf(s.species)})` : ""].filter(Boolean).join(" "), speed: (sub && sub.speed) || sp.speed, size: sp.size, sp, sub };
  }
  const savesFor = () => (!s.gestalt ? C().saves : s.saves.length === 2 ? s.saves : []);
  const hitDie = () => Math.max(C().die, C2() ? C2().die : 0);
  function maxHp() {
    const con = mod(scores().con);
    const tough = chosenFeats().includes("Tough") || (s.variant === "Dhampir" && s.variantSub === "Crystalline") ? 2 * s.level : 0;
    return hitDie() + con + (s.level - 1) * (hitDie() / 2 + 1 + con) + tough;
  }
  const isCaster = () => [C(), C2()].some((c) => c && c.spell);
  const chosenFeats = () => [s.originFeat, variantHuman() ? s.humanFeat : "", ...asiLevels().map((l) => s.improvements[l] && s.improvements[l].feat)].filter(Boolean);
  function featBlocked(name) {
    const need = K.FEATS[name] || {};
    if (need.caster && !isCaster()) return "Needs spellcasting or Pact Magic.";
    if (need.any) {
      const sc = scores();
      if (!Object.entries(need.any).some(([a, v]) => sc[a] >= v)) return `Needs ${Object.entries(need.any).map(([a, v]) => `${LABEL[a]} ${v}`).join(" or ")}.`;
    }
    return "";
  }

  // Problems that block creating the character, with the tab that fixes each.
  function problems() {
    const out = [];
    const add = (t, text) => out.push([t, text]);
    if (!s.name.trim()) add("species", "Give your character a name.");
    const info = speciesInfo();
    if (s.mode === "half") {
      if (s.parentA === s.parentB) add("species", "A half-blood needs two different parent species.");
      const fromA = s.inherit.filter((t) => t.startsWith("A:")).length, fromB = s.inherit.filter((t) => t.startsWith("B:")).length;
      if (s.inherit.length !== info.need) add("species", `Choose exactly ${info.need} inherited traits (you have ${s.inherit.length}).`);
      if (!fromA || !fromB) add("species", "Take at least one trait from each parent.");
    }
    if (info.sub && info.sub.noClass && [s.cls, s.gestalt && s.cls2].includes("Wizard")) add("class", "There are no Abyssal Tiefling wizards: magic is outlawed among them.");
    const [n] = C().skills;
    if (s.skills.length !== n) add("class", `Choose ${n} class skills (you have ${s.skills.length}).`);
    if (s.gestalt && s.cls === s.cls2) add("class", "A gestalt character needs two different classes.");
    if (s.gestalt && s.saves.length !== 2) add("class", "Choose two saving throws from your two classes.");
    if (s.method === "point" && pointsSpent() > 27) add("abilities", `Point buy allows 27 points (you spent ${pointsSpent()}).`);
    if (s.method === "standard" && O.ABILITIES.map((a) => s.base[a]).sort((x, y) => y - x).join() !== O.STANDARD_ARRAY.join()) add("abilities", "Use each standard array number once.");
    if (s.plus2 === s.plus1) add("abilities", "Put the +2 and the +1 on different abilities.");
    if (!s.originFeat) add("feats", "Choose your background's origin feat.");
    if (variantHuman() && !s.humanFeat) add("feats", "Choose your Variant Human feat.");
    for (const l of asiLevels()) {
      const imp = s.improvements[l];
      if (!imp || (!imp.feat && !(imp.a && imp.b))) add("feats", `Choose your level ${l} improvement.`);
      else if (imp.feat && featBlocked(imp.feat)) add("feats", `${imp.feat}: ${featBlocked(imp.feat)}`);
    }
    return out;
  }

  /* ---------- small builders ---------- */

  // A glowing emblem from icons/creator (made with tools/icons/icons.py glow), else a lit initial.
  function emblem(key, cls = "") {
    const e = EMBLEMS[keyOf(key)];
    if (e) return el("img", { class: `emblem ${cls}`, src: `../icons/creator/${e.file}`, alt: "" });
    const b = key.startsWith("background ") && BGICONS[keyOf(key)];
    if (b) return el("img", { class: `emblem ${cls}`, src: `../icons/backgrounds/${b.file}`, alt: "" });
    return el("span", { class: `emblem emblem-letter ${cls}`, text: key.replace(/^\w+ /, "").slice(0, 1) });
  }
  const powerImg = (name) => {
    const p = POWERS[keyOf(name)] || POWERS[keyOf(String(name).replace(/\(.*?\)/g, ""))];
    return p ? el("img", { class: "trait-icon", src: `../icons/powers/${p.file}`, alt: "" }) : el("span", { class: "trait-icon is-blank" });
  };
  // A selectable tile. set: "key=value" pairs applied on click; info: what the right panel shows.
  function tile({ label, sub = "", icon, set, on, info, off = "" }) {
    const b = el("button", { type: "button", class: `tile-opt${on ? " is-on" : ""}${off ? " is-off" : ""}`, "data-set": set, "aria-pressed": String(!!on), title: off || label },
      icon || "", el("span", { class: "tile-text" }, el("span", { class: "tile-name", text: label }), sub ? el("span", { class: "tile-sub", text: sub }) : ""));
    b._info = info;
    return b;
  }
  const head = (text, note) => el("div", { class: "list-head" }, el("h2", { text }), note ? el("p", { text: note }) : "");
  const group = (text) => el("p", { class: "list-group", text });
  function check(label, attrs, on, info) {
    const l = el("label", { class: `check-opt${on ? " is-on" : ""}` }, Object.assign(el("input", { type: "checkbox", ...attrs }), { checked: on }), el("span", { text: label }));
    l._info = info;
    return l;
  }

  /* ---------- the right-hand panel ---------- */

  const srdText = (name, types) => {
    const list = SRD[keyOf(name)];
    return Array.isArray(list) ? list.find((e) => !types || types.includes(e.t)) : null;
  };
  function showInfo(i) {
    if (!i) return;
    const body = [
      el("div", { class: "info-head" }, i.icon || "", el("div", {}, el("p", { class: "info-kind", text: i.kind || "" }), el("h2", { text: i.title }))),
    ];
    if (i.meta) body.push(el("p", { class: "info-meta", text: i.meta }));
    if (i.text) body.push(el("p", { class: "info-text", text: i.text }));
    const srd = i.srd && srdText(i.srd, i.srdTypes);
    if (srd) body.push(el("p", { class: "info-text", text: srd.d }), el("p", { class: "info-src", text: "Rules text: SRD 5.1, CC-BY-4.0" }));
    if (i.traits && i.traits.length) {
      body.push(el("ul", { class: "info-traits" }, ...i.traits.map(([n, d]) => el("li", {}, powerImg(n), el("div", {}, el("strong", { text: n }), d ? el("span", { text: d }) : "")))));
    }
    if (i.link) body.push(el("a", { class: "info-link", href: i.link, target: "_blank", rel: "noopener", text: i.linkText || "Full rules on dnd5e.wikidot.com ↗" }));
    $("info").replaceChildren(...body);
  }
  const fromNotes = (src) => (src === "notes" ? "Apotheosis notes (PHB 2014 and 2024)" : "Published 5e book, from dnd5e.wikidot.com");

  /* ---------- info builders ---------- */

  function speciesCard(name, sub) {
    const sp = SP(name);
    if (sp.npc) return { kind: "NPC species", title: name, icon: emblem(`species ${name}`, "info-emblem"), text: K.LORE[name] };
    const subData = sub && sp.sub ? sp.sub[sub] : null;
    const extra = [...(sp.extra || []), ...((subData && subData.extra) || [])];
    return {
      kind: sub ? `${name} ${name === "Tiefling" ? "lineage" : "subspecies"}` : "Species", title: sub || name, icon: emblem(`species ${sub || name}`, "info-emblem"),
      meta: `Builds on the ${sp.base} · ${sp.size} · speed ${(subData && subData.speed) || sp.speed} ft`,
      text: [K.LORE[sub || name], subData && subData.note].filter(Boolean).join(" "),
      traits: [...sp.traits.map((t) => [t, ""]), ...extra.map(([n, , d]) => [n, d])],
    };
  }
  function classCard(name) {
    const c = CLASSES[name];
    return {
      kind: c.monster ? "Monster class (notes, Appendix III)" : c.source ? `Class · ${c.source}` : "Class", title: name, icon: emblem(`class ${name}`, "info-emblem"),
      meta: `Hit die d${c.die} · saves ${c.saves.map((a) => LABEL[a]).join(", ")}${c.spell ? ` · casts with ${LABEL[c.spell]}` : ""}`,
      text: [c.note, c.spellNote].filter(Boolean).join(" "),
      traits: c.features ? c.features.map(([lv, n]) => [n, `Level ${lv}`]) : [],
      link: c.monster ? "" : K.link.class(name), linkText: "Class and subclass rules on dnd5e.wikidot.com ↗",
    };
  }

  /* ---------- tabs ---------- */

  const TABS = [["species", "Species"], ["class", "Class"], ["background", "Background"], ["abilities", "Abilities"], ["feats", "Feats"], ["belief", "Belief"]];

  function listSpecies() {
    const out = [head("Species", "Only the species of the Apotheosis notes."),
      el("div", { class: "seg" }, ...[["pure", "One species"], ["half", "Half-blood"]].map(([v, t]) =>
        el("button", { type: "button", class: s.mode === v ? "is-on" : "", "data-set": `mode=${v}`, text: t }))),
      group("Species rules"),
      el("div", { class: "seg" }, ...[["2024", "2024 PHB"], ["2014", "2014 rules"]].map(([v, t]) =>
        el("button", { type: "button", class: s.speciesEd === v ? "is-on" : "", "data-set": `speciesEd=${v}`, text: t }))),
      el("p", { class: "list-note", text: s.speciesEd === "2014"
        ? "2014 traits (PHB, or Monsters of the Multiverse where the PHB has none). As the 2024 PHB rules for older species, ignore the species' ability increases: your +2 and +1 still come from your background."
        : "2024 PHB traits. The notes' own changes apply in both editions." })];
    if (s.mode === "pure") {
      out.push(el("div", { class: "tile-grid" }, ...Object.keys(O.SPECIES).map((n) => O.SPECIES[n].npc
        ? tile({ label: n, sub: "NPC only", icon: emblem(`species ${n}`), set: `species=${n}`, on: false, off: "NPC only: not playable", info: speciesCard(n) })
        : tile({ label: n, icon: emblem(`species ${n}`), set: `species=${n}`, on: s.species === n, info: speciesCard(n) }))));
      const sp = SP(s.species);
      if (sp.sub) {
        out.push(group(s.species === "Tiefling" ? "Lineage" : "Subspecies"), el("div", { class: "tile-grid" }, ...Object.keys(sp.sub).map((n) =>
          tile({ label: n, sub: sp.sub[n].dm ? "DM's discretion" : "", icon: emblem(`species ${n}`), set: `sub=${n}`, on: subOf(s.species) === n, info: speciesCard(s.species, n) }))));
      }
      if (sp.choice) {
        out.push(group(sp.choice[0]), el("div", { class: "tile-grid tile-grid-small" }, ...sp.choice[1].map((n) =>
          tile({ label: n, icon: emblem(`ancestry ${n.split(" ")[0]}`), set: `choice=${n}`, on: (s.choice || sp.choice[1][0]) === n,
            info: { kind: sp.choice[0], title: n, icon: emblem(`ancestry ${n.split(" ")[0]}`, "info-emblem"), text: `Part of your ${s.species} build: ${sp.base}.` } }))));
      }
    } else {
      const parents = PLAYABLE.filter((k) => !O.SPECIES[k].noHalfBlood);
      const info = speciesInfo();
      for (const [side, key] of [["First parent", "parentA"], ["Second parent", "parentB"]]) {
        out.push(group(side), el("div", { class: "tile-grid tile-grid-small" }, ...parents.map((n) =>
          tile({ label: n, icon: emblem(`species ${n}`), set: `${key}=${n}`, on: s[key] === n, info: speciesCard(n) }))));
      }
      out.push(group(`Inherited traits: ${s.inherit.length} of ${info.need}, at least one from each parent`));
      for (const [side, sp] of [["A", s.parentA], ["B", s.parentB]]) {
        out.push(el("div", { class: "check-list" }, el("p", { class: "check-head", text: `From the ${sp}` }),
          ...SP(sp).traits.map((t) => check(t, { "data-inherit": `${side}:${t}` }, s.inherit.includes(`${side}:${t}`), { kind: `${sp} trait`, title: t, icon: powerImg(t), text: `Gained exactly as written for the ${SP(sp).base}.` }))));
      }
    }
    out.push(group("Variant species"), el("div", { class: "tile-grid tile-grid-small" }, ...Object.keys(O.VARIANTS).map((n) =>
      tile({ label: n, icon: emblem(`variant ${n}`), set: `variant=${n}`, on: s.variant === n,
        info: { kind: "Variant species (notes)", title: n, icon: emblem(`variant ${n}`, "info-emblem"), text: n === "None" ? "No curse, blessing or mutation." : K.LORE[n],
          traits: (O.VARIANTS[n].features || []).map(([f, , d]) => [f, d]) } }))));
    const v = O.VARIANTS[s.variant];
    if (v.sub) {
      out.push(group("Dhampir strain"), el("div", { class: "tile-grid tile-grid-small" }, ...Object.keys(v.sub).map((n) =>
        tile({ label: n, set: `variantSub=${n}`, on: s.variantSub === n, icon: emblem(`variant ${s.variant}`),
          info: { kind: "Dhampir strain", title: n, traits: v.sub[n].features.map(([f, , d]) => [f, d]) } }))));
    }
    return out;
  }

  function listClass() {
    const names = Object.keys(CLASSES);
    const out = [head("Class", "The notes' classes first. Lore wins any clash, such as the paladin casting with Wisdom."),
      el("div", { class: "tile-grid" }, ...names.map((n) => {
        const bad = s.mode === "pure" && speciesInfo().sub && (speciesInfo().sub.noClass || []).includes(n);
        return tile({ label: n, sub: CLASSES[n].monster ? "DM's approval" : CLASSES[n].tag || "", icon: emblem(`class ${n}`), set: `cls=${n}`, on: s.cls === n, off: bad ? "Not open to Abyssal Tieflings" : "", info: classCard(n) });
      }))];
    const subs = subclassesOf(s.cls);
    if (subs.length) {
      out.push(group(`${s.cls} subclass`), el("div", { class: "row-list" },
        tile({ label: "Decide later", set: "subclass=", on: !s.subclass, info: { kind: "Subclass", title: "Decide later", text: "Pick it when your class reaches its subclass level. The DM can add it to your sheet." } }),
        ...subs.map(([n, src], i) => [
          i === 0 || subs[i - 1][1] !== src ? group(src === "notes" ? "From the notes (PHB)" : "Other published books") : "",
          tile({ label: n, set: `subclass=${n}`, on: s.subclass === n, icon: emblem(`class ${s.cls}`),
            info: { kind: `${s.cls} subclass`, title: n, icon: emblem(`class ${s.cls}`, "info-emblem"), meta: fromNotes(src), srd: n, srdTypes: ["feature"], link: K.link.class(s.cls), linkText: `${s.cls} subclasses on dnd5e.wikidot.com ↗` } }),
        ]).flat()));
    }
    const c = C();
    if (c.spell) {
      out.push(group("Spellcasting ability"), el("div", { class: "seg" }, ...[c.spell, ...(c.spellAlt || [])].map((a) =>
        el("button", { type: "button", class: (s.spell || c.spell) === a ? "is-on" : "", "data-set": `spell=${a}`, text: LABEL[a] }))));
      if (c.spellNote) out.push(el("p", { class: "list-note", text: c.spellNote }));
    }
    const [n, list] = c.skills;
    out.push(group(`Class skills: choose ${n} (${s.skills.length} chosen)`), el("div", { class: "check-list check-cols" },
      ...list.map((k) => check(k, { "data-skill": k, ...(s.skills.length >= n && !s.skills.includes(k) ? { disabled: "" } : {}) }, s.skills.includes(k), { kind: `${LABEL[SKILL_AB[k]]} skill`, title: k, text: `A ${LABEL[SKILL_AB[k]]} check you add your proficiency bonus to.` }))));
    out.push(group("Gestalt (notes)"), check("Gestalt character: two classes at every level", { "data-gestalt": "1" }, s.gestalt,
      { kind: "Homebrew rule (notes)", title: "Gestalt character", text: "Two classes at every level, with the better of any overlapping feature. Only at the start of the campaign, at the DM's discretion, generally for parties of three or fewer. Hit dice: the larger. Saves: choose two from both classes. Spell slots: the better table, except a warlock keeps Pact Magic beside the other caster's slots. ASIs at 4, 8, 12, 16 and 19 are worth one point each; a feat takes both." }));
    if (s.gestalt) {
      out.push(group("Second class"), el("div", { class: "tile-grid tile-grid-small" }, ...names.filter((x) => x !== s.cls).map((x) =>
        tile({ label: x, icon: emblem(`class ${x}`), set: `cls2=${x}`, on: s.cls2 === x, info: classCard(x) }))));
      const subs2 = subclassesOf(s.cls2);
      if (subs2.length) {
        out.push(group(`${s.cls2} subclass`), el("div", { class: "row-list" },
          tile({ label: "Decide later", set: "subclass2=", on: !s.subclass2 }),
          ...subs2.map(([x, src]) => tile({ label: x, sub: src === "notes" ? "" : "Published", set: `subclass2=${x}`, on: s.subclass2 === x,
            info: { kind: `${s.cls2} subclass`, title: x, meta: fromNotes(src), link: K.link.class(s.cls2) } }))));
      }
      const pool = [...new Set([...c.saves, ...C2().saves])];
      out.push(group(`Saving throws: choose two (${s.saves.length} chosen)`), el("div", { class: "check-list check-cols" },
        ...pool.map((a) => check(LABEL[a], { "data-save": a, ...(s.saves.length >= 2 && !s.saves.includes(a) ? { disabled: "" } : {}) }, s.saves.includes(a), { kind: "Saving throw", title: LABEL[a] }))));
    }
    return out;
  }

  function listBackground() {
    return [head("Background", "Its name and story stay yours to rewrite on the Inspiration tab. The +2 and +1 and the origin feat come from it."),
      el("div", { class: "row-list" }, ...BACKGROUNDS.map(([n, src], i) => [
        i === 0 || BACKGROUNDS[i - 1][1] !== src ? group(src === "notes" ? "PHB 2014 and 2024 (notes)" : "Other published books") : "",
        tile({ label: n, icon: emblem(`background ${n}`), set: `background=${n}`, on: s.background === n,
          info: { kind: "Background", title: n, icon: emblem(`background ${n}`, "info-emblem"), meta: fromNotes(src), srd: n, srdTypes: ["background"], link: K.link.background(n) } }),
      ]).flat())];
  }

  function listAbilities() {
    const final = scores();
    const rows = O.ABILITIES.map((a) => {
      let control;
      if (s.method === "point") {
        control = el("span", { class: "stepper" },
          el("button", { type: "button", "data-step": `${a}:-1`, "aria-label": `Lower ${LABEL[a]}`, text: "−", ...(s.base[a] <= 8 ? { disabled: "" } : {}) }),
          el("b", { text: s.base[a] }),
          el("button", { type: "button", "data-step": `${a}:1`, "aria-label": `Raise ${LABEL[a]}`, text: "+", ...(s.base[a] >= 15 ? { disabled: "" } : {}) }));
      } else if (s.method === "standard") {
        const sel = el("select", { "data-base": a, "aria-label": LABEL[a] }, ...O.STANDARD_ARRAY.map((v) => el("option", { value: v, text: v })));
        sel.value = s.base[a];
        control = sel;
      } else {
        control = el("input", { "data-base": a, value: s.base[a], inputmode: "numeric", class: "mini", "aria-label": LABEL[a] });
      }
      const row = el("div", { class: "ab-row" },
        el("span", { class: "ab-name", text: LABEL[a] }), control,
        el("button", { type: "button", class: `ab-bonus${s.plus2 === a ? " is-on" : ""}`, "data-set": `plus2=${a}`, text: "+2", title: "Background +2" }),
        el("button", { type: "button", class: `ab-bonus${s.plus1 === a ? " is-on" : ""}`, "data-set": `plus1=${a}`, text: "+1", title: "Background +1" }),
        el("span", { class: "ab-final", text: final[a] }), el("span", { class: "ab-mod", text: signed(mod(final[a])) }));
      row._info = { kind: "Ability", title: LABEL[a], srd: LABEL[a] };
      return row;
    });
    return [head("Abilities", s.method === "point" ? `${27 - pointsSpent()} of 27 points left.` : s.method === "standard" ? "Use 15, 14, 13, 12, 10 and 8 once each." : "Enter rolled or agreed scores."),
      el("div", { class: "seg" }, ...[["standard", "Standard array"], ["point", "Point buy"], ["manual", "Rolled"]].map(([v, t]) =>
        el("button", { type: "button", class: s.method === v ? "is-on" : "", "data-set": `method=${v}`, text: t }))),
      el("div", { class: "ab-head" }, el("span", { text: "Ability" }), el("span", { text: "Base" }), el("span", { text: "Background" }), el("span", {}), el("span", { text: "Score" }), el("span", {})),
      ...rows,
      el("p", { class: "list-note", text: "The background's +2 and +1 go on two different abilities (2024 PHB). Improvements from the Feats tab are added on top, up to 20." })];
  }

  function featOptions(current) {
    return Object.keys(K.FEATS).sort().map((f) => {
      const why = featBlocked(f);
      return el("option", { value: f, text: why ? `${f} (${why.replace(/\.$/, "")})` : f, ...(why && f !== current ? { disabled: "" } : {}) });
    });
  }
  function listFeats() {
    const out = [head("Feats", "Your background's origin feat, then an improvement at each ASI level you have reached.")];
    const origin = el("select", { "data-origin": "1", "aria-label": "Origin feat" }, el("option", { value: "", text: "Choose an origin feat" }), ...K.ORIGIN.map((f) => el("option", { value: f, text: f })));
    origin.value = s.originFeat;
    const oRow = el("div", { class: "feat-row" }, el("span", { class: "feat-lv", text: "1" }), el("div", {}, el("p", { class: "feat-what", text: "Origin feat (background)" }), origin));
    oRow._info = s.originFeat ? featInfo(s.originFeat) : { kind: "Feat", title: "Origin feat", text: "In the 2024 PHB every background grants an origin feat." };
    out.push(oRow);
    if (variantHuman()) {
      const hf = el("select", { "data-human": "1", "aria-label": "Variant Human feat" }, el("option", { value: "", text: "Choose a feat" }), ...featOptions(s.humanFeat));
      hf.value = s.humanFeat;
      const hRow = el("div", { class: "feat-row" }, el("span", { class: "feat-lv", text: "1" }), el("div", {}, el("p", { class: "feat-what", text: "Variant Human feat (2014 species)" }), hf));
      hRow._info = s.humanFeat ? featInfo(s.humanFeat) : { kind: "Feat", title: "Variant Human feat", text: "The 2014 Variant Human gains one feat of your choice at level 1, besides the origin feat from your background." };
      out.push(hRow);
    }
    const lv = asiLevels();
    if (!lv.length) out.push(el("p", { class: "list-note", text: "No ability score improvements yet: the first comes at level 4." }));
    for (const l of lv) {
      const imp = s.improvements[l] || {};
      const kindSel = el("select", { "data-imp": `${l}:kind`, "aria-label": `Level ${l} improvement` },
        el("option", { value: "asi", text: "Ability score improvement" }), el("option", { value: "feat", text: "A feat" }));
      kindSel.value = imp.feat !== undefined ? "feat" : "asi";
      const body = [el("p", { class: "feat-what", text: `Level ${l}${(K.ASI_EXTRA[s.cls] || []).includes(l) || (s.gestalt && (K.ASI_EXTRA[s.cls2] || []).includes(l)) ? " (class bonus ASI)" : ""}` }), kindSel];
      if (kindSel.value === "feat") {
        const f = el("select", { "data-imp": `${l}:feat`, "aria-label": `Level ${l} feat` }, el("option", { value: "", text: "Choose a feat" }), ...featOptions(imp.feat));
        f.value = imp.feat || "";
        body.push(f);
      } else {
        for (const part of ["a", "b"]) {
          const a = el("select", { "data-imp": `${l}:${part}`, "aria-label": `Level ${l} +1` }, el("option", { value: "", text: "+1 to…" }), ...O.ABILITIES.map((x) => el("option", { value: x, text: `+1 ${LABEL[x]}` })));
          a.value = imp[part] || "";
          body.push(a);
        }
      }
      const row = el("div", { class: "feat-row" }, el("span", { class: "feat-lv", text: l }), el("div", {}, ...body));
      row._info = imp.feat ? featInfo(imp.feat) : { kind: "Ability score improvement", title: `Level ${l}`, text: s.gestalt && K.ASI_STANDARD.includes(l) ? "Gestalt (notes): each class's ASI at this level is worth one point, so you get two points in all, or both ASIs spent on one feat." : "Two +1s (or +2 to one ability, by picking it twice), up to 20, or a feat instead." };
      out.push(row);
    }
    out.push(group("Racial feats (WIP)"), el("div", { class: "row-list" }, ...K.RACIAL_WIP.map((n) =>
      tile({ label: `${n} racial feats`, sub: "WIP", icon: emblem(`species ${n}`), set: "", on: false, off: "Work in progress",
        info: { kind: "Racial feat · WIP", title: `${n} racial feats`, icon: emblem(`species ${n}`, "info-emblem"), text: "Placeholder. Custom racial feats for this species are being written for Apotheosis and aren't available yet." } }))));
    return out;
  }
  function featInfo(f) {
    const need = K.FEATS[f] || {};
    const reqs = [need.any && Object.entries(need.any).map(([a, v]) => `${LABEL[a]} ${v}`).join(" or "), need.caster && "spellcasting or Pact Magic", need.note].filter(Boolean);
    return { kind: K.ORIGIN.includes(f) ? "Origin feat" : "Feat", title: f, meta: reqs.length ? `Prerequisite: ${reqs.join("; ")}` : "No prerequisite", srd: f, srdTypes: ["feat"], link: K.link.feat(f) };
  }

  function listBelief() {
    return [head("Belief", "The religions of the notes, each with its alignment."),
      el("div", { class: "row-list" }, ...O.RELIGIONS.map(([r, al]) => tile({ label: r, sub: al, icon: emblem(`religion ${r}`), set: `religion=${r}`, on: s.religion === r,
        info: { kind: "Religion (notes)", title: r, icon: emblem(`religion ${r}`, "info-emblem"), meta: al || "", text: r === "Gnocism" ? "The belief in a hidden, uncorrupted supreme being and a flawed demiurge, the palm of creation. The church of Avaticana sits in Romulon; the Pontifex is Father Indorilius." : r === "None" ? "You follow no faith." : "" } }))),
      group("Alignment"),
      el("div", { class: "align-grid" }, ...O.ALIGNMENTS.map((a) => el("button", { type: "button", class: s.alignment === a ? "is-on" : "", "data-set": `alignment=${a}`, text: a })))];
  }

  /* ---------- centre stage ---------- */

  function renderStage() {
    const info = speciesInfo();
    const final = scores();
    const speciesKey = s.mode === "half" ? "species Half-blood" : `species ${subOf(s.species) || s.species}`;
    const nameInput = el("input", { id: "cc-name", "data-name": "1", value: s.name, maxlength: "60", placeholder: "Name your character", "aria-label": "Character name" });
    $("stage").replaceChildren(
      el("div", { class: "stage-emblems" }, emblem(speciesKey, "stage-back"), emblem(`class ${s.cls}`, "stage-front"), s.gestalt ? emblem(`class ${s.cls2}`, "stage-second") : ""),
      el("p", { class: "stage-line", text: `${info.label}${s.variant !== "None" ? ` · ${s.variant}${O.VARIANTS[s.variant].sub ? ` (${s.variantSub})` : ""}` : ""}` }),
      el("p", { class: "stage-line stage-class", text: `${s.cls}${s.subclass ? `: ${s.subclass}` : ""}${s.gestalt ? ` / ${s.cls2}${s.subclass2 ? `: ${s.subclass2}` : ""}` : ""}` }),
      el("div", { class: "stage-level" },
        el("button", { type: "button", "data-level": "-1", "aria-label": "Lower level", text: "−", ...(s.level <= 1 ? { disabled: "" } : {}) }),
        el("span", {}, el("small", { text: "Level" }), el("b", { text: s.level })),
        el("button", { type: "button", "data-level": "1", "aria-label": "Raise level", text: "+", ...(s.level >= 20 ? { disabled: "" } : {}) })),
      el("dl", { class: "stage-stats" },
        ...[["HP", maxHp()], ["AC", 10 + mod(final.dex)], ["Speed", `${info.speed} ft${s.variant === "Dhampir" ? " +10 m" : ""}`], ["Prof", signed(prof(s.level))]]
          .map(([k, v]) => el("div", {}, el("dt", { text: k }), el("dd", { text: v })))),
      el("div", { class: "stage-abilities" }, ...O.ABILITIES.map((a) => el("div", {}, el("span", { text: a }), el("b", { text: final[a] }), el("small", { text: signed(mod(final[a])) })))),
      el("p", { class: "stage-line", text: [s.background, s.religion !== "None" ? s.religion : "", s.alignment].filter(Boolean).join(" · ") }),
      el("label", { class: "stage-name" }, nameInput));
  }

  /* ---------- render ---------- */

  function render() {
    $("tabs").replaceChildren(...TABS.map(([k, t], i) => el("button", { type: "button", role: "tab", "aria-selected": String(tab === k), "data-tab": k },
      el("span", { class: "tab-n", text: i + 1 }), t, problems().some(([pt]) => pt === k) ? el("span", { class: "tab-dot", title: "Something to choose here" }) : "")));
    const lists = { species: listSpecies, class: listClass, background: listBackground, abilities: listAbilities, feats: listFeats, belief: listBelief };
    const scroll = $("list").scrollTop;
    $("list").replaceChildren(...lists[tab]());
    $("list").scrollTop = scroll;
    renderStage();
    const bad = problems();
    $("problems").replaceChildren(...bad.slice(0, 4).map(([t, p]) => el("li", {}, el("button", { type: "button", class: "link-button", "data-tab": t, text: p }))),
      bad.length > 4 ? el("li", { text: `and ${bad.length - 4} more` }) : "");
    const last = tab === TABS[TABS.length - 1][0];
    $("prev").disabled = tab === TABS[0][0];
    $("next").textContent = last ? "Create character" : "Next";
    $("next").classList.toggle("is-final", last);
    $("next").disabled = last && bad.length > 0;
    if (!focus) focus = defaultFocus();
    showInfo(focus);
  }
  function defaultFocus() {
    if (tab === "species") return s.mode === "half" ? { kind: "Species", title: "Half-blood", icon: emblem("species Half-blood", "info-emblem"), text: K.LORE["Half-blood"], traits: O.HALF_BLOOD.base.map(([n, , d]) => [n, d]) } : speciesCard(s.species, O.SPECIES[s.species].sub ? subOf(s.species) : "");
    if (tab === "class") return classCard(s.cls);
    if (tab === "background") return { kind: "Background", title: s.background, icon: emblem(`background ${s.background}`, "info-emblem"), link: K.link.background(s.background) };
    if (tab === "feats") return s.originFeat ? featInfo(s.originFeat) : { kind: "Feats", title: "Feats", text: "Pick an origin feat, then for each ASI level either two ability points or a feat. Feats you don't meet the prerequisite for are greyed out." };
    if (tab === "belief") return { kind: "Belief", title: s.religion, icon: emblem(`religion ${s.religion}`, "info-emblem") };
    return { kind: "Abilities", title: "Ability scores", text: "Choose your base scores, then where your background's +2 and +1 go." };
  }

  /* ---------- reading choices ---------- */

  const root = $("creator");
  // Hovering an option previews it on the right; leaving returns to the current choice.
  root.addEventListener("mouseover", (e) => {
    const t = e.target.closest(".tile-opt, .check-opt, .ab-row, .feat-row");
    if (t && t._info) showInfo(t._info);
  });
  $("list").addEventListener("mouseleave", () => showInfo(focus || defaultFocus()));

  root.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.tab) { tab = t.dataset.tab; focus = null; render(); $("list").scrollTop = 0; return; }
    if (t.id === "prev" || t.id === "next") {
      const i = TABS.findIndex(([k]) => k === tab);
      if (t.id === "next" && i === TABS.length - 1) return create();
      tab = TABS[Math.max(0, Math.min(TABS.length - 1, i + (t.id === "next" ? 1 : -1)))][0];
      focus = null; render(); $("list").scrollTop = 0; return;
    }
    if (t.dataset.level) { s.level = Math.max(1, Math.min(20, s.level + Number(t.dataset.level))); render(); return; }
    if (t.dataset.step) {
      const [a, d] = t.dataset.step.split(":");
      s.base[a] = Math.max(8, Math.min(15, s.base[a] + Number(d)));
      render(); return;
    }
    if (t.dataset.set !== undefined) {
      const [k, ...rest] = t.dataset.set.split("=");
      const v = rest.join("=");
      if (!k) { focus = t._info || null; render(); return; }
      if (k === "species" && O.SPECIES[v] && O.SPECIES[v].npc) { focus = t._info || null; render(); return; }
      s[k] = v;
      if (k === "species" || k === "speciesEd") { s.sub = k === "species" ? "" : s.sub; s.choice = ""; s.inherit = k === "speciesEd" ? [] : s.inherit; }
      if (k === "cls") { s.subclass = ""; s.spell = ""; s.skills = []; s.saves = []; if (s.cls2 === s.cls) s.cls2 = Object.keys(CLASSES).find((n) => n !== s.cls); }
      if (k === "cls2") { s.subclass2 = ""; s.saves = []; }
      if (k === "parentA" || k === "parentB" || k === "mode") s.inherit = [];
      if (k === "variant") s.variantSub = "Crystalline";
      if (k === "method") {
        if (v === "standard") s.base = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
        if (v === "point") s.base = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
      }
      focus = t._info || null;
      render();
    }
  });

  root.addEventListener("input", (e) => {
    if (e.target.dataset.name) s.name = e.target.value;
  });
  root.addEventListener("change", (e) => {
    const t = e.target;
    const d = t.dataset;
    if (d.name) { s.name = t.value; render(); return; }
    if (d.inherit) s.inherit = t.checked ? [...s.inherit, d.inherit] : s.inherit.filter((x) => x !== d.inherit);
    else if (d.skill) s.skills = t.checked ? [...s.skills, d.skill] : s.skills.filter((x) => x !== d.skill);
    else if (d.save) s.saves = t.checked ? [...s.saves, d.save] : s.saves.filter((x) => x !== d.save);
    else if (d.gestalt) { s.gestalt = t.checked; s.saves = []; if (s.cls2 === s.cls) s.cls2 = Object.keys(CLASSES).find((n) => n !== s.cls); }
    else if (d.base) s.base[d.base] = Math.max(1, Math.min(20, parseInt(t.value, 10) || 8));
    else if (d.origin !== undefined) { s.originFeat = t.value; focus = t.value ? featInfo(t.value) : null; }
    else if (d.human !== undefined) { s.humanFeat = t.value; focus = t.value ? featInfo(t.value) : null; }
    else if (d.imp) {
      const [l, part] = d.imp.split(":");
      const imp = { ...(s.improvements[l] || {}) };
      if (part === "kind") s.improvements[l] = t.value === "feat" ? { feat: "" } : {};
      else { imp[part] = t.value; s.improvements[l] = imp; if (part === "feat" && t.value) focus = featInfo(t.value); }
    } else return;
    render();
  });

  /* ---------- building the character ---------- */

  // SRD class features up to a level (not subclass ones), from the meta line "Cleric feature, level 2".
  function srdClassFeatures(cls, level) {
    const out = [];
    const seen = new Set();
    for (const list of Object.values(SRD)) {
      if (!Array.isArray(list)) continue;
      for (const e of list) {
        const m = e.t === "feature" && /^(\w+) feature, level (\d+)$/.exec(e.m);
        if (m && m[1] === cls && Number(m[2]) <= level && !seen.has(e.n)) { seen.add(e.n); out.push([Number(m[2]), e.n]); }
      }
    }
    return out.sort((a, b) => a[0] - b[0]);
  }

  function features() {
    const f = [];
    const add = (name, kind = "feature", desc = "", extra = {}) => {
      if (!f.some((x) => x.name === name)) f.push({ kind, name, ...(desc ? { desc } : {}), ...extra });
    };
    if (s.mode === "half") {
      for (const [n, k, d] of O.HALF_BLOOD.base) add(n, k, d);
      for (const t of s.inherit) add(t.slice(2), "feature", `Inherited from your ${t[0] === "A" ? s.parentA : s.parentB} parent.`);
    } else {
      const info = speciesInfo();
      for (const t of info.sp.traits) add(t);
      if (info.sp.choice) add(`${info.sp.choice[0]}: ${s.choice || info.sp.choice[1][0]}`);
      for (const [n, k, d] of [...(info.sp.extra || []), ...((info.sub && info.sub.extra) || [])]) add(n, k, d);
    }
    const v = O.VARIANTS[s.variant];
    const vf = [...(v.features || []), ...((v.sub && v.sub[s.variantSub] && v.sub[s.variantSub].features) || [])];
    for (const [n, k, d, opt = {}] of vf) {
      add(n, k, d, {
        ...(opt.formula ? { formula: opt.formula(s.level) } : {}),
        ...(opt.uses === "PB" ? { uses: String(prof(s.level)) } : {}),
      });
    }
    for (const cls of [s.cls, s.gestalt ? s.cls2 : null].filter(Boolean)) {
      const c = CLASSES[cls];
      if (c.features) for (const [lv, n, kind = "feature", uses] of c.features) { if (lv <= s.level) add(n, kind, "", uses ? { uses } : {}); }
      else for (const [, n] of srdClassFeatures(cls, s.level)) add(n);
    }
    for (const feat of chosenFeats()) add(feat, "feature", "Feat.");
    return f;
  }

  async function create() {
    if (problems().length) { tab = problems()[0][0]; render(); return; }
    const info = speciesInfo();
    const final = scores();
    const c = C();
    const hp = maxHp();
    const speciesText = s.mode === "half" ? `${s.parentA} / ${s.parentB} half-blood` : info.label;
    const data = {
      abilities: final,
      saves: savesFor(),
      hp: { cur: hp, max: hp, temp: 0 },
      ac: 10 + mod(final.dex),
      speed: [`${info.speed} ft${s.variant === "Dhampir" ? " +10 m (dhampir)" : ""}`],
      skills: s.skills,
      languages: ["Common"],
      features: features(),
      alignment: s.alignment,
      religion: s.religion !== "None" ? s.religion : null,
      background: { name: s.background, story: "" },
      // The rules decisions, kept apart from the flavour the player can rewrite.
      build: {
        species: s.mode === "half" ? { halfBlood: [s.parentA, s.parentB], inherit: s.inherit.map((t) => t.slice(2)), rules: s.speciesEd } : { species: s.species, sub: subOf(s.species) || null, choice: s.choice || null, rules: s.speciesEd },
        variant: s.variant !== "None" ? { variant: s.variant, strain: O.VARIANTS[s.variant].sub ? s.variantSub : null } : null,
        classes: [{ cls: s.cls, subclass: s.subclass || null }, ...(s.gestalt ? [{ cls: s.cls2, subclass: s.subclass2 || null }] : [])],
        gestalt: s.gestalt,
        spellcasting: c.spell ? s.spell || c.spell : null,
        abilityMethod: s.method, baseScores: s.base, increases: { [s.plus2]: 2, [s.plus1]: 1 },
        background: s.background, originFeat: s.originFeat, ...(variantHuman() ? { speciesFeat: s.humanFeat } : {}),
        improvements: Object.fromEntries(asiLevels().map((l) => [l, s.improvements[l]])),
      },
    };
    const classText = `${s.cls}${s.subclass ? ` (${s.subclass})` : ""}${s.gestalt ? ` / ${s.cls2}${s.subclass2 ? ` (${s.subclass2})` : ""}` : ""}`;
    const btn = $("next");
    btn.disabled = true;
    const { data: row, error } = await db.from("characters")
      .insert({ owner_id: owner.id, name: s.name.trim(), species: speciesText.slice(0, 60), class: classText.slice(0, 80), level: s.level, data })
      .select("id").single();
    btn.disabled = false;
    if (error) return say(error.message, true);
    location.href = `../character/?id=${row.id}`;
  }

  render();
})();
