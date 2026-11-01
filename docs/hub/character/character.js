(async () => {
  const { db, $, say, el, requireMember } = window.Hub;

  const ABILITIES = [
    ["str", "Str"], ["dex", "Dex"], ["con", "Con"],
    ["int", "Int"], ["wis", "Wis"], ["cha", "Cha"],
  ];
  const CHIP_GROUPS = [
    ["speed", "Speed"], ["skills", "Skills"], ["senses", "Senses"],
    ["resistances", "Resistances"], ["immunities", "Immunities"], ["languages", "Languages"],
  ];
  const SECTIONS = [
    ["feature", "Features"], ["action", "Actions"], ["bonus", "Bonus actions"], ["reaction", "Reactions"],
  ];

  // Tabs on the side rail work even before the data arrives.
  const tabs = document.querySelectorAll(".dash-rail [role=tab]");
  tabs.forEach((tab) =>
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      document.querySelectorAll(".dash-panel").forEach((p) => (p.hidden = p.dataset.panel !== tab.dataset.tab));
    })
  );

  const member = await requireMember("../");
  if (!member) return;
  const { me } = member;

  const id = new URLSearchParams(location.search).get("id");
  const { data: c, error } = id
    ? await db
        .from("characters")
        .select("id, name, species, class, level, data, owner:profiles(id, username, display_name)")
        .eq("id", id)
        .maybeSingle()
    : { data: null };
  if (error || !c) return say("That character could not be found.", true);

  // Fill in anything an older or brand-new character is missing.
  const d = c.data || {};
  d.abilities = Object.assign({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, d.abilities);
  d.saves = d.saves || [];
  d.hp = Object.assign({ cur: 10, max: 10, temp: 0 }, d.hp);
  d.ac = d.ac ?? 10;
  d.features = d.features || [];
  for (const [key] of CHIP_GROUPS) d[key] = d[key] || [];
  c.data = d;

  const canEdit = me.id === c.owner.id || me.role === "dm";
  let editing = false;

  const panels = window.CharPanels({
    d, el,
    isEditing: () => editing,
    collectAll: () => collect(),
    strength: () => d.abilities.str,
  });

  const mod = (score) => Math.floor((score - 10) / 2);
  const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);
  const prof = () => 2 + Math.floor((c.level - 1) / 4);
  const num = (v, lo, hi, fallback) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? fallback : Math.min(hi, Math.max(lo, n));
  };
  const input = (props) => el("input", props);

  // Skill, power and effect icons come straight from the icon packs (tools/icons/icons.py powers).
  // A feature shows the icon it names, else the icon whose name matches it, else one for its kind.
  // Resource icons (action, bonus action, reaction, Channel Divinity charge…) and official SRD rules text.
  const getJSON = (url) => fetch(url).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  const [POWERS, RESOURCES, SRD, ITEMS] = await Promise.all([
    getJSON("../icons/powers/manifest.json"),
    getJSON("../icons/resources/manifest.json"),
    getJSON("../srd.json"),
    getJSON("../icons/items/manifest.json"),
  ]);
  const KIND_POWER = { feature: "darkvision", action: "main hand attack", bonus: "dash", reaction: "opportunity attack" };
  const keyOf = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  function powerKey(f) {
    for (const k of [keyOf(f.icon), keyOf(f.name)]) {
      if (!k) continue;
      if (POWERS[k]) return k;
      const close = Object.keys(POWERS).find((p) => p.startsWith(`${k} `)); // "spiritual weapon" → "spiritual weapon greatsword"
      if (close) return close;
    }
    return POWERS[KIND_POWER[f.kind]] ? KIND_POWER[f.kind] : null;
  }
  function powerIcon(f) {
    const key = powerKey(f);
    const p = POWERS[key];
    return el("span", { class: `ficon power${p && p.stone ? " has-stone" : ""}`, title: p ? p.label : "" },
      p ? el("img", { src: `../icons/powers/${p.file}`, alt: "", loading: "lazy" }) : "");
  }
  // Look a name up in the SRD, preferring the kinds that fit where it is listed.
  const PREFER = {
    feature: ["feature", "trait", "feat", "spell", "condition", "item"],
    action: ["spell", "feature", "trait", "feat", "item"],
    item: ["item", "spell"],
  };
  function srd(name, kind) {
    const list = SRD[keyOf(name)];
    if (!Array.isArray(list)) return null;
    const order = PREFER[kind] || PREFER.action;
    return [...list].sort((a, b) => order.indexOf(a.t) - order.indexOf(b.t))[0];
  }
  window.Rules = { srd, keyOf, ITEMS, SRD_NOTE: "SRD 5.1, CC-BY-4.0" };

  const KIND_RESOURCE = { action: "action", bonus: "bonus action", reaction: "reaction" };
  function resourceKey(name) {
    const k = keyOf(name);
    if (!k) return null;
    if (RESOURCES[k]) return k;
    return Object.keys(RESOURCES).find((r) => r.startsWith(k)) || null;
  }
  // What a row spends: its kind (action, bonus action, reaction), plus a named resource,
  // or one read from its name or its SRD entry (Channel Divinity, a spell slot).
  function costs(f, rule) {
    const keys = [KIND_RESOURCE[f.kind]];
    const name = keyOf(f.name);
    if (f.resource) keys.push(resourceKey(f.resource));
    else if (name.startsWith("channel divinity")) keys.push("channel divinity charges");
    else if (name.startsWith("channel oath") || name.includes("sacred weapon")) keys.push("channel oath");
    else if (rule && rule.t === "spell" && rule.lv > 0) keys.push("spell slot");
    return keys.filter((k) => k && (RESOURCES[k] || ECONOMY[k]));
  }
  // Action economy markers (Charl's design): action a bright green circle, bonus action a
  // triangle in the same green, reaction an inverted triangle a little smaller.
  const ECONOMY = {
    action: ["Action", '<circle cx="12" cy="12" r="8"/>'],
    "bonus action": ["Bonus action", '<path d="M12 3.5 21 19.5H3z"/>'],
    reaction: ["Reaction", '<path d="M12 18 4.5 5h15z"/>'],
  };
  function resourceIcon(k) {
    if (ECONOMY[k]) {
      const [label, shape] = ECONOMY[k];
      const span = el("span", { class: `res econ econ-${k.replace(" ", "-")}`, title: label, role: "img", "aria-label": label });
      span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${shape}</svg>`; // fixed markup, no user text
      return span;
    }
    return el("img", { class: "res", src: `../icons/resources/${RESOURCES[k].file}`, alt: RESOURCES[k].label, title: RESOURCES[k].label });
  }

  // One shared list of icon names for the edit field's suggestions.
  document.body.append(el("datalist", { id: "power-list" },
    ...Object.values(POWERS).map((p) => el("option", { value: p.label }))));
  const powerSelect = (value) =>
    input({ "data-f": "icon", value: value || "", list: "power-list", placeholder: "Icon (matches name)", "aria-label": "Icon" });
  document.body.append(el("datalist", { id: "resource-list" },
    ...Object.values(RESOURCES).map((r) => el("option", { value: r.label }))));
  let openRow = null; // feature whose description is open

  function renderHead() {
    document.title = `${c.name} · The Tavern`;
    $("char-name").textContent = c.name;
    $("char-line").textContent = [c.species, c.class, d.alignment].filter(Boolean).join(" · ");
    $("char-owner").textContent = `${c.owner.display_name}'s character`;
    $("back").href = `../profile/?u=${encodeURIComponent(c.owner.username)}`;
    $("back").textContent = `← ${c.owner.display_name}`;
    $("level").textContent = c.level;
    $("prof").textContent = signed(prof());
    $("ac").textContent = d.ac;

    const portrait = $("portrait");
    if (d.portrait) portrait.style.backgroundImage = `url("${encodeURI(d.portrait)}")`;
    portrait.classList.toggle("has-art", !!d.portrait);

    const max = Math.max(1, d.hp.max);
    $("hp-fill").style.width = `${Math.max(0, Math.min(100, (d.hp.cur / max) * 100))}%`;
    $("hp-text").replaceChildren();
    $("hp-temp").textContent = d.hp.temp ? `TMP ${d.hp.temp}` : "TMP";
    if (editing) {
      $("hp-text").append(
        input({ class: "mini", "data-hp": "cur", value: d.hp.cur, inputmode: "numeric", "aria-label": "Current HP" }),
        " / ",
        input({ class: "mini", "data-hp": "max", value: d.hp.max, inputmode: "numeric", "aria-label": "Max HP" }),
        input({ class: "mini", "data-hp": "temp", value: d.hp.temp, inputmode: "numeric", "aria-label": "Temporary HP" })
      );
      $("ac").replaceChildren(input({ class: "mini", id: "ac-input", value: d.ac, inputmode: "numeric", "aria-label": "Armour class" }));
    } else {
      $("hp-text").textContent = `${d.hp.cur} / ${d.hp.max}`;
    }

    const row = $("abilities");
    row.replaceChildren(
      ...ABILITIES.map(([key, label]) => {
        const score = d.abilities[key];
        const proficient = d.saves.includes(key);
        const save = mod(score) + (proficient ? prof() : 0);
        return el("div", { class: "ability" },
          el("span", { class: "ability-label", text: label }),
          el("span", { class: "ability-mod", text: signed(mod(score)) }),
          editing
            ? input({ class: "mini", "data-ability": key, value: score, inputmode: "numeric", "aria-label": `${label} score` })
            : el("span", { class: "ability-score", text: score }),
          editing
            ? el("label", { class: "save is-edit", title: "Proficient in this saving throw" },
                Object.assign(input({ type: "checkbox", "data-save": key }), { checked: proficient }),
                el("span", { text: "Save" }))
            : el("span", { class: `save${proficient ? " is-prof" : ""}`, title: "Saving throw" },
                el("span", { class: "pip" }), el("span", { text: signed(save) }))
        );
      })
    );
  }

  function renderSide() {
    const side = $("side");
    side.replaceChildren(
      ...CHIP_GROUPS.map(([key, label]) =>
        el("section", { class: "chip-group" },
          el("h4", { text: label }),
          editing
            ? el("textarea", { class: "chip-edit", "data-chips": key, rows: "2", placeholder: "Comma separated" })
            : d[key].length
              ? el("div", { class: "chips" }, ...d[key].map((t) => el("span", { class: "chip", text: t })))
              : el("p", { class: "chip-empty", text: "None" })
        )
      )
    );
    if (editing) side.querySelectorAll("[data-chips]").forEach((t) => (t.value = d[t.dataset.chips].join(", ")));
  }

  function renderTables() {
    const q = $("search").value.trim().toLowerCase();
    const wrap = $("tables");
    wrap.replaceChildren(
      ...SECTIONS.map(([kind, label]) => {
        const rows = d.features
          .map((f, i) => ({ f, i }))
          .filter(({ f }) => f.kind === kind && (!q || f.name.toLowerCase().includes(q)));
        if (!editing && !rows.length) return "";
        const table = el("div", { class: "ftable" },
          el("div", { class: "frow fhead" },
            el("span", { class: "fhead-name" }, KIND_RESOURCE[kind] ? resourceIcon(KIND_RESOURCE[kind]) : "", label),
            el("span", { text: "Uses" }), el("span", { text: "Roll" }), el("span", { text: "Formula" })
          ),
          ...rows.flatMap(({ f, i }) => {
            if (editing) {
              return [el("div", { class: "frow is-edit", "data-index": i },
                input({ "data-f": "name", value: f.name || "", placeholder: "Name", "aria-label": "Name" }),
                input({ "data-f": "uses", value: f.uses || "", placeholder: "–", "aria-label": "Uses" }),
                input({ "data-f": "roll", value: f.roll || "", placeholder: "–", "aria-label": "Roll" }),
                input({ "data-f": "formula", value: f.formula || "", placeholder: "–", "aria-label": "Formula" }),
                powerSelect(f.icon),
                el("button", { type: "button", class: "link-button remove", "data-remove": i, title: "Remove", text: "×" }),
                input({ "data-f": "resource", value: f.resource || "", list: "resource-list", class: "f-resource", placeholder: "Resource used (e.g. Channel Divinity)", "aria-label": "Resource used" }),
                Object.assign(el("textarea", { "data-f": "desc", rows: "2", class: "f-desc", placeholder: "Description. Leave empty to use the official SRD text when the name matches.", "aria-label": "Description" }), { value: f.desc || "" })
              )];
            }
            const rule = srd(f.name, kind === "feature" ? "feature" : "action");
            const open = openRow === i;
            const row = el("div", { class: `frow is-open-able${open ? " is-open" : ""}`, "data-open": i, role: "button", tabindex: "0", "aria-expanded": String(open) },
              el("span", { class: "fname" }, powerIcon(f), el("span", { text: f.name }),
                el("span", { class: "fcost" }, ...costs(f, rule).map(resourceIcon))),
              el("span", { text: f.uses || "–" }),
              el("span", { text: f.roll || "–" }),
              el("span", { text: f.formula || "–" })
            );
            if (!open) return [row];
            const desc = f.desc || (rule && rule.d) || "";
            return [row, el("div", { class: "fdesc" },
              rule && !f.desc ? el("p", { class: "fdesc-meta", text: rule.m }) : "",
              ...(desc
                ? desc.split(/\n\s*\n/).map((t) => el("p", { text: t.trim() }))
                : [el("p", { class: "placeholder", text: canEdit ? "No description yet. Add one in Edit." : "No description yet." })]),
              rule && !f.desc ? el("p", { class: "fdesc-src", text: `Official rules text, ${window.Rules.SRD_NOTE}` }) : ""
            )];
          })
        );
        if (editing) table.append(el("button", { type: "button", class: "link-button add-row", "data-add": kind, text: `+ Add ${label.toLowerCase().replace(/s$/, "")}` }));
        return table;
      })
    );
    if (!editing && !d.features.length) {
      wrap.append(el("p", { class: "placeholder", text: canEdit ? "No features yet. Press Edit to add them." : "No features yet." }));
    }
  }

  function renderBasics() {
    $("basics").hidden = !editing;
    if (!editing) return;
    const form = $("basics-form");
    const field = (label, name, value, extra = {}) =>
      el("label", {}, label, input({ name, value: value ?? "", ...extra }));
    form.replaceChildren(
      field("Name", "name", c.name, { maxlength: "60" }),
      field("Species", "species", c.species, { maxlength: "40" }),
      field("Class", "class", c.class, { maxlength: "40" }),
      field("Level", "level", c.level, { type: "number", min: "1", max: "20" }),
      field("Alignment", "alignment", d.alignment, { maxlength: "40" }),
      field("Portrait image link", "portrait", d.portrait, { type: "url", placeholder: "https://…" })
    );
  }

  function render() {
    document.body.classList.toggle("is-editing", editing);
    renderHead();
    renderSide();
    renderTables();
    renderBasics();
    panels.render();
  }

  // Read every edit field back into the character before saving or re-rendering.
  function collect() {
    if (!editing) return;
    document.querySelectorAll("[data-ability]").forEach((i) => (d.abilities[i.dataset.ability] = num(i.value, 1, 30, 10)));
    d.saves = [...document.querySelectorAll("[data-save]")].filter((i) => i.checked).map((i) => i.dataset.save);
    document.querySelectorAll("[data-hp]").forEach((i) => (d.hp[i.dataset.hp] = num(i.value, 0, 9999, 0)));
    if ($("ac-input")) d.ac = num($("ac-input").value, 0, 50, 10);
    document.querySelectorAll("[data-chips]").forEach((t) => {
      d[t.dataset.chips] = t.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 40);
    });
    document.querySelectorAll(".frow.is-edit").forEach((row) => {
      const f = d.features[row.dataset.index];
      row.querySelectorAll("[data-f]").forEach((i) => (f[i.dataset.f] = i.value.trim().slice(0, i.dataset.f === "desc" ? 4000 : 80)));
      for (const k of ["icon", "resource", "desc"]) if (!f[k]) delete f[k];
    });
    panels.collect();
    const form = $("basics-form");
    if (form.elements.name) {
      c.name = form.elements.name.value.trim() || c.name;
      c.species = form.elements.species.value.trim() || null;
      c.class = form.elements.class.value.trim() || null;
      c.level = num(form.elements.level.value, 1, 20, c.level);
      d.alignment = form.elements.alignment.value.trim() || null;
      const url = form.elements.portrait.value.trim();
      d.portrait = /^https:\/\//i.test(url) ? url : null;
    }
  }

  $("search").addEventListener("input", renderTables);
  const toggleRow = (e) => {
    const row = e.target.closest("[data-open]");
    if (!row || editing) return;
    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    openRow = openRow === Number(row.dataset.open) ? null : Number(row.dataset.open);
    renderTables();
  };
  $("tables").addEventListener("click", toggleRow);
  $("tables").addEventListener("keydown", toggleRow);
  render();

  if (!canEdit) return;
  $("edit-toggle").hidden = false;

  $("edit-toggle").addEventListener("click", () => {
    collect();
    editing = !editing;
    $("edit-toggle").textContent = editing ? "Cancel" : "Edit";
    $("save").hidden = !editing;
    if (!editing) location.reload(); // Cancel throws away unsaved edits.
    else render();
  });

  $("tables").addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    const remove = e.target.closest("[data-remove]");
    if (!add && !remove) return;
    collect();
    if (add) d.features.push({ kind: add.dataset.add, name: "" });
    if (remove) d.features.splice(Number(remove.dataset.remove), 1);
    renderTables();
  });

  $("save").addEventListener("click", async () => {
    collect();
    d.features = d.features.filter((f) => f.name);
    panels.tidy();
    $("save").disabled = true;
    const { error } = await db
      .from("characters")
      .update({ name: c.name, species: c.species, class: c.class, level: c.level, data: d })
      .eq("id", c.id);
    $("save").disabled = false;
    if (error) return say(error.message, true);
    editing = false;
    $("edit-toggle").textContent = "Edit";
    $("save").hidden = true;
    say("Saved.");
    render();
  });

  $("delete").addEventListener("click", async () => {
    if (!confirm(`Delete ${c.name}? This cannot be undone.`)) return;
    const { error } = await db.from("characters").delete().eq("id", c.id);
    if (error) return say(error.message, true);
    location.href = `../profile/?u=${encodeURIComponent(c.owner.username)}`;
  });
})();
