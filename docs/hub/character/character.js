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
            el("span", { text: label }), el("span", { text: "Uses" }), el("span", { text: "Roll" }), el("span", { text: "Formula" })
          ),
          ...rows.map(({ f, i }) =>
            editing
              ? el("div", { class: "frow is-edit", "data-index": i },
                  input({ "data-f": "name", value: f.name || "", placeholder: "Name", "aria-label": "Name" }),
                  input({ "data-f": "uses", value: f.uses || "", placeholder: "–", "aria-label": "Uses" }),
                  input({ "data-f": "roll", value: f.roll || "", placeholder: "–", "aria-label": "Roll" }),
                  input({ "data-f": "formula", value: f.formula || "", placeholder: "–", "aria-label": "Formula" }),
                  el("button", { type: "button", class: "link-button remove", "data-remove": i, title: "Remove", text: "×" })
                )
              : el("div", { class: "frow" },
                  el("span", { class: "fname" }, el("span", { class: "ficon" }), el("span", { text: f.name })),
                  el("span", { text: f.uses || "–" }),
                  el("span", { text: f.roll || "–" }),
                  el("span", { text: f.formula || "–" })
                )
          )
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
      row.querySelectorAll("[data-f]").forEach((i) => (f[i.dataset.f] = i.value.trim().slice(0, 80)));
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
