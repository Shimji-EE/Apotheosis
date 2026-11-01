(async () => {
  const { db, $, say, el, requireMember } = window.Hub;
  const member = await requireMember("../");
  if (!member) return;
  const { me } = member;

  const wanted = (new URLSearchParams(location.search).get("u") || me.username).toLowerCase();
  const { data: owner, error } = await db
    .from("profiles")
    .select("id, username, display_name, role")
    .eq("username", wanted)
    .maybeSingle();
  if (error || !owner) return say("No one in the party goes by that name.", true);

  document.title = `${owner.display_name} · The Tavern`;
  $("profile-name").textContent = owner.display_name;
  $("profile-handle").textContent = `@${owner.username} · ${owner.role === "dm" ? "DM" : "Player"}`;
  const canEdit = me.id === owner.id || me.role === "dm";
  $("create-panel").hidden = !canEdit;

  async function load() {
    const { data, error } = await db
      .from("characters")
      .select("id, name, species, class, level")
      .eq("owner_id", owner.id)
      .order("created_at");
    if (error) return say(error.message, true);
    const list = $("characters");
    list.replaceChildren(
      ...data.map((c) =>
        el("li", {},
          el("a", { class: "char-card", href: `../character/?id=${c.id}` },
            el("span", { class: "char-name", text: c.name }),
            el("span", { class: "char-sub", text: [c.species, c.class, `Level ${c.level}`].filter(Boolean).join(" · ") })
          )
        )
      )
    );
    if (!data.length) list.append(el("li", { class: "handle", text: canEdit ? "No characters yet. Create one below." : "No characters yet." }));
  }

  $("create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form).entries());
    const name = (v.name || "").trim();
    if (!name) return say("Give your character a name.", true);
    const level = Math.min(20, Math.max(1, parseInt(v.level, 10) || 1));
    form.querySelector("button").disabled = true;
    const { data, error } = await db
      .from("characters")
      .insert({ owner_id: owner.id, name, species: v.species.trim() || null, class: v.class.trim() || null, level })
      .select("id")
      .single();
    form.querySelector("button").disabled = false;
    if (error) return say(error.message, true);
    location.href = `../character/?id=${data.id}`;
  });

  load();
})();
