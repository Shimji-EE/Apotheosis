(async () => {
  const { db, $, say, requireMember } = window.Hub;

  // Tabs work even before the data arrives.
  const tabs = document.querySelectorAll(".dash-tabs [role=tab]");
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
        .select("id, name, species, class, level, owner:profiles(id, username, display_name)")
        .eq("id", id)
        .maybeSingle()
    : { data: null };
  if (error || !c) return say("That character could not be found.", true);

  function show() {
    document.title = `${c.name} · The Tavern`;
    $("char-name").textContent = c.name;
    $("char-line").textContent = [c.species, c.class, `Level ${c.level}`].filter(Boolean).join(" · ");
    $("char-owner").textContent = `${c.owner.display_name}'s character`;
    $("back").href = `../profile/?u=${encodeURIComponent(c.owner.username)}`;
    $("back").textContent = `← ${c.owner.display_name}`;
  }
  show();

  const canEdit = me.id === c.owner.id || me.role === "dm";
  if (!canEdit) return;

  const form = $("edit-form");
  form.hidden = false;
  $("delete").hidden = false;
  form.elements.name.value = c.name;
  form.elements.species.value = c.species || "";
  form.elements.class.value = c.class || "";
  form.elements.level.value = c.level;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    if (!name) return say("A character needs a name.", true);
    const patch = {
      name,
      species: form.elements.species.value.trim() || null,
      class: form.elements.class.value.trim() || null,
      level: Math.min(20, Math.max(1, parseInt(form.elements.level.value, 10) || 1)),
    };
    const { error } = await db.from("characters").update(patch).eq("id", c.id);
    if (error) return say(error.message, true);
    Object.assign(c, patch);
    show();
    say("Saved.");
  });

  $("delete").addEventListener("click", async () => {
    if (!confirm(`Delete ${c.name}? This cannot be undone.`)) return;
    const { error } = await db.from("characters").delete().eq("id", c.id);
    if (error) return say(error.message, true);
    location.href = `../profile/?u=${encodeURIComponent(c.owner.username)}`;
  });
})();
