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
  $("create-link").href = `../create/?u=${encodeURIComponent(owner.username)}`;

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

  load();
})();
