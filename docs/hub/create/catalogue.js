// What the creator offers beyond the Apotheosis notes, and the lore text it shows.
// Order of authority (Charl, 2026-11-02): the notes come first and win every clash. Classes,
// subclasses, feats and backgrounds from published 5e books (as listed on dnd5e.wikidot.com)
// fill in where the notes are silent. Left out: species (only the notes' species exist),
// setting-specific books (Eberron, Ravnica, Theros, Amonkhet, Kaladesh, Strixhaven, Wildemount,
// Dragonlance, Spelljammer, Planescape, Acquisitions Inc, Adventurers League), Forgotten
// Realms-only options, Battlerager, Banneret and Wildemount. UA and homebrew classes are allowed
// (Charl, 2026-11-02); UA and homebrew subclasses and feats are still out. Names only: the full rules text of
// non-SRD options is not ours to copy, so each option links to its wikidot page instead.
window.CreatorCatalogue = (() => {
  const WIKI = "https://dnd5e.wikidot.com";
  const slug = (s) => s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Classes outside the PHB. Charl allows Artificer, Blood Hunter, Mystic and the like (2026-11-02).
  const CLASSES = {
    Artificer: { die: 8, saves: ["con", "int"], skills: [2, ["Arcana", "History", "Investigation", "Medicine", "Nature", "Perception", "Sleight of Hand"]], spell: "int",
      source: "Tasha's Cauldron of Everything", tag: "Tasha's", subclasses: [], more: ["Alchemist", "Armorer", "Artillerist", "Battle Smith"] },
    "Blood Hunter": { die: 10, saves: ["dex", "int"], skills: [3, ["Acrobatics", "Arcana", "Athletics", "History", "Insight", "Investigation", "Religion", "Survival"]],
      source: "Matthew Mercer (homebrew)", tag: "Homebrew", note: "Blood curses and crimson rites run on your Hemocraft modifier.",
      subclasses: [], more: ["Order of the Ghostslayer", "Order of the Lycan", "Order of the Mutant", "Order of the Profane Soul"] },
    Mystic: { die: 8, saves: ["int", "wis"], skills: [2, ["Arcana", "History", "Insight", "Medicine", "Nature", "Perception", "Religion"]], spell: "int",
      source: "Unearthed Arcana", tag: "UA", note: "Psionics rather than spells: psi points, disciplines and talents, powered by Intelligence.",
      subclasses: [], more: ["Order of the Avatar", "Order of the Awakened", "Order of the Immortal", "Order of the Nomad", "Order of the Soul Knife", "Order of the Wu Jen"] },
  };

  // Subclasses from other published books, after the notes' own (PHB 2014 and 2024) list.
  const MORE_SUBCLASSES = {
    Barbarian: ["Path of the Ancestral Guardian", "Path of the Beast", "Path of the Giant", "Path of the Storm Herald", "Path of Wild Magic"],
    Bard: ["College of Creation", "College of Eloquence", "College of Spirits", "College of Swords", "College of Whispers"],
    Cleric: ["Arcana Domain", "Death Domain", "Forge Domain", "Grave Domain", "Order Domain", "Peace Domain", "Twilight Domain"],
    Druid: ["Circle of Dreams", "Circle of the Shepherd", "Circle of Spores", "Circle of Wildfire"],
    Fighter: ["Arcane Archer", "Cavalier", "Rune Knight", "Samurai"],
    Monk: ["Way of the Ascendant Dragon", "Way of the Astral Self", "Way of the Drunken Master", "Way of the Kensei", "Way of the Long Death", "Way of the Sun Soul"],
    Paladin: ["Oath of Conquest", "Oath of Redemption", "Oath of the Crown", "Oath of the Watchers", "Oathbreaker"],
    Ranger: ["Drakewarden", "Horizon Walker", "Monster Slayer", "Swarmkeeper"],
    Rogue: ["Inquisitive", "Mastermind", "Phantom", "Scout", "Swashbuckler"],
    Sorcerer: ["Divine Soul", "Lunar Sorcery", "Shadow Magic", "Storm Sorcery"],
    Warlock: ["Fathomless Patron", "Genie Patron", "Hexblade", "Undead Patron", "Undying Patron"],
    Wizard: ["Bladesinging", "Order of Scribes", "War Magic"],
  };

  // Backgrounds from other published books, after the PHB ones in the notes' list.
  const MORE_BACKGROUNDS = [
    "Anthropologist", "Archaeologist", "Athlete", "City Watch", "Clan Crafter", "Cloistered Scholar", "Courtier", "Faceless",
    "Far Traveler", "Feylost", "Fisher", "Giant Foundling", "Gladiator", "Inheritor", "Investigator", "Knight", "Knight of the Order",
    "Marine", "Mercenary Veteran", "Pirate", "Rewarded", "Ruined", "Rune Carver", "Shipwright", "Smuggler", "Spy",
    "Urban Bounty Hunter", "Witchlight Hand",
  ];

  // Feats. need: { any: {ability: score} } means one of them; caster: needs spellcasting or Pact Magic.
  // note: other prerequisites the DM checks (armour or weapon training, earlier feats).
  const ORIGIN = ["Alert", "Crafter", "Healer", "Lucky", "Magic Initiate", "Musician", "Savage Attacker", "Skilled", "Tavern Brawler", "Tough"];
  const s13 = (...a) => ({ any: Object.fromEntries(a.map((x) => [x, 13])) });
  const FEATS = {
    Actor: s13("cha"), Athlete: s13("str", "dex"), Charger: s13("str", "dex"), Chef: {}, "Crossbow Expert": s13("dex"),
    Crusher: s13("str", "con"), "Defensive Duelist": s13("dex"), "Dual Wielder": s13("str", "dex"), "Dungeon Delver": {}, Durable: {},
    "Eldritch Adept": { caster: true }, "Elemental Adept": { caster: true }, "Fey Touched": {}, "Fighting Initiate": { note: "Martial weapon training" },
    Grappler: s13("str", "dex"), "Great Weapon Master": s13("str"), "Heavily Armored": { note: "Medium armour training" },
    "Heavy Armor Master": { note: "Heavy armour training" }, "Inspiring Leader": s13("wis", "cha"), "Keen Mind": s13("int"),
    "Lightly Armored": {}, Linguist: {}, "Mage Slayer": {}, "Martial Adept": {}, "Medium Armor Master": { note: "Medium armour training" },
    "Metamagic Adept": { caster: true }, Mobile: {}, "Moderately Armored": { note: "Light armour training" }, "Mounted Combatant": {},
    Observant: s13("int", "wis"), Piercer: {}, Poisoner: {}, "Polearm Master": s13("str", "dex"), Resilient: {},
    "Ritual Caster": s13("int", "wis", "cha"), Sentinel: s13("str", "dex"), "Shadow Touched": {}, Sharpshooter: s13("dex"),
    "Shield Master": { note: "Shield training" }, "Skill Expert": {}, Skulker: s13("dex"), Slasher: {}, Speedy: s13("dex", "con"),
    "Spell Sniper": { caster: true }, Telekinetic: {}, Telepathic: {}, "War Caster": { caster: true }, "Weapon Master": {},
    "Artificer Initiate": {}, Cartomancer: { caster: true }, Gunner: {}, "Rune Shaper": {},
    "Gift of the Chromatic Dragon": {}, "Gift of the Gem Dragon": {}, "Gift of the Metallic Dragon": {},
    "Strike of the Giants": { note: "Martial weapon training" }, "Ember of the Fire Giant": { note: "Strike of the Giants" },
    "Fury of the Frost Giant": { note: "Strike of the Giants" }, "Guile of the Cloud Giant": { note: "Strike of the Giants" },
    "Keenness of the Stone Giant": { note: "Strike of the Giants" }, "Soul of the Storm Giant": { note: "Strike of the Giants" },
    "Vigor of the Hill Giant": { note: "Strike of the Giants" },
  };
  for (const n of ORIGIN) FEATS[n] = FEATS[n] || {};

  // Ability score improvements by class level (Fighter 6 and 14, Rogue 10 are the "non-standard" ones).
  // Custom racial feats: Charl is writing them. Placeholders until then.
  const RACIAL_WIP = ["Elf", "Dwerfen", "Orq", "Golyath", "Halfling", "Human", "Seraph", "Tiefling"];

  const ASI_STANDARD = [4, 8, 12, 16, 19];
  const ASI_EXTRA = { Fighter: [6, 14], Rogue: [10] };

  // Lore from the notes (Species & Backgrounds), shortened for the info panel.
  const LORE = {
    Elf: "Descended from the primordial elves who first walked the known world. Ears like blades and adaptations to their homelands; second only to humans in number. Base traits from the 2024 or 2014 PHB, your choice; in 2024 your lineage's spells come at levels 1, 3 and 5.",
    "High Elf": "Gladiatorial, Greco-Roman culturalists of decadent design who rule Romulon, the largest kingdom and the world's political and religious nexus. Golden-metallic skin, thick fair hair.",
    "Dark Elf (Drow)": "The deep elves of the underdark, brass and bronze skinned with pale grey or dirty blonde hair, bioluminescent marks and red or purple glowing eyes. Mostly from Latibulus, near the undersea.",
    "Wood Elf (Dryad)": "Primal elves bound by the verdant oath: they may not harm nature by any means. Horns and pale green, marked skin. Their greatest settlement is Kaer Holte, the Hollow Keep, in the Phenozimal Jungle.",
    "Snow Elf": "A lost offshoot of the wood elves: astrologers and scholars of the heavens with pearlescent hair, silver skin, claws and night-sky eyes. Presumed extinct; playable only at the DM's discretion.",
    Dwerfen: "Reclusive, greedy engineers of brass marvels from the Deep Roads, far below even the drow. Elf-like in looks but unrelated, risen from beneath the world's crust. Resistant, not immune, to lyrium.",
    Orq: "Wood elves cursed to savagery: antlers traded for wolven canines and ridged faces, and a hunger for conquest. The Pariah-Folk of desiccated forests and torn-down jungles.",
    Golyath: "Distant descendants of the giants, the primordial race that became the land itself. Each bears the favours of the first giants and can briefly grow toward their size.",
    Drakeborn: "Not playable: Drakeborn are NPCs, in the style of the Elder Scrolls' Argonians. An oviparous, scaled and curiously hive-minded people with room for individual ambition. Whether humans were cursed or gifted with dragon essence is unknown.",
    Halfling: "Small folk of the Everglade, an endless spring and autumn meadowland. Kind, unambitious, and watched over by the storied luck of the halflings.",
    Human: "As varied as they are numerous. Their ambition and resourcefulness are commended, respected and feared by all, though one human alone is more a blank canvas than a creature of great power.",
    Seraph: "Mortals carrying a greater spark of the outer deities, who can arc it outward as light, healing and heavenly fury. Their divinity often shows in biblically frightening ways. Seraphs can't be half-bloods.",
    Tiefling: "Lineages cursed through occult dealings or unsavoury unions, shunned by others and gathered into kingdoms of their own.",
    Infernal: "Luciferian in looks alone and not evil by nature: horns, spines, tails, golden eyes and a faint smell of sulphur, from the devils of the Nine Hells. Fiends.",
    Abyssal: "Beastly, muscular tieflings of Dremoric origin, united in the lawful Vashoth empire, the Grey Ones. No Abyssal Tiefling wizards: those born with magic are shackled Saarebas. Fiends.",
    Cthonic: "Horns growing from the eye sockets; physically blind, with blindsight to 15 m. Generally the kindest of tieflings, fond of jewellery and fine clothes. Aberrations.",
    "Half-blood": "A union of any two species except seraphs. Immune to most common diseases; you choose as many traits as the parent with more, at least one from each.",
    Dhampir: "Between the living and the dead: extra speed, darkvision, heightened senses and a life-draining bite, tested by endless hunger. Your strain is set by the vampire blood.",
    Chymaera: "Twins whose souls rejoined in the womb: one body, two minds, often mistaken for madness or possession.",
    Reborn: "Those who died and somehow still live, scarred by death or stitched and manufactured by magic or science.",
  };

  const link = {
    class: (c) => `${WIKI}/${slug(c)}`,
    feat: (f) => `${WIKI}/feat:${slug(f)}`,
    background: (b) => `${WIKI}/background:${slug(b)}`,
  };

  return { RACIAL_WIP, CLASSES, MORE_SUBCLASSES, MORE_BACKGROUNDS, FEATS, ORIGIN, ASI_STANDARD, ASI_EXTRA, LORE, link, WIKI };
})();
