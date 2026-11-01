// "At the table" panel in the Tavern: shows the scene the DM has live and plays
// its music in sync. Updates arrive through Supabase Realtime; nothing polls.
(() => {
  const { db, $ } = window.Hub;
  const SITE = new URL("../", location.href).href; // the website root, where soundtrack/ lives
  let channel = null;
  let sceneId;

  const player = SceneAudio.create({
    base: SITE,
    onChange: ({ track, playing, unlocked }) => {
      $("scene-track").textContent = track ? `${playing ? "Now playing" : "Paused"}: ${track}` : "";
      $("sound-toggle").textContent = unlocked ? "Mute music" : "Turn on music";
    },
  });

  async function showScene(state) {
    const panel = $("scene-panel");
    if (state.scene_id !== sceneId) {
      sceneId = state.scene_id;
      const { data: scene } = sceneId
        ? await db.from("scenes").select("name, description, image").eq("id", sceneId).single()
        : { data: null };
      panel.classList.toggle("is-empty", !scene);
      $("scene-name").textContent = scene ? scene.name : "The fire is low";
      $("scene-desc").textContent = scene ? scene.description || "" : "No scene is running. When the DM starts one, it appears here.";
      $("scene-art").style.backgroundImage = scene && scene.image ? `url("${new URL(scene.image, SITE).href}")` : "";
    }
    const music = state.music || {};
    $("scene-sound").hidden = !(music.tracks || []).length;
    player.update(music);
  }

  async function start() {
    const { data, error } = await db.from("session_state").select("scene_id, music").eq("id", 1).single();
    if (error) return;
    $("scene-panel").hidden = false;
    await showScene(data);
    channel = db
      .channel("table-scene")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "session_state", filter: "id=eq.1" }, (msg) => showScene(msg.new))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "scenes" }, (msg) => {
        if (msg.new.id === sceneId) {
          sceneId = undefined; // force a reload of the scene text and art
          db.from("session_state").select("scene_id, music").eq("id", 1).single().then(({ data: s }) => s && showScene(s));
        }
      })
      .subscribe();
  }

  function stop() {
    if (channel) db.removeChannel(channel);
    channel = null;
    sceneId = undefined;
    player.disable();
    $("scene-panel").hidden = true;
  }

  $("sound-toggle").addEventListener("click", () => (player.enabled ? player.disable() : player.enable()));
  const vol = $("scene-volume");
  vol.value = player.localVolume;
  vol.addEventListener("input", () => player.setLocalVolume(vol.value));

  db.auth.onAuthStateChange((event, session) => {
    // Defer: supabase-js warns against awaiting other calls inside this callback.
    setTimeout(() => {
      if (session && !channel) start();
      if (!session && channel) stop();
    }, 0);
  });
})();
