(() => {
  // Public values only: the publishable key is safe in the browser, and row level
  // security in the database decides what each signed-in member can see or change.
  const SUPABASE_URL = "https://aagtsdqgleopualsallg.supabase.co";
  const SUPABASE_KEY = "sb_publishable_Q-DgGy_SToy1bpobL5UoJw_8piwAcA2";
  // Usernames map to a hidden email, so players only ever see username + password.
  const EMAIL_DOMAIN = "members.apotheosis.invalid";

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = (id) => document.getElementById(id);
  const status = $("status");

  function say(text, isError = false) {
    status.textContent = text;
    status.classList.toggle("is-error", isError);
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

  async function createMember(values, withSession) {
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
    $("party-panel").hidden = !session;
    $("who").hidden = !session;
    if (!session) {
      $("dm-panel").hidden = true;
      me = null;
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
    $("who-role").textContent = me && me.role === "dm" ? "DM" : "Player";
    $("dm-panel").hidden = !(me && me.role === "dm");
    $("rename-form").display_name.value = me ? me.display_name : "";

    const roster = $("roster");
    roster.replaceChildren(
      ...profiles.map((p) => {
        const li = document.createElement("li");
        const name = document.createElement("span");
        name.textContent = p.display_name;
        const handle = document.createElement("span");
        handle.className = "handle";
        handle.textContent = `@${p.username}`;
        const role = document.createElement("span");
        role.className = "tab";
        role.textContent = p.role === "dm" ? "DM" : "Player";
        li.append(name, handle, role);
        return li;
      })
    );
  }

  $("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    busy(form, async () => {
      const { username, password } = formValues(form);
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
      const values = formValues(form);
      try {
        await createMember(values, false);
      } catch (err) {
        if (/log in as the dm/i.test(err.message)) throw new Error("The DM seat is already taken. Sign in instead.");
        throw err;
      }
      await db.auth.signInWithPassword({ email: toEmail(values.username), password: values.password });
      form.reset();
      say("The DM seat is yours.");
      await render();
    });
  });

  $("add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    busy(form, async () => {
      const result = await createMember(formValues(form), true);
      form.reset();
      say(`Added @${result.username}. Send them their username and password.`);
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
