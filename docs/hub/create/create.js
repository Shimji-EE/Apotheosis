// Character creator: the rules choices from the Apotheosis Manual. Flavour (background
// name and story, goals, traits, portrait) is left to the player on the dashboard.
(async () => {
  const { db, $, say, el, requireMember } = window.Hub;
  const O = window.CreatorOptions;
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

  const SRD = await fetch("../srd.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  const keyOf = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const LABEL = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };
  const mod = (n) => Math.floor((n - 10) / 2);
  const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);

  // Everything the player has chosen so far.
  const s = {
    name: "", mode: "pure",
    species: "Human", sub: "", choice: "",
    parentA: "Elf", parentB: "Human", inherit: [],
    variant: "None", variantSub: "None",
    cls: "Fighter", subclass: "", level: 1, spell: "",
    gestalt: false, cls2: "Wizard", subclass2: "", saves: [],
    skills: [],
    method: "standard", base: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }, plus2: "str", plus1: "con",
    background: "Soldier", religion: "None", alignment: "Neutral",
  };

  /* ---------- derived values ---------- */

  const C = () => O.CLASSES[s.cls];
  const C2 = () => (s.gestalt ? O.CLASSES[s.cls2] : null);
  const subOf = (sp) => (O.SPECIES[sp].sub ? s.sub || Object.keys(O.SPECIES[sp].sub)[0] : "");

  function scores() {
    const out = { ...s.base };
    if (s.plus2) out[s.plus2] += 2;
    if (s.plus1 && s.plus1 !== s.plus2) out[s.plus1] += 1;
    return out;
  }
  function pointsSpent() {
    return O.ABILITIES.reduce((n, a) => n + (O.POINT_COST[s.base[a]] ?? 99), 0);
  }
  function speciesInfo() {
    if (s.mode === "half") {
      const a = O.SPECIES[s.parentA], b = O.SPECIES[s.parentB];
      const sizes = ["Small", "Medium", "Large"];
      const [ia, ib] = [sizes.indexOf(a.size), sizes.indexOf(b.size)];
      const size = ia === ib ? a.size : Math.abs(ia - ib) === 1 ? sizes[Math.min(ia, ib)] : "Medium";
      return { label: `Half-blood ${s.parentA} / ${s.parentB}`, speed: Math.floor((a.speed + b.speed) / 2 / 5) * 5, size,
        need: Math.max(a.traits.length, b.traits.length) };
    }
    const sp = O.SPECIES[s.species];
    const sub = sp.sub ? sp.sub[subOf(s.species)] : null;
    return { label: [s.species, sp.sub ? `(${subOf(s.species)})` : ""].filter(Boolean).join(" "), speed: (sub && sub.speed) || sp.speed, size: sp.size, sp, sub };
  }
  function savesFor() {
    if (!s.gestalt) return C().saves;
    return s.saves.length === 2 ? s.saves : [];
  }
  function hitDie() {
    return Math.max(C().die, C2() ? C2().die : 0);
  }
  function maxHp() {
    const con = mod(scores().con);
    return hitDie() + con + (s.level - 1) * (hitDie() / 2 + 1 + con);
  }

  // Problems that block creating the character.
  function problems() {
    const out = [];
    if (!s.name.trim()) out.push("Give your character a name.");
    if (s.mode === "half") {
      if (s.parentA === s.parentB) out.push("A half-blood needs two different parent species.");
      const info = speciesInfo();
      const fromA = s.inherit.filter((t) => t.startsWith("A:")).length, fromB = s.inherit.filter((t) => t.startsWith("B:")).length;
      if (s.inherit.length !== info.need) out.push(`Choose exactly ${info.need} inherited traits (you have ${s.inherit.length}).`);
      if (!fromA || !fromB) out.push("Take at least one trait from each parent.");
    }
    const info = speciesInfo();
    if (info.sub && info.sub.noClass && [s.cls, s.gestalt && s.cls2].includes("Wizard")) out.push("There are no Abyssal Tiefling wizards: magic is outlawed among them.");
    const [n] = C().skills;
    if (s.skills.length !== n) out.push(`Choose ${n} class skills (you have ${s.skills.length}).`);
    if (s.gestalt && s.cls === s.cls2) out.push("A gestalt character needs two different classes.");
    if (s.gestalt && s.saves.length !== 2) out.push("Choose two saving throws from your two classes.");
    if (s.method === "point" && pointsSpent() > 27) out.push(`Point buy allows 27 points (you spent ${pointsSpent()}).`);
    if (s.method === "standard") {
      const used = O.ABILITIES.map((a) => s.base[a]).sort((x, y) => y - x).join();
      if (used !== O.STANDARD_ARRAY.join()) out.push("Use each standard array number once.");
    }
    if (s.plus2 === s.plus1) out.push("Put the +2 and the +1 on different abilities.");
    return out;
  }

  /* ---------- form building helpers ---------- */

  const field = (label, control, note) => el("label", { class: "cfield" }, el("span", { text: label }), control, note ? el("small", { text: note }) : "");
  function select(key, options, value) {
    const sel = el("select", { "data-k": key },
      ...options.map((o) => (Array.isArray(o) ? el("option", { value: o[0], text: o[1] }) : el("option", { value: o, text: o }))));
    sel.value = value ?? s[key];
    return sel;
  }
  const step = (n, title, ...body) => el("section", { class: "cstep" }, el("h2", { class: "cstep-title" }, el("span", { class: "cstep-n", text: n }), title), ...body);

  /* ---------- steps ---------- */

  function stepName() {
    const input = el("input", { "data-k": "name", value: s.name, maxlength: "60", placeholder: "What are they called?" });
    return step("1", "Name", field("Character name", input, "You can change the name, portrait and story later on the dashboard."));
  }

  function stepSpecies() {
    const speciesNames = Object.keys(O.SPECIES);
    const body = [
      el("div", { class: "cseg", role: "radiogroup" },
        ...[["pure", "One species"], ["half", "Half-blood"]].map(([v, t]) =>
          el("label", {}, Object.assign(el("input", { type: "radio", name: "mode", value: v, "data-k": "mode" }), { checked: s.mode === v }), t))),
    ];
    if (s.mode === "pure") {
      const sp = O.SPECIES[s.species];
      body.push(field("Species", select("species", speciesNames), `Builds on the ${sp.base}.`));
      if (sp.sub) {
        const sub = sp.sub[subOf(s.species)];
        body.push(field(s.species === "Tiefling" ? "Lineage" : "Subspecies", select("sub", Object.keys(sp.sub), subOf(s.species)), sub.note || ""));
      }
      if (sp.choice) body.push(field(sp.choice[0], select("choice", sp.choice[1], s.choice || sp.choice[1][0])));
    } else {
      const parents = Object.keys(O.SPECIES).filter((k) => !O.SPECIES[k].noHalfBlood);
      const info = speciesInfo();
      body.push(
        el("div", { class: "crow" }, field("First parent", select("parentA", parents)), field("Second parent", select("parentB", parents))),
        el("p", { class: "cnote", text: `Choose ${info.need} traits in all, at least one from each parent. Speed ${info.speed} ft, size ${info.size}. Seraphs can't be half-bloods.` }),
        el("div", { class: "crow" },
          ...[["A", s.parentA], ["B", s.parentB]].map(([side, sp]) =>
            el("fieldset", { class: "cchecks" }, el("legend", { text: `From the ${sp}` }),
              ...O.SPECIES[sp].traits.map((t) => {
                const id = `${side}:${t}`;
                return el("label", {}, Object.assign(el("input", { type: "checkbox", "data-inherit": id }), { checked: s.inherit.includes(id) }), t);
              }))))
      );
    }
    const v = O.VARIANTS[s.variant];
    body.push(field("Variant species", select("variant", Object.keys(O.VARIANTS)), "A curse, blessing or mutation laid over your species (manual, Variant Species)."));
    if (v.sub) body.push(field("Dhampir strain", select("variantSub", Object.keys(v.sub))));
    return step("2", "Species", ...body);
  }

  function stepClass() {
    const names = Object.keys(O.CLASSES);
    const c = C();
    const spellOpts = c.spell ? [c.spell, ...(c.spellAlt || [])].map((a) => [a, LABEL[a]]) : null;
    const body = [
      el("div", { class: "crow" },
        field("Class", select("cls", names), c.note || ""),
        c.subclasses.length ? field("Subclass", select("subclass", [["", "Decide later"], ...c.subclasses])) : "",
        field("Level", select("level", Array.from({ length: 20 }, (_, i) => [String(i + 1), String(i + 1)]), String(s.level)))),
    ];
    if (spellOpts) body.push(field("Spellcasting ability", select("spell", spellOpts, s.spell || c.spell), c.spellNote || ""));
    body.push(el("label", { class: "ccheck" }, Object.assign(el("input", { type: "checkbox", "data-k": "gestalt" }), { checked: s.gestalt }),
      "Gestalt character", el("small", { text: " Two classes at every level. Only at the start of the campaign, at the DM's discretion, usually for parties of three or fewer." })));
    if (s.gestalt) {
      const c2 = C2();
      body.push(el("div", { class: "crow" },
        field("Second class", select("cls2", names.filter((n) => n !== s.cls)), c2.note || ""),
        c2.subclasses.length ? field("Second subclass", select("subclass2", [["", "Decide later"], ...c2.subclasses])) : ""));
      const pool = [...new Set([...c.saves, ...c2.saves])];
      body.push(el("fieldset", { class: "cchecks" }, el("legend", { text: "Saving throws: choose two" }),
        ...pool.map((a) => el("label", {}, Object.assign(el("input", { type: "checkbox", "data-save": a }), { checked: s.saves.includes(a) }), LABEL[a]))));
    }
    const [n, list] = c.skills;
    body.push(el("fieldset", { class: "cchecks cskills" }, el("legend", { text: `Class skills: choose ${n}` }),
      ...list.map((k) => el("label", {}, Object.assign(el("input", { type: "checkbox", "data-skill": k }), { checked: s.skills.includes(k) }), k))));
    return step("3", "Class", ...body);
  }

  function stepAbilities() {
    const methodSel = select("method", [["standard", "Standard array"], ["point", "Point buy (27)"], ["manual", "Rolled or manual"]]);
    const final = scores();
    const grid = el("div", { class: "cabilities" },
      ...O.ABILITIES.map((a) => {
        let control;
        if (s.method === "standard") control = select(`base.${a}`, O.STANDARD_ARRAY.map(String), String(s.base[a]));
        else if (s.method === "point") control = select(`base.${a}`, [8, 9, 10, 11, 12, 13, 14, 15].map(String), String(s.base[a]));
        else control = el("input", { "data-k": `base.${a}`, value: s.base[a], inputmode: "numeric", class: "mini" });
        return el("div", { class: "ability" },
          el("span", { class: "ability-label", text: a }), control,
          el("span", { class: "ability-mod", text: signed(mod(final[a])) }),
          el("span", { class: "ability-score", text: final[a] }));
      }));
    const opts = O.ABILITIES.map((a) => [a, LABEL[a]]);
    return step("4", "Ability scores",
      field("Method", methodSel, s.method === "point" ? `${pointsSpent()} of 27 points spent.` : ""),
      grid,
      el("div", { class: "crow" }, field("+2 to", select("plus2", opts)), field("+1 to", select("plus1", opts))),
      el("p", { class: "cnote", text: "The +2 and +1 come from your background, as in the 2024 Player's Handbook." }));
  }

  function stepBackground() {
    return step("5", "Background and belief",
      el("div", { class: "crow" },
        field("Background", select("background", O.BACKGROUNDS), "Its name and story stay yours to rewrite on the Inspiration tab."),
        field("Religion", select("religion", O.RELIGIONS.map(([r, al]) => [r, al ? `${r} (${al})` : r]))),
        field("Alignment", select("alignment", O.ALIGNMENTS))));
  }

  function renderSummary() {
    const info = speciesInfo();
    const final = scores();
    const bad = problems();
    const c2 = C2();
    $("summary").replaceChildren(
      el("h2", { class: "sheet-name", text: s.name || "Unnamed" }),
      el("p", { class: "sheet-line", text: `${info.label}${s.variant !== "None" ? ` · ${s.variant}${s.variantSub && s.variantSub !== "None" && O.VARIANTS[s.variant].sub ? ` (${s.variantSub})` : ""}` : ""}` }),
      el("p", { class: "sheet-line", text: `${s.cls}${s.subclass ? ` (${s.subclass})` : ""}${c2 ? ` / ${s.cls2}${s.subclass2 ? ` (${s.subclass2})` : ""}` : ""} · level ${s.level}` }),
      el("dl", { class: "csum" },
        el("dt", { text: "Hit points" }), el("dd", { text: `${maxHp()} (d${hitDie()})` }),
        el("dt", { text: "Armour class" }), el("dd", { text: 10 + mod(final.dex) }),
        el("dt", { text: "Speed" }), el("dd", { text: `${info.speed} ft${s.variant === "Dhampir" ? " +10 m" : ""}` }),
        el("dt", { text: "Saves" }), el("dd", { text: savesFor().map((a) => LABEL[a]).join(", ") || "Choose two" }),
        el("dt", { text: "Scores" }), el("dd", { text: O.ABILITIES.map((a) => `${a.toUpperCase()} ${final[a]}`).join(" · ") }),
        el("dt", { text: "Background" }), el("dd", { text: s.background }),
        el("dt", { text: "Belief" }), el("dd", { text: [s.religion !== "None" ? s.religion : "", s.alignment].filter(Boolean).join(", ") })),
      bad.length ? el("ul", { class: "cproblems" }, ...bad.map((p) => el("li", { text: p }))) : el("p", { class: "cnote", text: "Ready." }),
      el("button", { type: "submit", class: "button", text: "Create character", ...(bad.length ? { disabled: "" } : {}) })
    );
  }

  function render() {
    $("steps").replaceChildren(stepName(), stepSpecies(), stepClass(), stepAbilities(), stepBackground());
    renderSummary();
  }

  /* ---------- reading choices ---------- */

  const form = $("creator");
  form.addEventListener("input", (e) => {
    if (e.target.dataset.k === "name") { s.name = e.target.value; renderSummary(); }
  });
  form.addEventListener("change", (e) => {
    const t = e.target;
    const k = t.dataset.k;
    if (k === "name") return;
    if (k && k.startsWith("base.")) s.base[k.slice(5)] = Math.max(1, Math.min(20, parseInt(t.value, 10) || 8));
    else if (k === "gestalt") { s.gestalt = t.checked; s.saves = []; if (s.cls2 === s.cls) s.cls2 = Object.keys(O.CLASSES).find((n) => n !== s.cls); }
    else if (k === "level") s.level = parseInt(t.value, 10);
    else if (k === "method") {
      s.method = t.value;
      if (s.method === "standard") s.base = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
      if (s.method === "point") s.base = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
    } else if (k) {
      s[k] = t.value;
      if (k === "species") { s.sub = ""; s.choice = ""; }
      if (k === "cls") { s.subclass = ""; s.spell = ""; s.skills = []; s.saves = []; if (s.cls2 === s.cls) s.cls2 = Object.keys(O.CLASSES).find((n) => n !== s.cls); }
      if (k === "cls2") { s.subclass2 = ""; s.saves = []; }
      if (k === "parentA" || k === "parentB" || k === "mode") s.inherit = [];
      if (k === "variant") s.variantSub = "None";
    } else if (t.dataset.inherit) {
      s.inherit = t.checked ? [...s.inherit, t.dataset.inherit] : s.inherit.filter((x) => x !== t.dataset.inherit);
    } else if (t.dataset.skill) {
      s.skills = t.checked ? [...s.skills, t.dataset.skill] : s.skills.filter((x) => x !== t.dataset.skill);
    } else if (t.dataset.save) {
      s.saves = t.checked ? [...s.saves, t.dataset.save] : s.saves.filter((x) => x !== t.dataset.save);
    }
    render();
  });

  /* ---------- building the character ---------- */

  // SRD class features up to a level (not subclass ones), from the meta line "Cleric feature, level 2".
  function srdClassFeatures(cls, level) {
    const out = [];
    const seen = new Set();
    for (const [k, list] of Object.entries(SRD)) {
      if (!Array.isArray(list)) continue;
      for (const e of list) {
        const m = e.t === "feature" && /^(\w+) feature, level (\d+)$/.exec(e.m);
        if (m && m[1] === cls && Number(m[2]) <= level && !seen.has(e.n)) {
          seen.add(e.n);
          out.push([Number(m[2]), e.n]);
        }
      }
    }
    return out.sort((a, b) => a[0] - b[0]);
  }

  function features() {
    const f = [];
    const add = (name, kind = "feature", desc = "", extra = {}) => {
      if (!f.some((x) => x.name === name)) f.push({ kind, name, ...(desc ? { desc } : {}), ...extra });
    };
    // Species
    if (s.mode === "half") {
      for (const [n, k, d] of O.HALF_BLOOD.base) add(n, k, d);
      for (const t of s.inherit) add(t.slice(2), "feature", `Inherited from your ${t[0] === "A" ? s.parentA : s.parentB} parent.`);
    } else {
      const info = speciesInfo();
      for (const t of info.sp.traits) add(t);
      if (info.sp.choice) add(`${info.sp.choice[0]}: ${s.choice || info.sp.choice[1][0]}`);
      for (const [n, k, d] of [...(info.sp.extra || []), ...((info.sub && info.sub.extra) || [])]) add(n, k, d);
    }
    // Variant species
    const v = O.VARIANTS[s.variant];
    const vf = [...(v.features || []), ...((v.sub && v.sub[s.variantSub] && v.sub[s.variantSub].features) || [])];
    for (const [n, k, d, opt = {}] of vf) {
      add(n, k, d, {
        ...(opt.formula ? { formula: opt.formula(s.level) } : {}),
        ...(opt.uses === "PB" ? { uses: String(2 + Math.floor((s.level - 1) / 4)) } : {}),
      });
    }
    // Classes
    for (const cls of [s.cls, s.gestalt ? s.cls2 : null].filter(Boolean)) {
      const c = O.CLASSES[cls];
      if (c.features) for (const [lv, n, kind = "feature", uses] of c.features) { if (lv <= s.level) add(n, kind, "", uses ? { uses } : {}); }
      else for (const [, n] of srdClassFeatures(cls, s.level)) add(n);
    }
    return f;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (problems().length) return renderSummary();
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
        species: s.mode === "half" ? { halfBlood: [s.parentA, s.parentB], inherit: s.inherit.map((t) => t.slice(2)) } : { species: s.species, sub: subOf(s.species) || null, choice: s.choice || null },
        variant: s.variant !== "None" ? { variant: s.variant, strain: s.variantSub !== "None" ? s.variantSub : null } : null,
        classes: [{ cls: s.cls, subclass: s.subclass || null }, ...(s.gestalt ? [{ cls: s.cls2, subclass: s.subclass2 || null }] : [])],
        gestalt: s.gestalt,
        spellcasting: c.spell ? s.spell || c.spell : null,
        abilityMethod: s.method, baseScores: s.base, increases: { [s.plus2]: 2, [s.plus1]: 1 },
        background: s.background,
      },
    };
    const classText = `${s.cls}${s.subclass ? ` (${s.subclass})` : ""}${s.gestalt ? ` / ${s.cls2}${s.subclass2 ? ` (${s.subclass2})` : ""}` : ""}`;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    const { data: row, error } = await db.from("characters")
      .insert({ owner_id: owner.id, name: s.name.trim(), species: speciesText.slice(0, 60), class: classText.slice(0, 80), level: s.level, data })
      .select("id").single();
    btn.disabled = false;
    if (error) return say(error.message, true);
    location.href = `../character/?id=${row.id}`;
  });

  render();
})();
