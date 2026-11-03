// Character options for the Tavern's character creator, from the Apotheosis Manual
// (notes/sections): Changes to the Base Game, Species & Backgrounds, Religions and
// Appendix III. The base rules are the 2014 and 2024 Player's Handbooks used together
// ("Hybrid Source-Material"). Only rules choices live here; flavour text stays the player's.
window.CreatorOptions = (() => {
  const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
  const SKILLS = [
    "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight",
    "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance",
    "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival",
  ];

  // spell: spellcasting ability; spellAlt: the manual's "Class Divergence" alternatives.
  const CLASSES = {
    Barbarian: { die: 12, saves: ["str", "con"], skills: [2, ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"]],
      subclasses: ["Path of the Berserker", "Path of the Totem Warrior", "Path of the Wild Heart", "Path of the Zealot"] },
    Bard: { die: 8, saves: ["dex", "cha"], skills: [3, SKILLS], spell: "cha",
      subclasses: ["College of Dance", "College of Glamour", "College of Lore", "College of Valor"] },
    Cleric: { die: 8, saves: ["wis", "cha"], skills: [2, ["History", "Insight", "Medicine", "Persuasion", "Religion"]], spell: "wis",
      subclasses: ["Knowledge Domain", "Life Domain", "Light Domain", "Nature Domain", "Tempest Domain", "Trickery Domain", "War Domain"] },
    Druid: { die: 8, saves: ["int", "wis"], skills: [2, ["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"]], spell: "wis",
      subclasses: ["Circle of the Land", "Circle of the Moon", "Circle of the Sea", "Circle of the Stars"] },
    Fighter: { die: 10, saves: ["str", "con"], skills: [2, ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"]],
      subclasses: ["Battle Master", "Champion", "Eldritch Knight", "Psi Warrior"] },
    Monk: { die: 8, saves: ["str", "dex"], skills: [2, ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"]],
      subclasses: ["Warrior of Mercy", "Warrior of Shadow", "Warrior of the Elements", "Warrior of the Open Hand"] },
    Paladin: { die: 10, saves: ["wis", "cha"], skills: [2, ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"]],
      spell: "wis", spellNote: "Class Divergence: the paladin casts with Wisdom instead of Charisma.",
      subclasses: ["Oath of Devotion", "Oath of Glory", "Oath of the Ancients", "Oath of Vengeance"] },
    Ranger: { die: 10, saves: ["str", "dex"], skills: [3, ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"]], spell: "wis",
      subclasses: ["Beast Master", "Fey Wanderer", "Gloom Stalker", "Hunter"] },
    Rogue: { die: 8, saves: ["dex", "int"], skills: [4, ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"]],
      subclasses: ["Arcane Trickster", "Assassin", "Soulknife", "Thief"] },
    Sorcerer: { die: 6, saves: ["con", "cha"], skills: [2, ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"]],
      spell: "cha", spellAlt: ["con"], spellNote: "Class Divergence: Constitution on request, only if you never multiclass out of sorcerer.",
      subclasses: ["Aberrant Sorcery", "Draconic Sorcery", "Wild Magic Sorcery"] },
    Warlock: { die: 8, saves: ["wis", "cha"], skills: [2, ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"]],
      spell: "cha", spellAlt: ["int"], spellNote: "Class Divergence: Intelligence instead, on request.",
      subclasses: ["Archfey Patron", "Celestial Patron", "Fiend Patron", "Great Old One Patron"] },
    Wizard: { die: 6, saves: ["int", "wis"], skills: [2, ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"]], spell: "int",
      subclasses: ["Abjurer", "Conjurer", "Diviner", "Enchanter", "Evoker", "Illusionist", "Necromancer", "Transmuter"] },
    "Carlislean Lycanthrope": { die: 10, saves: ["str", "con"], skills: [2, ["Athletics", "Insight", "Intimidation", "Perception", "Stealth", "Survival"]],
      monster: true, noStart: true, note: "Monster class (Appendix III): only for characters who have reached Stage 5 of Canis Hysteria. DM's approval needed.",
      subclasses: [],
      features: [
        [1, "Bestial Transformation", "bonus", "Proficiency bonus / long rest"], [1, "Silverbound"], [1, "Mark of the Full Moon"],
        [2, "Tyrant's Scent"], [3, "Ambition's Claim"], [4, "Feral Agility"], [5, "Extra Attack"], [6, "Pack of Knives", "reaction"],
        [7, "Mind of the Beast"], [8, "Predator's Grasp"], [9, "Bloodthirst"], [10, "Roaring Howl", "bonus"], [11, "Relentless Hunter"],
        [12, "Tyranny's Advance"], [13, "Iron Fur Hide"], [14, "Blood-Sense", "action"], [15, "Alpha's Command"], [16, "Savage Momentum"],
        [17, "Lunar Regeneration"], [18, "Dread Wolf's Mandate"], [19, "Apex Form"], [20, "The Final Bargain"],
      ] },
  };

  // Species of the world (manual, Species), with the 2024 PHB species they build on. y2014: the
  // 2014-rules version, which the player may pick instead (Charl, 2026-11-02). npc: not playable.
  // traits: the bullet traits counted for Half-Blood inheritance.
  const SPECIES = {
    Elf: { y2014: { base: "Elf (2014 PHB)", traits: ["Darkvision", "Keen Senses", "Fey Ancestry", "Trance"] }, base: "Elf (2024 PHB)", speed: 30, size: "Medium", traits: ["Darkvision", "Elven Lineage", "Fey Ancestry", "Keen Senses", "Trance"],
      sub: {
        "High Elf": {}, "Dark Elf (Drow)": {}, "Wood Elf (Dryad)": { speed: 35 },
        "Snow Elf": { dm: true, note: "Presumed extinct: playable only at the DM's discretion.",
          extra: [["Light", "action", "Snow Elf lineage: you know the Light cantrip."], ["Frost Resistance", "feature", "Snow Elf lineage: resistance to cold (frost) damage."],
            ["Ice Knife", "action", "Snow Elf lineage, level 3."], ["Mirror Image", "action", "Snow Elf lineage, level 5."]] },
      } },
    Dwerfen: { y2014: { base: "Dwarf (2014 PHB)", speed: 25, traits: ["Darkvision", "Dwarven Resilience", "Dwarven Combat Training", "Tool Proficiency", "Stonecunning"] }, base: "Dwarf (2024 PHB)", speed: 30, size: "Medium", traits: ["Darkvision", "Dwarven Resilience", "Dwarven Toughness", "Stonecunning"],
      extra: [["Lyrium Resistance", "feature", "Generations near lyrium veins make you resistant, not immune, to its effects. Raw lyrium in open cuts, breathed in, or in the eyes or mouth still affects you. Surface dwerfen lose this over time."]] },
    Orq: { y2014: { base: "Orc (Monsters of the Multiverse)", traits: ["Adrenaline Rush", "Darkvision", "Powerful Build", "Relentless Endurance"] }, base: "Orc (2024 PHB)", speed: 30, size: "Medium", traits: ["Adrenaline Rush", "Darkvision", "Relentless Endurance"] },
    Golyath: { y2014: { base: "Goliath (Monsters of the Multiverse)", speed: 30, choice: null, traits: ["Little Giant", "Mountain Born", "Stone's Endurance"] }, base: "Goliath (2024 PHB)", speed: 35, size: "Medium", traits: ["Giant Ancestry", "Large Form", "Powerful Build"],
      choice: ["Giant ancestry", ["Cloud's Jaunt", "Fire's Burn", "Frost's Chill", "Hill's Tumble", "Stone's Endurance", "Storm's Thunder"]] },
    Drakeborn: { y2014: { base: "Dragonborn (2014 PHB)", traits: ["Draconic Ancestry", "Breath Weapon", "Damage Resistance"] }, base: "Dragonborn (2024 PHB)", speed: 30, size: "Medium", traits: ["Draconic Ancestry", "Breath Weapon", "Damage Resistance", "Darkvision", "Draconic Flight"],
      choice: ["Draconic ancestry", ["Black (acid)", "Blue (lightning)", "Brass (fire)", "Bronze (lightning)", "Copper (acid)", "Gold (fire)", "Green (poison)", "Red (fire)", "Silver (cold)", "White (cold)"]] },
    Halfling: { y2014: { base: "Halfling (2014 PHB)", speed: 25, traits: ["Lucky", "Brave", "Halfling Nimbleness"] }, base: "Halfling (2024 PHB)", speed: 30, size: "Small", traits: ["Brave", "Halfling Nimbleness", "Luck", "Naturally Stealthy"] },
    Human: { y2014: { base: "Variant Human (2014 PHB)", traits: ["Extra Skill Proficiency", "Extra Feat"] }, base: "Human (2024 PHB)", speed: 30, size: "Medium", traits: ["Resourceful", "Skillful", "Versatile"] },
    Seraph: { y2014: { base: "Aasimar (Monsters of the Multiverse)" }, base: "Aasimar (2024 PHB)", speed: 30, size: "Medium", noHalfBlood: true, traits: ["Celestial Resistance", "Darkvision", "Healing Hands", "Light Bearer", "Celestial Revelation"] },
    Tiefling: { y2014: { base: "Tiefling (2014 PHB)", traits: ["Darkvision", "Hellish Resistance", "Infernal Legacy"] }, base: "Tiefling (2024 PHB)", speed: 30, size: "Medium", traits: ["Darkvision", "Fiendish Legacy", "Otherworldly Presence"],
      sub: {
        Infernal: { note: "Fiend." },
        Abyssal: { note: "Fiend. No Abyssal Tiefling wizards: magic is outlawed, and those born with it become shackled Saarebas.", noClass: ["Wizard"] },
        Cthonic: { note: "Aberration. Physically blind, with blindsight to 15 m.",
          extra: [["Blindsight", "feature", "You are physically blind, but sense your surroundings magically: blindsight to a range of 15 m."]] },
      } },
  };

  // Manual, Half-Blood Species.
  const HALF_BLOOD = {
    base: [["Half-Blood Resilience", "feature", "Immune to most common diseases (not magical illnesses). Against race-altering curses such as vampirism, roll a d20 with disadvantage against DC 10: on a failure you are severely weakened until a long rest; on a critical failure you take a permanent debuff at the DM's discretion."]],
  };

  // Manual, Variant Species: laid over the base species.
  const VARIANTS = {
    None: {},
    // Born dhampir are "True Dhampir" (Effects & Afflictions, Dhampirism, stages 1 to 3), plus the variant's extra speed.
    Dhampir: {
      speedBonus: "+10 m",
      features: [
        ["Heightened Senses", "feature", "You have advantage on Wisdom (Perception) checks.", { icon: "Dhampir Heightened Senses" }],
        ["Darkvision", "feature", "Dhampir: darkvision out to 60 feet.", { icon: "Dhampir Darkvision" }],
        ["Life-Draining Bite", "action", "A bite attack that heals you for the damage dealt. 2d4, rising to 2d6, 2d8 and 2d10 at character levels 4, 8 and 12.", { icon: "Dhampir Life-Draining Bite", formula: (lv) => (lv >= 12 ? "2d10" : lv >= 8 ? "2d8" : lv >= 4 ? "2d6" : "2d4") }],
      ],
      sub: {
        Crystalline: { features: [
          ["Tough", "feature", "Crystalline: you gain the benefits of the Tough feat and resistance to non-magical bludgeoning, piercing and slashing damage.", { icon: "Dhampir Crystalline Tough" }],
          ["Brittle Skin", "feature", "Crystalline: you are vulnerable to thunder damage.", { icon: "Dhampir Brittle Skin" }]] },
        Chiropterine: { features: [
          ["Dread Ambusher", "feature", "Chiropterine: you gain the Dread Ambusher feature of Gloom Stalker rangers.", { icon: "Dhampir Dread Ambusher" }],
          ["Sunlight Sensitivity", "feature", "Chiropterine: while in sunlight you have disadvantage on attack rolls and on Wisdom (Perception) checks that rely on sight, and you are vulnerable to radiant damage.", { icon: "Dhampir Sunlight Sensitivity" }]] },
      },
    },
    Chymaera: {
      features: [
        ["Dual Mind", "feature", "You have advantage on all Wisdom saving throws."],
        ["Mental Discipline", "feature", "You have resistance to psychic damage."],
        ["Mind Link", "feature", "You can speak telepathically to any creature you can see within 10 times your level in feet. It must understand at least one language."],
        ["Severed Spirits", "action", "Once per long rest, restore a level 1 spell slot, 2 ki points or 1 specialty die or magical resource for yourself or a party member within 30 ft."],
      ],
    },
    Reborn: {
      features: [
        ["Ancestral Legacy", "feature", "Keep the replaced species' skill proficiencies and climb, fly or swim speeds, or gain proficiency in two skills of your choice."],
        ["Deathless Nature", "feature", "Advantage on saves against disease and being poisoned; resistance to poison damage; advantage on death saves. You don't need to eat, drink, breathe or sleep, and magic can't put you to sleep. A long rest takes 4 hours of motionless, conscious inactivity."],
        ["Knowledge from a Past Life", "feature", "After seeing the d20 on a skill check, add a d6. Uses equal to your proficiency bonus per long rest.", { uses: "PB" }],
      ],
    },
  };

  // 2014 and 2024 PHB backgrounds. The creator stores the rules choice; the name and story stay editable.
  const BACKGROUNDS = [
    "Acolyte", "Artisan", "Charlatan", "Criminal", "Entertainer", "Farmer", "Folk Hero", "Guard", "Guide", "Guild Artisan",
    "Haunted One", "Hermit", "Merchant", "Noble", "Outlander", "Sage", "Sailor", "Scribe", "Soldier", "Urchin", "Wayfarer",
  ];

  // Manual, Religions: Alignment & Belief.
  const RELIGIONS = [
    ["None", ""], ["Gnocism", "Lawful Good"], ["Aposiopism", "Lawful Evil"], ["Tar-Vasham", "Lawful Neutral"],
    ["Empyrealism", "Chaotic Neutral"], ["Viridism", "Chaotic Good"], ["Miasmism", "Chaotic Evil"], ["Proditism", "Neutral Evil"],
  ];
  const ALIGNMENTS = ["Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil"];

  const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
  const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

  return { ABILITIES, SKILLS, CLASSES, SPECIES, HALF_BLOOD, VARIANTS, BACKGROUNDS, RELIGIONS, ALIGNMENTS, STANDARD_ARRAY, POINT_COST };
})();
