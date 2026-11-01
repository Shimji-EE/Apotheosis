// Inventory, Inspiration and Journal tabs of the character dashboard.
// character.js owns loading, the Edit/Save toggle and saving; this file draws
// the three panels and reads their edit fields back into the character data.
window.CharPanels = ({ d, el, isEditing, collectAll, strength }) => {
  const KINDS = [
    ["weapon", "Weapon"], ["armour", "Armour"], ["shield", "Shield"], ["potion", "Potion"],
    ["scroll", "Scroll"], ["ring", "Ring"], ["amulet", "Amulet"], ["clothing", "Clothing"],
    ["tool", "Tool"], ["treasure", "Treasure"], ["misc", "Misc"],
  ];
  const KIND_ICON = {
    weapon: "sword", armour: "armour", shield: "shield", potion: "potion", scroll: "scroll",
    ring: "ring", amulet: "amulet", clothing: "cloak", tool: "tool", treasure: "gem", misc: "pouch",
  };
  const RARITIES = ["common", "uncommon", "rare", "very rare", "legendary", "artifact"];
  const SLOTS = [
    ["head", "Head", "helm"], ["cloak", "Cloak", "cloak"], ["armour", "Armour", "armour"],
    ["hands", "Hands", "glove"], ["feet", "Feet", "boot"],
    ["amulet", "Amulet", "amulet"], ["ring1", "Ring", "ring"], ["ring2", "Ring", "ring"],
    ["main", "Main hand", "sword"], ["off", "Off hand", "shield"], ["ranged", "Ranged", "bow"],
  ];
  const COINS = [["pp", "Platinum"], ["gp", "Gold"], ["ep", "Electrum"], ["sp", "Silver"], ["cp", "Copper"]];
  const TRAITS = [["personality", "Personality"], ["ideals", "Ideals"], ["bonds", "Bonds"], ["flaws", "Flaws"]];
  const STATUS = [["active", "Active"], ["done", "Completed"], ["failed", "Failed"]];
  const MAX_INSPIRATION = 4;
  const BAG_CELLS = 30;

  // View state that is not saved.
  let picked = null;        // index of the item shown in the inventory detail card
  let questFilter = "active";
  let questPicked = null;   // index of the quest shown in the journal

  const $ = (id) => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";
  const icon = (name, cls = "glyph") => {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", cls);
    svg.setAttribute("viewBox", "0 0 48 48");
    svg.setAttribute("aria-hidden", "true");
    for (const layer of ["g-glow", "g-core"]) {
      const use = document.createElementNS(NS, "use");
      use.setAttribute("class", layer);
      use.setAttribute("href", `#i-${name}`);
      svg.append(use);
    }
    return svg;
  };
  const clip = (v, n) => String(v ?? "").trim().slice(0, n);
  const num = (v, lo, hi, fallback = 0) => {
    const n = parseFloat(v);
    return Number.isNaN(n) ? fallback : Math.min(hi, Math.max(lo, n));
  };
  const select = (attrs, options, value) => {
    const s = el("select", attrs, ...options.map(([v, label]) => el("option", { value: v, text: label })));
    s.value = value ?? options[0][0];
    return s;
  };
  const textarea = (attrs, value) => {
    const t = el("textarea", { rows: "3", ...attrs });
    t.value = value ?? "";
    return t;
  };
  const paragraphs = (text, cls = "prose") =>
    String(text || "").split(/\n\s*\n/).filter((p) => p.trim()).map((p) => el("p", { class: cls, text: p.trim() }));

  // Fill in anything an older or brand-new character is missing.
  d.items = Array.isArray(d.items) ? d.items : [];
  d.coins = Object.assign({ pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 }, d.coins);
  d.inspiration = d.inspiration ?? 0;
  d.background = Object.assign({ name: "", story: "" }, d.background);
  d.goals = Array.isArray(d.goals) ? d.goals : [];
  d.traits = Object.assign({ personality: "", ideals: "", bonds: "", flaws: "" }, d.traits);
  d.quests = Array.isArray(d.quests) ? d.quests : [];
  d.notes = d.notes || "";

  /* ---------- Inventory ---------- */

  // Item art: a texture link, else the pack's painted art for the item (by the texture
  // field or the item's name), else the pack art for its kind, else a line-art stand-in.
  const KIND_ART = {
    weapon: "longsword", armour: "chain mail", shield: "iron banded shield 1", potion: "potion of healing",
    scroll: "scroll of bless", ring: "ring a simple gold", amulet: "amulet necklace a silver a", clothing: "cloth armour",
    tool: "thieves tools", treasure: "gold ingot", misc: "backpack a",
  };
  function packArt(name) {
    const items = (window.Rules && window.Rules.ITEMS) || {};
    const k = window.Rules ? window.Rules.keyOf(name) : "";
    if (!k) return null;
    if (items[k]) return items[k];
    const close = Object.keys(items).find((p) => p.startsWith(`${k} `));
    if (close) return items[close];
    // "Mace of the Tithe" → "mace": the longest pack name the item's name starts with.
    const words = k.split(" ");
    for (let n = words.length - 1; n > 0; n--) {
      const head = words.slice(0, n).join(" ");
      if (items[head]) return items[head];
    }
    return null;
  }
  function itemSrc(item) {
    if (/^(https:\/\/|\.\.\/icons\/)/i.test(item.image || "")) return item.image;
    const art = packArt(item.image) || packArt(item.name) || packArt(KIND_ART[item.kind]);
    return art ? `../icons/items/${art.file}` : null;
  }
  function itemArt(item) {
    const src = itemSrc(item);
    if (src) return el("img", { class: "item-art", src, alt: "", loading: "lazy" });
    return icon(KIND_ICON[item.kind] || "pouch");
  }

  function itemTile(item, index, extra = "") {
    const rarity = (item.rarity || "common").replace(" ", "-");
    const tile = el("button", {
      type: "button",
      class: `cell stone has-item k-${item.kind || "misc"} r-${rarity}${index === picked ? " is-picked" : ""}${extra}`,
      "data-item": index,
      title: item.name,
    }, itemArt(item));
    if ((item.qty ?? 1) > 1) tile.append(el("span", { class: "qty", text: item.qty }));
    return tile;
  }

  // The item's own notes, else the official SRD text when its name matches a weapon, armour or magic item.
  function itemText(item) {
    if (item.notes) return paragraphs(item.notes, "item-notes");
    const rule = window.Rules && window.Rules.srd(item.name, "item");
    if (!rule) return [];
    return [
      el("p", { class: "fdesc-meta", text: rule.m }),
      ...paragraphs(rule.d, "item-notes"),
      el("p", { class: "fdesc-src", text: `Official rules text, ${window.Rules.SRD_NOTE}` }),
    ];
  }

  function renderInventoryView(wrap) {
    const bySlot = {};
    d.items.forEach((it, i) => { if (it.slot) bySlot[it.slot] = i; });

    const slot = ([key, label, glyph]) => {
      const i = bySlot[key];
      const node = i === undefined
        ? el("div", { class: "cell stone is-empty", title: `${label}: empty` }, icon(glyph))
        : itemTile(d.items[i], i);
      return el("div", { class: `slot slot-${key}` }, node, el("span", { class: "slot-label", text: label }));
    };

    const equip = el("div", { class: "equip" },
      el("div", { class: "equip-col" }, ...SLOTS.slice(0, 5).map(slot)),
      el("div", { class: "equip-mid" }, icon("helm", "equip-sigil")),
      el("div", { class: "equip-col" }, ...SLOTS.slice(5, 8).map(slot)),
      el("div", { class: "equip-hands" }, ...SLOTS.slice(8).map(slot))
    );

    const loose = d.items.map((it, i) => ({ it, i })).filter(({ it }) => !it.slot);
    const cells = loose.map(({ it, i }) => itemTile(it, i));
    while (cells.length < Math.max(BAG_CELLS, Math.ceil(cells.length / 6) * 6)) cells.push(el("div", { class: "cell stone" }));

    const weight = d.items.reduce((sum, it) => sum + (Number(it.weight) || 0) * (Number(it.qty) || 1), 0);
    const capacity = strength() * 15;
    const load = el("div", { class: `load${weight > capacity ? " is-over" : ""}`, title: "Carried weight / carrying capacity (Str × 15)" },
      el("span", { class: "load-label", text: "Weight" }),
      el("div", { class: "load-bar" }, el("span", { class: "load-fill", style: `width:${Math.min(100, (weight / Math.max(1, capacity)) * 100)}%` })),
      el("span", { class: "load-text", text: `${+weight.toFixed(1)} / ${capacity} lb` })
    );

    const purse = el("div", { class: "purse" },
      ...COINS.map(([k, label]) => el("span", { class: `coin coin-${k}`, title: label }, icon("coin"), el("b", { text: d.coins[k] }), el("small", { text: k })))
    );

    const item = d.items[picked];
    const card = item
      ? el("article", { class: `item-card k-${item.kind || "misc"} r-${(item.rarity || "common").replace(" ", "-")}` },
          el("div", { class: "item-card-icon stone" }, itemArt(item)),
          el("div", {},
            el("h4", { class: "item-name", text: item.name }),
            el("p", { class: "item-meta", text: [
              (KINDS.find(([k]) => k === item.kind) || [, "Misc"])[1],
              item.rarity || "common",
              item.qty > 1 ? `× ${item.qty}` : "",
              item.weight ? `${item.weight} lb` : "",
              item.slot ? `Equipped: ${SLOTS.find(([k]) => k === item.slot)[1].toLowerCase()}` : "",
            ].filter(Boolean).join(" · ") }),
            ...itemText(item)
          )
        )
      : el("p", { class: "item-hint", text: d.items.length ? "Choose an item to read it." : "The pack is empty." });

    wrap.append(
      el("div", { class: "inv" },
        equip,
        el("div", { class: "inv-bag" }, el("div", { class: "bag" }, ...cells), card)
      ),
      el("div", { class: "inv-foot" }, purse, load)
    );
  }

  function renderInventoryEdit(wrap) {
    if (!$("item-art-list")) {
      document.body.append(el("datalist", { id: "item-art-list" },
        ...Object.values((window.Rules && window.Rules.ITEMS) || {}).map((a) => el("option", { value: a.label }))));
    }
    wrap.append(
      el("h4", { class: "sub-head", text: "Coin" }),
      el("div", { class: "purse is-edit" },
        ...COINS.map(([k, label]) => el("label", { class: `coin coin-${k}`, title: label }, icon("coin"),
          el("input", { class: "mini", "data-coin": k, value: d.coins[k], inputmode: "numeric", "aria-label": label }),
          el("small", { text: k })))
      ),
      el("h4", { class: "sub-head", text: "Items" }),
      el("div", { class: "irow ihead" }, ...["Name", "Kind", "Qty", "Lb", "Rarity", "Equipped", ""].map((t) => el("span", { text: t }))),
      ...d.items.map((it, i) =>
        el("div", { class: "irow is-edit", "data-item-row": i },
          el("input", { "data-i": "name", value: it.name || "", placeholder: "Name", "aria-label": "Name", maxlength: "60" }),
          select({ "data-i": "kind", "aria-label": "Kind" }, KINDS, it.kind),
          el("input", { "data-i": "qty", value: it.qty ?? 1, inputmode: "numeric", "aria-label": "Quantity" }),
          el("input", { "data-i": "weight", value: it.weight ?? 0, inputmode: "decimal", "aria-label": "Weight in pounds" }),
          select({ "data-i": "rarity", "aria-label": "Rarity" }, RARITIES.map((r) => [r, r]), it.rarity),
          select({ "data-i": "slot", "aria-label": "Equipped slot" }, [["", "In pack"], ...SLOTS.map(([k, l]) => [k, k.startsWith("ring") ? `Ring ${k.slice(-1)}` : l])], it.slot || ""),
          el("button", { type: "button", class: "link-button remove", "data-remove-item": i, title: "Remove", text: "×" }),
          el("input", { "data-i": "image", value: it.image || "", type: "url", list: "item-art-list", placeholder: "Texture: pack item name, or an https:// link (optional, else matched by name)", "aria-label": "Texture image link", class: "irow-notes" }),
          textarea({ "data-i": "notes", rows: "2", placeholder: "Description, properties, charges", "aria-label": "Notes", class: "irow-notes" }, it.notes)
        )
      ),
      el("button", { type: "button", class: "link-button add-row", "data-add-item": "", text: "+ Add item" })
    );
  }

  function renderInventory() {
    const wrap = $("inventory");
    wrap.replaceChildren();
    if (picked !== null && !d.items[picked]) picked = null;
    (isEditing() ? renderInventoryEdit : renderInventoryView)(wrap);
  }

  /* ---------- Inspiration ---------- */

  function renderInspiration() {
    const wrap = $("inspiration");
    const editing = isEditing();
    const pips = el("div", { class: "insp-pips", title: `Inspiration ${d.inspiration} of ${MAX_INSPIRATION}` },
      ...Array.from({ length: MAX_INSPIRATION }, (_, n) =>
        editing
          ? el("button", { type: "button", class: `pip-flame stone${n < d.inspiration ? " is-lit" : ""}`, "data-insp": n + 1, "aria-label": `Set inspiration to ${n + 1}` }, icon("flame"))
          : el("span", { class: `pip-flame stone${n < d.inspiration ? " is-lit" : ""}` }, icon("flame"))
      )
    );
    const head = el("header", { class: "insp-head" },
      el("div", {},
        el("span", { class: "kicker", text: "Background" }),
        editing
          ? el("input", { class: "line-input", id: "bg-name", value: d.background.name, placeholder: "Acolyte, Soldier, Gravedigger…", maxlength: "60", "aria-label": "Background" })
          : el("h4", { class: "insp-title", text: d.background.name || "No background yet" })
      ),
      el("div", { class: "insp-count" }, el("span", { class: "kicker", text: "Inspiration" }), pips)
    );

    const story = editing
      ? textarea({ id: "bg-story", rows: "5", class: "wide", placeholder: "Who were they before the road? Leave a blank line between paragraphs.", "aria-label": "Background story" }, d.background.story)
      : el("div", { class: "insp-story" }, ...(d.background.story ? paragraphs(d.background.story) : [el("p", { class: "placeholder", text: "No story written yet." })]));

    const goals = el("section", { class: "goals" },
      el("h4", { class: "sub-head", text: "Goals" }),
      el("p", { class: "sub-note", text: "Fulfil one in play and the DM grants inspiration." }),
      ...(editing
        ? [
            ...d.goals.map((g, i) =>
              el("div", { class: "goal is-edit", "data-goal": i },
                Object.assign(el("input", { type: "checkbox", "data-g": "done", title: "Fulfilled", "aria-label": "Fulfilled" }), { checked: !!g.done }),
                el("input", { "data-g": "text", value: g.text || "", placeholder: "Avenge the burned chapel at…", maxlength: "160", "aria-label": "Goal" }),
                el("button", { type: "button", class: "link-button remove", "data-remove-goal": i, title: "Remove", text: "×" })
              )
            ),
            el("button", { type: "button", class: "link-button add-row", "data-add-goal": "", text: "+ Add goal" }),
          ]
        : d.goals.length
          ? d.goals.map((g) =>
              el("div", { class: `goal${g.done ? " is-done" : ""}` },
                el("span", { class: "goal-mark" }),
                el("span", { class: "goal-text", text: g.text }),
                g.done ? el("span", { class: "goal-seal", text: "Fulfilled" }) : ""
              ))
          : [el("p", { class: "placeholder", text: "No goals yet." })])
    );

    const traits = el("section", { class: "traits" },
      ...TRAITS.map(([k, label]) =>
        el("div", { class: "trait" },
          el("h4", { class: "sub-head", text: label }),
          editing
            ? textarea({ "data-trait": k, rows: "3", "aria-label": label }, d.traits[k])
            : d.traits[k] ? el("div", {}, ...paragraphs(d.traits[k])) : el("p", { class: "chip-empty", text: "Unwritten" })
        )
      )
    );

    wrap.replaceChildren(head, story, goals, traits);
  }

  /* ---------- Journal ---------- */

  function renderJournalView(wrap) {
    const filters = el("div", { class: "jfilters", role: "tablist", "aria-label": "Journal" },
      ...[...STATUS, ["notes", "Notes"]].map(([k, label]) => {
        const count = k === "notes" ? "" : d.quests.filter((q) => (q.status || "active") === k).length;
        return el("button", { type: "button", role: "tab", "aria-selected": String(questFilter === k), "data-jfilter": k },
          label, count === "" ? "" : el("small", { text: count }));
      })
    );

    if (questFilter === "notes") {
      wrap.append(filters, el("div", { class: "jnotes" },
        ...(d.notes ? paragraphs(d.notes) : [el("p", { class: "placeholder", text: "No notes yet." })])));
      return;
    }

    const shown = d.quests.map((q, i) => ({ q, i })).filter(({ q }) => (q.status || "active") === questFilter);
    if (!shown.some(({ i }) => i === questPicked)) questPicked = shown.length ? shown[0].i : null;

    const list = el("div", { class: "jlist" },
      ...(shown.length
        ? shown.map(({ q, i }) =>
            el("button", { type: "button", class: `jquest s-${q.status || "active"}${i === questPicked ? " is-picked" : ""}`, "data-quest": i },
              el("span", { class: "jdot" }), el("span", { text: q.title || "Untitled" })))
        : [el("p", { class: "placeholder", text: "Nothing here." })])
    );

    const q = d.quests[questPicked];
    const entries = q ? String(q.log || "").split("\n").map((s) => s.trim()).filter(Boolean) : [];
    const detail = q
      ? el("article", { class: "jdetail" },
          el("span", { class: `kicker s-${q.status || "active"}`, text: (STATUS.find(([k]) => k === (q.status || "active")) || STATUS[0])[1] }),
          el("h4", { class: "jtitle", text: q.title || "Untitled" }),
          q.giver ? el("p", { class: "jgiver", text: `From ${q.giver}` }) : "",
          ...paragraphs(q.summary),
          entries.length
            ? el("ol", { class: "jlog" }, ...entries.map((t) => el("li", { text: t })))
            : ""
        )
      : el("div", { class: "jdetail" });

    wrap.append(filters, el("div", { class: "journal" }, list, detail));
  }

  function renderJournalEdit(wrap) {
    wrap.append(
      el("h4", { class: "sub-head", text: "Quests" }),
      ...d.quests.map((q, i) =>
        el("div", { class: "qedit", "data-quest-row": i },
          el("div", { class: "qedit-top" },
            el("input", { "data-q": "title", value: q.title || "", placeholder: "Quest title", maxlength: "80", "aria-label": "Quest title" }),
            select({ "data-q": "status", "aria-label": "Status" }, STATUS, q.status || "active"),
            el("button", { type: "button", class: "link-button remove", "data-remove-quest": i, title: "Remove", text: "×" })
          ),
          el("input", { "data-q": "giver", value: q.giver || "", placeholder: "Given by (optional)", maxlength: "60", "aria-label": "Given by" }),
          textarea({ "data-q": "summary", rows: "2", placeholder: "What is asked, and why it matters", "aria-label": "Summary" }, q.summary),
          textarea({ "data-q": "log", rows: "3", placeholder: "Log: one entry per line, oldest first", "aria-label": "Log" }, q.log)
        )
      ),
      el("button", { type: "button", class: "link-button add-row", "data-add-quest": "", text: "+ Add quest" }),
      el("h4", { class: "sub-head", text: "Notes" }),
      textarea({ id: "jnotes", rows: "6", class: "wide", placeholder: "Names, debts, rumours. Leave a blank line between paragraphs.", "aria-label": "Notes" }, d.notes)
    );
  }

  function renderJournal() {
    const wrap = $("journal");
    wrap.replaceChildren();
    (isEditing() ? renderJournalEdit : renderJournalView)(wrap);
  }

  /* ---------- Shared ---------- */

  function render() {
    renderInventory();
    renderInspiration();
    renderJournal();
  }

  // Read every edit field of the three panels back into the data.
  function collect() {
    document.querySelectorAll("[data-coin]").forEach((i) => (d.coins[i.dataset.coin] = Math.round(num(i.value, 0, 9999999, 0))));
    document.querySelectorAll("[data-item-row]").forEach((row) => {
      const it = d.items[row.dataset.itemRow];
      const v = (k) => row.querySelector(`[data-i=${k}]`).value;
      Object.assign(it, {
        name: clip(v("name"), 60), kind: v("kind"), rarity: v("rarity"), slot: v("slot") || null,
        qty: Math.round(num(v("qty"), 0, 9999, 1)), weight: num(v("weight"), 0, 9999, 0), notes: clip(v("notes"), 1000),
        image: clip(v("image"), 500) || null,
      });
      if (!it.image) delete it.image;
    });
    // Only one item per slot: the last one chosen keeps it.
    const taken = {};
    d.items.forEach((it) => { if (it.slot) { if (taken[it.slot]) taken[it.slot].slot = null; taken[it.slot] = it; } });

    if ($("bg-name")) d.background.name = clip($("bg-name").value, 60);
    if ($("bg-story")) d.background.story = clip($("bg-story").value, 4000);
    document.querySelectorAll("[data-goal]").forEach((row) => {
      const g = d.goals[row.dataset.goal];
      g.text = clip(row.querySelector("[data-g=text]").value, 160);
      g.done = row.querySelector("[data-g=done]").checked;
    });
    document.querySelectorAll("[data-trait]").forEach((t) => (d.traits[t.dataset.trait] = clip(t.value, 1000)));

    document.querySelectorAll("[data-quest-row]").forEach((row) => {
      const q = d.quests[row.dataset.questRow];
      const v = (k) => row.querySelector(`[data-q=${k}]`).value;
      Object.assign(q, { title: clip(v("title"), 80), status: v("status"), giver: clip(v("giver"), 60), summary: clip(v("summary"), 2000), log: clip(v("log"), 4000) });
    });
    if ($("jnotes")) d.notes = clip($("jnotes").value, 8000);
  }

  // Drop empty rows before saving.
  function tidy() {
    d.items = d.items.filter((it) => it.name);
    d.goals = d.goals.filter((g) => g.text);
    d.quests = d.quests.filter((q) => q.title);
  }

  const panels = [$("inventory"), $("inspiration"), $("journal")];
  panels.forEach((p) => p.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    const ds = t.dataset;
    if ("item" in ds) { picked = Number(ds.item) === picked ? null : Number(ds.item); return renderInventory(); }
    if ("jfilter" in ds) { questFilter = ds.jfilter; return renderJournal(); }
    if ("quest" in ds) { questPicked = Number(ds.quest); return renderJournal(); }
    if (!isEditing()) return;
    collectAll();
    if ("addItem" in ds) d.items.push({ name: "", kind: "misc", qty: 1, weight: 0, rarity: "common", slot: null, notes: "" });
    else if ("removeItem" in ds) d.items.splice(Number(ds.removeItem), 1);
    else if ("insp" in ds) d.inspiration = Number(ds.insp) === d.inspiration ? Number(ds.insp) - 1 : Number(ds.insp);
    else if ("addGoal" in ds) d.goals.push({ text: "", done: false });
    else if ("removeGoal" in ds) d.goals.splice(Number(ds.removeGoal), 1);
    else if ("addQuest" in ds) d.quests.push({ title: "", status: "active", giver: "", summary: "", log: "" });
    else if ("removeQuest" in ds) d.quests.splice(Number(ds.removeQuest), 1);
    else return;
    render();
  }));

  return { render, collect, tidy };
};
