(() => {
  const { SUPABASE_URL, SUPABASE_KEY, db, $ } = window.Hub;
  // Usernames map to a hidden email, so players only ever see username + password.
  const EMAIL_DOMAIN = "members.apotheosis.invalid";
  const status = $("status");

  function say(text, isError = false) {
    status.textContent = text;
    status.classList.toggle("is-error", isError);
    if (text) status.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Check the form ourselves so mistakes show as a message instead of a silent block.
  function checkMember(values, isNew) {
    values.username = (values.username || "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(values.username)) {
      throw new Error("Usernames are 3 to 24 letters, numbers or underscores, with no spaces.");
    }
    if (isNew && (values.password || "").length < 8) throw new Error("Passwords need at least 8 characters.");
    if (!values.password) throw new Error("Enter a password.");
    return values;
  }

  const formValues = (form) => Object.fromEntries(new FormData(form).entries());
  const toEmail = (username) => `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;

  async function busy(form, task) {
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      await task();
    } catch (err) {
      say(err.message || String(err), true);
    } finally {
      button.disabled = false;
    }
  }

  async function callMembers(values, withSession) {
    const headers = { "Content-Type": "application/json", apikey: SUPABASE_KEY };
    if (withSession) {
      const { data } = await db.auth.getSession();
      if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
    }
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-member`, {
      method: "POST",
      headers,
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status}).`);
    return body;
  }

  let me = null;

  async function render() {
    const { data } = await db.auth.getSession();
    const session = data.session;
    $("login-panel").hidden = !!session;
    $("lobby").hidden = !session;
    $("door").hidden = !!session;
    document.body.classList.toggle("in-lobby", !!session);
    if (!session) {
      $("dm-panel").hidden = true;
      me = null;
      window.Hub.members = null;
      window.dispatchEvent(new CustomEvent("hub:members", { detail: null }));
      return;
    }

    const { data: profiles, error } = await db
      .from("profiles")
      .select("id, username, display_name, role")
      .order("role")
      .order("display_name");
    if (error) return say(error.message, true);

    me = profiles.find((p) => p.id === session.user.id);
    $("who-name").textContent = me ? me.display_name : "";
    $("who-role").textContent = me && me.role === "dm" ? "Dungeon Master" : "Player";
    $("op-crest").textContent = me ? (me.display_name || me.username).slice(0, 1).toUpperCase() : "";
    const mine = me ? `?u=${encodeURIComponent(me.username)}` : "";
    $("who-name").href = `profile/${mine}`;
    $("my-profile").href = `profile/${mine}`;
    $("new-char").href = `create/${mine}`;
    $("dm-panel").hidden = !(me && me.role === "dm");
    $("rename-form").display_name.value = me ? me.display_name : "";

    const manage = $("manage");
    manage.replaceChildren(
      ...(me && me.role === "dm" ? profiles.filter((p) => p.id !== me.id) : []).map((p) => {
        const li = document.createElement("li");
        const name = document.createElement("span");
        name.textContent = p.display_name;
        const handle = document.createElement("span");
        handle.className = "handle";
        handle.textContent = `@${p.username}`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "link-button remove";
        remove.textContent = "Remove";
        remove.addEventListener("click", async () => {
          if (!confirm(`Remove ${p.display_name} (@${p.username}) from the party? Their account is deleted.`)) return;
          remove.disabled = true;
          try {
            await callMembers({ action: "remove", id: p.id }, true);
            say(`Removed @${p.username}.`);
            await render();
          } catch (err) {
            say(err.message, true);
            remove.disabled = false;
          }
        });
        li.append(name, handle, remove);
        return li;
      })
    );
    if (!manage.children.length) {
      const li = document.createElement("li");
      li.className = "handle";
      li.textContent = "No players yet. Share the Tavern link so they can sign up.";
      manage.append(li);
    }

    window.Hub.members = { me, profiles }; // for scripts that load after this first render
    window.dispatchEvent(new CustomEvent("hub:members", { detail: { me, profiles } }));
  }

  $("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    busy(form, async () => {
      const { username, password } = checkMember(formValues(form), false);
      const { error } = await db.auth.signInWithPassword({ email: toEmail(username), password });
      if (error) throw new Error("That username and password don't match.");
      form.reset();
      say("Welcome back.");
      await render();
    });
  });

  $("setup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    busy(form, async () => {
      const values = checkMember(formValues(form), true);
      say("Creating your account…");
      const result = await callMembers(values, false);
      await db.auth.signInWithPassword({ email: toEmail(values.username), password: values.password });
      form.reset();
      say(result.role === "dm" ? "Welcome. The DM seat is yours." : "Welcome to the Tavern.");
      await render();
    });
  });

  $("rename-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    busy(form, async () => {
      const { display_name } = formValues(form);
      const { error } = await db.from("profiles").update({ display_name: display_name.trim() }).eq("id", me.id);
      if (error) throw error;
      say("Name saved.");
      await render();
    });
  });

  $("logout").addEventListener("click", async () => {
    await db.auth.signOut();
    say("Signed out.");
    await render();
  });

  render();
})();
