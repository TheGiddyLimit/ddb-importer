import utils from "../lib/utils.js";
import DDBHelper from "../lib/DDBHelper.js";
import logger from "../logger.js";
import DICTIONARY from "../dictionary.js";
import { equipmentEffectAdjustment } from "./specialEquipment.js";
import { infusionEffectAdjustment } from "./specialInfusions.js";
import { generateACEffectChangesForItem } from "./acEffects.js";
import DDBCharacter from "../parser/DDBCharacter.js";
// import { spellEffectAdjustment } from "./specialSpells.js";

/**
 * Add supported effects here to exclude them from calculations.
 */
const EFFECT_EXCLUDED_COMMON_MODIFIERS = [
  { type: "bonus", subType: "saving-throws" },
  { type: "bonus", subType: "ability-checks" },
  { type: "bonus", subType: "skill-checks" },
  { type: "bonus", subType: "proficiency-bonus" },

  { type: "set", subType: "strength-score" },
  { type: "set", subType: "dexterity-score" },
  { type: "set", subType: "constitution-score" },
  { type: "set", subType: "wisdom-score" },
  { type: "set", subType: "intelligence-score" },
  { type: "set", subType: "charisma-score" },

  // skills
  { type: "bonus", subType: "acrobatics" },
  { type: "bonus", subType: "animal-handling" },
  { type: "bonus", subType: "arcana" },
  { type: "bonus", subType: "athletics" },
  { type: "bonus", subType: "deception" },
  { type: "bonus", subType: "history" },
  { type: "bonus", subType: "insight" },
  { type: "bonus", subType: "intimidation" },
  { type: "bonus", subType: "investigation" },
  { type: "bonus", subType: "medicine" },
  { type: "bonus", subType: "nature" },
  { type: "bonus", subType: "perception" },
  { type: "bonus", subType: "performance" },
  { type: "bonus", subType: "persuasion" },
  { type: "bonus", subType: "religion" },
  { type: "bonus", subType: "sleight-of-hand" },
  { type: "bonus", subType: "stealth" },
  { type: "bonus", subType: "survival" },

  { type: "advantage", subType: "acrobatics" },
  { type: "advantage", subType: "animal-handling" },
  { type: "advantage", subType: "arcana" },
  { type: "advantage", subType: "athletics" },
  { type: "advantage", subType: "deception" },
  { type: "advantage", subType: "history" },
  { type: "advantage", subType: "insight" },
  { type: "advantage", subType: "intimidation" },
  { type: "advantage", subType: "investigation" },
  { type: "advantage", subType: "medicine" },
  { type: "advantage", subType: "nature" },
  { type: "advantage", subType: "perception" },
  { type: "advantage", subType: "performance" },
  { type: "advantage", subType: "persuasion" },
  { type: "advantage", subType: "religion" },
  { type: "advantage", subType: "sleight-of-hand" },
  { type: "advantage", subType: "stealth" },
  { type: "advantage", subType: "survival" },


  { type: "bonus", subType: "passive-insight" },
  { type: "bonus", subType: "passive-investigation" },
  { type: "bonus", subType: "passive-perception" },
  // advantage on skills - not added here as not used elsewhere in importer.
  // { type: "advantage", subType: "acrobatics" },

  // initiative
  { type: "advantage", subType: "initiative" },
  { type: "bonus", subType: "initiative" },

  { type: "bonus", subType: "strength-ability-checks" },
  { type: "bonus", subType: "dexterity-ability-checks" },
  { type: "bonus", subType: "constitution-ability-checks" },
  { type: "bonus", subType: "wisdom-ability-checks" },
  { type: "bonus", subType: "intelligence-ability-checks" },
  { type: "bonus", subType: "charisma-ability-checks" },

  { type: "bonus", subType: "strength-saving-throws" },
  { type: "bonus", subType: "dexterity-saving-throws" },
  { type: "bonus", subType: "constitution-saving-throws" },
  { type: "bonus", subType: "wisdom-saving-throws" },
  { type: "bonus", subType: "intelligence-saving-throws" },
  { type: "bonus", subType: "charisma-saving-throws" },

  // attack modifiers
  { type: "bonus", subType: "weapon-attacks" },
  { type: "bonus", subType: "melee-attacks" },
  { type: "bonus", subType: "ranged-attacks" },
  { type: "bonus", subType: "melee-weapon-attacks" },
  { type: "bonus", subType: "ranged-weapon-attacks" },
  { type: "damage", subType: null },

  // spell modifiers
  { type: "bonus", subType: "spell-save-dc" },
  { type: "bonus", subType: "spell-attacks" },
  { type: "bonus", subType: "warlock-spell-save-dc" },
  { type: "bonus", subType: "warlock-spell-attacks" },
  { type: "bonus", subType: "spell-group-healing" } // system.bonuses.heal.damage
];

const EFFECT_EXCLUDED_HP_MODIFIERS = [
  { type: "bonus", subType: "hit-points-per-level" },
  { type: "bonus", subType: "hit-points" },
];

const EFFECT_EXCLUDED_SENSE_MODIFIERS = [
  // senses
  { type: "set-base", subType: "darkvision" },
  { type: "sense", subType: "darkvision" },
  { type: "set-base", subType: "blindsight" },
  { type: "sense", subType: "blindsight" },
  { type: "set-base", subType: "tremorsense" },
  { type: "sense", subType: "tremorsense" },
  { type: "set-base", subType: "truesight" },
  { type: "sense", subType: "truesight" },
];

const EFFECT_EXCLUDED_SPEED_SET_MODIFIERS = [
  // speeds
  { type: "set", subType: "innate-speed-walking" },
  { type: "set", subType: "innate-speed-climbing" },
  { type: "set", subType: "innate-speed-swimming" },
  { type: "set", subType: "innate-speed-flying" },
];

const EFFECT_EXCLUDED_SPEED_BONUS_MODIFIERS = [
  { type: "bonus", subType: "speed" },
  { type: "bonus", subType: "speed-walking" },
  { type: "bonus", subType: "speed-climbing" },
  { type: "bonus", subType: "speed-swimming" },
  { type: "bonus", subType: "speed-flying" },
];

const EFFECT_EXCLUDED_GENERAL_SPEED_MODIFIERS = EFFECT_EXCLUDED_SPEED_SET_MODIFIERS.concat(EFFECT_EXCLUDED_SPEED_BONUS_MODIFIERS);

const EFFECT_EXCLUDED_MONK_SPEED_MODIFIERS = [
  { type: "bonus", subType: "unarmored-movement" },
];

const EFFECT_EXCLUDED_ALL_SPEED_MODIFIERS = EFFECT_EXCLUDED_GENERAL_SPEED_MODIFIERS.concat(EFFECT_EXCLUDED_MONK_SPEED_MODIFIERS);

const EFFECT_EXCLUDED_ABILITY_BONUSES = [
  { type: "bonus", subType: "strength-score" },
  { type: "bonus", subType: "dexterity-score" },
  { type: "bonus", subType: "constitution-score" },
  { type: "bonus", subType: "wisdom-score" },
  { type: "bonus", subType: "intelligence-score" },
  { type: "bonus", subType: "charisma-score" },
];

const EFFECT_EXCLUDED_PROFICIENCY_BONUSES = [
  // profs
  { type: "proficiency", subType: null },
];

const EFFECT_EXCLUDED_LANGUAGES_MODIFIERS = [
  // languages - e.g. dwarvish -- lookup from DICTIONARY
  { type: "language", subType: null },
];

const EFFECT_EXCLUDED_DAMAGE_CONDITION_MODIFIERS = [
  // resistances - subType - e.g. poison - lookup from DICTIONARY
  { type: "resistance", subType: null },
  { type: "immunity", subType: null },
  { type: "vulnerability", subType: null },
];

const AC_BONUS_MODIFIERS = [
  { type: "bonus", subType: "unarmored-armor-class" },
  { type: "bonus", subType: "armor-class" },
  { type: "bonus", subType: "armored-armor-class" },
  { type: "bonus", subType: "dual-wield-armor-class" },
];

const AC_EFFECTS = [
  { type: "set", subType: "unarmored-armor-class" },
  { type: "ignore", subType: "unarmored-dex-ac-bonus" },
  { type: "set", subType: "ac-max-dex-modifier" },
];

export function getEffectExcludedModifiers(type, features, ac) {
  let modifiers = [];

  if (type !== "item") {
    // these are the effect tweaks, and mostly excessive
    const speedEffect = game.settings.get("ddb-importer", `character-update-policy-effect-${type}-speed`);
    const senseEffect = game.settings.get("ddb-importer", `character-update-policy-effect-${type}-senses`);
    const hpEffect = game.settings.get("ddb-importer", `character-update-policy-effect-${type}-hp`);
    const damageEffect = game.settings.get("ddb-importer", `character-update-policy-effect-${type}-damages`);

    // features represent core non ac features
    if (features) {
      modifiers = modifiers.concat(EFFECT_EXCLUDED_COMMON_MODIFIERS);
      if (["feat", "background", "race", "class"].includes(type)) {
        if (speedEffect) modifiers = modifiers.concat(EFFECT_EXCLUDED_GENERAL_SPEED_MODIFIERS);
        if (senseEffect) modifiers = modifiers.concat(EFFECT_EXCLUDED_SENSE_MODIFIERS);
        if (hpEffect) modifiers = modifiers.concat(EFFECT_EXCLUDED_HP_MODIFIERS);
        if (damageEffect) modifiers = modifiers.concat(EFFECT_EXCLUDED_DAMAGE_CONDITION_MODIFIERS);
      }
      if (["class"].includes(type)) {
        modifiers = modifiers.concat(EFFECT_EXCLUDED_MONK_SPEED_MODIFIERS);
      } else if (["feat", "background", "race"].includes(type)) {
        if (speedEffect) modifiers = modifiers.concat(EFFECT_EXCLUDED_MONK_SPEED_MODIFIERS);
      }
    }
    // here ac represents the more exotic ac effects that set limits and change base
    modifiers = modifiers.concat(AC_BONUS_MODIFIERS);
    if (ac) {
      modifiers = modifiers.concat(AC_EFFECTS);
    }
  }

  // items are basically their own thing, all or nuffin
  if (type === "item") {
    modifiers = modifiers.concat(
      EFFECT_EXCLUDED_COMMON_MODIFIERS,
      EFFECT_EXCLUDED_ABILITY_BONUSES,
      EFFECT_EXCLUDED_DAMAGE_CONDITION_MODIFIERS,
      EFFECT_EXCLUDED_LANGUAGES_MODIFIERS,
      EFFECT_EXCLUDED_PROFICIENCY_BONUSES,
      EFFECT_EXCLUDED_ALL_SPEED_MODIFIERS,
      EFFECT_EXCLUDED_SENSE_MODIFIERS,
      EFFECT_EXCLUDED_HP_MODIFIERS,
      AC_EFFECTS,
      AC_BONUS_MODIFIERS,
    );
  }
  return modifiers;
}

// eslint-disable-next-line complexity
export function effectModules() {
  if (CONFIG.DDBI.EFFECT_CONFIG.MODULES.installedModules) {
    return CONFIG.DDBI.EFFECT_CONFIG.MODULES.installedModules;
  }
  const midiQolInstalled = game.modules.get("midi-qol")?.active ?? false;
  const advancedMacrosInstalled = game.modules.get("advanced-macros")?.active ?? false;
  const itemMacroInstalled = game.modules.get("itemacro")?.active ?? false;
  const timesUp = game.modules.get("times-up")?.active ?? false;
  const daeInstalled = game.modules.get("dae")?.active ?? false;
  const convenientEffectsInstalled = game.modules.get("dfreds-convenient-effects")?.active ?? false;

  const activeAurasInstalled = game.modules.get("ActiveAuras")?.active ?? false;
  const atlInstalled = game.modules.get("ATL")?.active ?? false;
  const tokenAurasInstalled = game.modules.get("token-auras")?.active ?? false;
  const tokenMagicInstalled = game.modules.get("tokenmagic")?.active ?? false;
  const autoAnimationsInstalled = game.modules.get("autoanimations")?.active ?? false;
  const chrisInstalled = game.modules.get("chris-premades")?.active ?? false;
  const vision5eInstalled = game.modules.get("vision-5e")?.active ?? false;
  const warpgateInstalled = game.modules.get("warpgate")?.active ?? false;

  const needAdvancedMacros = isNewerVersion(11, game.version);
  CONFIG.DDBI.EFFECT_CONFIG.MODULES.installedModules = {
    hasCore: itemMacroInstalled && midiQolInstalled && timesUp && daeInstalled && convenientEffectsInstalled
      && ((needAdvancedMacros && advancedMacrosInstalled) || !needAdvancedMacros),
    hasMonster: midiQolInstalled && timesUp && daeInstalled && convenientEffectsInstalled,
    midiQolInstalled,
    itemMacroInstalled,
    advancedMacrosInstalled,
    timesUp,
    daeInstalled,
    convenientEffectsInstalled,
    atlInstalled,
    tokenAurasInstalled,
    tokenMagicInstalled,
    activeAurasInstalled,
    autoAnimationsInstalled,
    chrisInstalled,
    vision5eInstalled,
    warpgateInstalled,
  };
  return CONFIG.DDBI.EFFECT_CONFIG.MODULES.installedModules;
}

/**
 *
 * Generate a base effect for an Item
 *
 * @param {*} formula
 * @param {*} mode
 * @param {*} itemData
 * @param {*} label
 * @param {*} origin
 */

export function baseItemEffect(foundryItem, label) {
  let effect = {
    icon: foundryItem.img,
    changes: [],
    duration: {},
    // duration: {
    //   seconds: null,
    //   startTime: null,
    //   rounds: null,
    //   turns: null,
    //   startRound: null,
    //   startTurn: null,
    // },
    tint: "",
    transfer: true,
    disabled: false,
    // origin: origin,
    flags: {
      dae: {
        transfer: true,
        stackable: "noneName",
        // armorEffect: true
      },
      ddbimporter: {
        disabled: false,
      },
      "midi-qol": { // by default force CE effect usage to off
        forceCEOff: true,
      },
      core: {},
    },
  };
  if (isNewerVersion(game.version, 11)) {
    effect.name = label;
    effect.statuses = [];
  } else {
    effect.label = label;
  }
  return effect;
}

export function getMidiCEOnFlags(midiFlags = {}) {
  setProperty(midiFlags, "forceCEOff", false);
  setProperty(midiFlags, "forceCEOn", true);
  return midiFlags;
}

export function forceItemEffect(document) {
  if (document.effects.length > 0 || hasProperty(document.flags, "itemacro")) {
    setProperty(document, "flags.ddbimporter.effectsApplied", true);
    setProperty(document, "flags.midi-qol.forceCEOff", true);
  }
  return document;
}

export function forceManualReaction(document) {
  setProperty(document, "system.activation.type", "reactionmanual");
  return document;
}

// *
// CONST.ACTIVE_EFFECT_MODES.
// ADD: 2
// CUSTOM: 0
// DOWNGRADE: 3
// MULTIPLY: 1
// OVERRIDE: 5
// UPGRADE: 4
//

export function generateBaseSkillEffect(id, label) {
  const mockItem = {
    img: "icons/svg/up.svg",
  };
  let skillEffect = baseItemEffect(mockItem, label);
  skillEffect.flags.dae = {};
  skillEffect.flags.ddbimporter.characterEffect = true;
  skillEffect.origin = `Actor.${id}`;
  delete skillEffect.transfer;
  return skillEffect;
}


export function generateStatusEffectChange(statusName, priority = 20, macro = false) {
  const value = macro
    ? statusName
    : CONFIG.statusEffects.find((se) => se.name === statusName)?.id || statusName;
  if (!value) {
    logger.error(`Status effect ${statusName} not found`);
  }
  return {
    key: macro && !value.startsWith("Convenient Effect:") ? "macro.CE" : "StatusEffect",
    mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
    value: macro || value.startsWith("Convenient Effect:") ? value : `Convenient Effect: ${value}`,
    priority: priority,
  };
}

export function generateTokenMagicFXChange(macroValue, priority = 20) {
  return {
    key: 'macro.tokenMagic',
    mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
    value: macroValue,
    priority: priority,
  };
}

export function generateATLChange(atlKey, mode, value, priority = 20) {
  let key = atlKey;

  switch (atlKey) {
    case 'ATL.dimLight':
      key = 'ATL.light.dim';
      break;
    case 'ATL.brightLight':
      key = 'ATL.light.bright';
      break;
    case 'ATL.lightAnimation':
      key = 'ATL.light.animation';
      break;
    case 'ATL.lightColor':
      key = 'ATL.light.color';
      break;
    case 'ATL.lightAlpha':
      key = 'ATL.light.alpha';
      break;
    case 'ATL.lightAngle':
      key = 'ATL.light.angle';
      break;
    // no default
  }

  return {
    key,
    mode,
    value,
    priority,
  };
}

export function generateChange(bonus, priority, key, mode) {
  return {
    key: key,
    value: bonus,
    mode: mode,
    priority: priority,
  };
}

export function generateAddChange(bonus, priority, key) {
  const bonusValue = (Number.isInteger(bonus) && bonus >= 0) // if bonus is a positive integer
    || (!Number.isInteger(bonus) && !bonus.trim().startsWith("+") && !bonus.trim().startsWith("-")) // not an int and does not start with + or -
    ? `+${bonus}`
    : bonus;
  return generateChange(bonusValue, priority, key, CONST.ACTIVE_EFFECT_MODES.ADD);
}

export function generateCustomChange(bonus, priority, key) {
  return generateChange(bonus, priority, key, CONST.ACTIVE_EFFECT_MODES.CUSTOM);
}

export function generateCustomBonusChange(bonus, priority, key) {
  const bonusValue = (Number.isInteger(bonus) && bonus >= 0) // if bonus is a positive integer
    || (!Number.isInteger(bonus) && !bonus.trim().startsWith("+") && !bonus.trim().startsWith("-")) // not an int and does not start with + or -
    ? `+${bonus}`
    : bonus;
  return generateChange(bonusValue, priority, key, CONST.ACTIVE_EFFECT_MODES.CUSTOM);
}

export function generateUpgradeChange(bonus, priority, key) {
  return generateChange(bonus, priority, key, CONST.ACTIVE_EFFECT_MODES.UPGRADE);
}

export function generateOverrideChange(bonus, priority, key) {
  return generateChange(bonus, priority, key, CONST.ACTIVE_EFFECT_MODES.OVERRIDE);
}

export function generateMultiplyChange(bonus, priority, key) {
  return generateChange(bonus, priority, key, CONST.ACTIVE_EFFECT_MODES.MULTIPLY);
}

export function generateDowngradeChange(bonus, priority, key) {
  return generateChange(bonus, priority, key, CONST.ACTIVE_EFFECT_MODES.DOWNGRADE);
}


// special effect functions
function attunedItemsBonus(actor, change) {
  // actor is the actor being processed and change a key/value pair
  if (change.key === "system.bonuses.abilities.save" && change.value === "ATTUNED_ITEM_BONUS") {
    // If your active effect spec was
    const bonus = actor.items.filter((item) => item.system.attunement == 2).length;
    // actor.system.bonuses.abilities.save += bonus;
    logger.debug(`Setting attuned items saving throw bonus for ${actor.name} to ${bonus}`);
    // setProperty(actor, "system.flags.ddbimporter.attundedItems", bonus);
    // this updates the effect value
    change.value = bonus;
    // console.warn(actor);
    // console.warn(change);
    // console.warn(bonus);
  }
}

Hooks.on("applyActiveEffect", attunedItemsBonus);


/**
 * Generates a global custom bonus for an item with a +
 */
function addCustomBonusEffect(modifiers, name, type, key) {
  let changes = [];
  const bonuses = DDBHelper.getValueFromModifiers(modifiers, name, type, "bonus");

  if (bonuses) {
    changes.push(generateCustomChange(`${bonuses}`, 18, key));
    logger.debug(`Changes for ${type} bonus for ${name}`, changes);
  }

  return changes;
}

//
// Generate saving throw bonuses
//
function addGlobalSavingBonusEffect(modifiers, name) {
  const type = "saving-throws";
  const key = "system.bonuses.abilities.save";
  let changes = [];
  const regularBonuses = modifiers.filter((mod) => !mod.bonusTypes?.includes(2));
  const customBonuses = modifiers.filter((mod) => mod.bonusTypes?.includes(2));

  if (customBonuses.length > 0) {
    let customEffects = addCustomBonusEffect(customBonuses, name, type, key);
    changes = changes.concat(customEffects);
  }

  const regularModifiers = DDBHelper.filterModifiers(regularBonuses, "bonus", type);

  if (regularModifiers.length > 0) {
    logger.debug(`Generating ${type} bonus for ${name}`);
    let bonuses = "";
    regularModifiers.forEach((modifier) => {
      let bonusParse = DDBHelper.extractModifierValue(modifier);
      if (bonuses !== "") bonuses += " + ";
      bonuses += bonusParse;
    });
    if (bonuses === "") bonuses = 0;
    changes.push(generateAddChange(`+ ${bonuses}`, 20, key));
    logger.debug(`Changes for ${type} bonus for ${name}`, changes);
  }

  return changes;
}

/**
 * Generates a global custom bonus for an item
 */
function addCustomEffect(modifiers, name, type, key, extra = "") {
  let changes = [];
  const bonus = DDBHelper.filterModifiers(modifiers, "bonus", type).reduce((a, b) => a + b.value, 0);
  if (bonus !== 0) {
    logger.debug(`Generating ${type} bonus for ${name}`);
    changes.push(generateCustomChange(`${bonus}${(extra) ? extra : ""}`, 18, key));
  }
  return changes;
}

/**
 * Generates a global add for an item
 */
export function addAddEffect(modifiers, name, type, key) {
  let changes = [];
  // const bonus = DDBHelper.filterModifiers(modifiers, "bonus", type).reduce((a, b) => a + b.value, 0);
  const bonus = DDBHelper.getValueFromModifiers(modifiers, name, type, "bonus");
  if (bonus) {
    logger.debug(`Generating ${type} bonus for ${name}`, bonus);
    changes.push(generateAddChange(`+ ${bonus}`, 18, key));
  }
  return changes;
}

/**
 * Adds languages, can't handle custom languages
 */
function addLanguages(modifiers, name) {
  let changes = [];

  const ddbCharacter = new DDBCharacter();
  const languages = ddbCharacter.getLanguagesFromModifiers(modifiers);

  languages.value.forEach((prof) => {
    logger.debug(`Generating language ${prof} for ${name}`);
    changes.push(generateCustomChange(prof, 0, "system.traits.languages.value"));
  });
  if (languages?.custom != "") {
    logger.debug(`Generating language ${languages.custom} for ${name}`);
    changes.push(generateCustomChange(languages.custom, 0, "system.traits.languages.custom"));
  }

  return changes;
}


/**
 * Generate global damage bonuses
*/
function addGlobalDamageBonus(modifiers, name) {
  const meleeRestrictions = ["Melee Weapon Attacks"];
  let changes = [];
  const meleeBonus = DDBHelper.filterModifiers(modifiers, "damage", null, meleeRestrictions)
    .filter((mod) => mod.dice || mod.die || mod.value)
    .map((mod) => {
      const die = mod.dice ? mod.dice : mod.die ? mod.die : undefined;
      if (die) {
        return utils.parseDiceString(die.diceString, null, mod.subType ? `[${mod.subType}]` : null).diceString;
      } else {
        return utils.parseDiceString(mod.value, null, mod.subType ? `[${mod.subType}]` : null).diceString;
      }
    });
  if (meleeBonus && meleeBonus.length > 0) {
    logger.debug(`Generating melee damage for ${name}`);
    changes.push(generateCustomChange(`${meleeBonus.join(" + ")}`, 18, "system.bonuses.mwak.damage"));
  }
  const rangedRestrictions = ["Ranged Weapon Attacks"];
  const rangedBonus = DDBHelper.filterModifiers(modifiers, "damage", null, rangedRestrictions)
    .filter((mod) => mod.dice || mod.die || mod.value)
    .map((mod) => {
      const die = mod.dice ? mod.dice : mod.die ? mod.die : undefined;
      if (die) {
        return utils.parseDiceString(die.diceString, null, mod.subType ? `[${mod.subType}]` : null).diceString;
      } else {
        return utils.parseDiceString(mod.value, null, mod.subType ? `[${mod.subType}]` : null).diceString;
      }
    });
  if (rangedBonus && rangedBonus.length > 0) {
    logger.debug(`Generating ranged damage for ${name}`);
    changes.push(generateCustomChange(`${rangedBonus.join(" + ")}`, 18, "system.bonuses.rwak.damage"));
  }
  const bonus = DDBHelper.filterModifiers(modifiers, "damage", null)
    .filter((mod) => mod.dice || mod.die || mod.value)
    .map((mod) => {
      const die = mod.dice ? mod.dice : mod.die ? mod.die : undefined;
      if (die) {
        return utils.parseDiceString(die.diceString, null, mod.subType ? `[${mod.subType}]` : null).diceString;
      } else {
        return utils.parseDiceString(mod.value, null, mod.subType ? `[${mod.subType}]` : null).diceString;
      }
    });
  if (bonus && bonus.length > 0) {
    logger.debug(`Generating all damage for ${name}`);
    changes.push(generateCustomChange(`${bonus.join(" + ")}`, 18, "system.bonuses.mwak.damage"));
    changes.push(generateCustomChange(`${bonus.join(" + ")}`, 18, "system.bonuses.rwak.damage"));
  }
  return changes;
}

// *
// Get list of generic conditions/damages
//
function getGenericConditionAffect(modifiers, condition, typeId) {
  const damageTypes = DICTIONARY.character.damageAdjustments
    .filter((type) => type.kind === condition && type.type === typeId)
    .map((type) => type.value);

  let restrictions = [
    "",
    null,
    "While within 20 feet",
    "Dwarf Only",
    "While Not Incapacitated",
    // "As an Action", this is a timed/limited effect, dealt with elsewhere
    "While Staff is Held",
    "Helm has at least one ruby remaining",
    "while holding",
    "While Held",
  ];
  let result = DDBHelper
    .filterModifiers(modifiers, condition, null, restrictions)
    .filter((modifier) => modifier.isGranted && damageTypes.includes(modifier.subType))
    .map((modifier) => {
      const entry = DICTIONARY.character.damageAdjustments.find(
        (type) => type.type === typeId && type.kind === modifier.type && type.value === modifier.subType
      );
      return entry ? entry.foundryValue || entry.value : undefined;
    });

  return result;
}


function addCriticalHitImmunities(modifiers, name) {
  const result = DDBHelper.filterModifiers(modifiers, "immunity", "critical-hits");

  if (result.length > 0) {
    logger.debug(`Generating critical hit immunity for ${name}`);
    return [generateCustomChange(1, 1, "flags.midi-qol.fail.critical.all")];
  } else {
    return [];
  }
}

/**
 * Get  Damage Conditions, and Condition Immunities
 * @param {*} ddbItem
 */
function addDamageConditions(modifiers) {
  let charges = [];

  const damageImmunities = getGenericConditionAffect(modifiers, "immunity", 2);
  const damageResistances = getGenericConditionAffect(modifiers, "resistance", 2);
  const damageVulnerability = getGenericConditionAffect(modifiers, "vulnerability", 2);

  damageImmunities.forEach((type) => {
    charges.push(generateCustomChange(type, 1, "system.traits.di.value"));
  });
  damageResistances.forEach((type) => {
    charges.push(generateCustomChange(type, 1, "system.traits.dr.value"));
  });
  damageVulnerability.forEach((type) => {
    charges.push(generateCustomChange(type, 1, "system.traits.dv.value"));
  });

  const conditionImmunities = getGenericConditionAffect(modifiers, "immunity", 1);

  conditionImmunities.forEach((type) => {
    charges.push(generateCustomChange(type, 1, "system.traits.ci.value"));
  });

  // system.traits.di.all
  const allDamageImmunity = DDBHelper.filterModifiers(modifiers, "immunity", "all");
  if (allDamageImmunity?.length > 0) {
    charges.push(generateCustomChange(1, 1, "system.traits.di.all"));
  }

  return charges;
}

// *
// Generate stat bonuses
//
function addStatBonusEffect(modifiers, name, subType) {
  const bonuses = modifiers.filter((modifier) => modifier.type === "bonus" && modifier.subType === subType);

  let effects = [];
  if (bonuses.length > 0) {
    bonuses.forEach((bonus) => {
      const maxMatch = /Maximum of (\d*)/;
      const match = bonus.restriction ? bonus.restriction.match(maxMatch) : false;
      logger.debug(`Generating ${subType} stat bonus for ${name}`);
      const ability = DICTIONARY.character.abilities.find((ability) => ability.long === subType.split("-")[0]);
      const abilityScoreMaxBonus = modifiers
        .filter((modifier) => modifier.type === "bonus" && modifier.subType === "ability-score-maximum")
        .filter((mod) => mod.statId === ability.id)
        .reduce((prev, cur) => prev + cur.value, 0);
      const max = match ? match[1] : 20 + abilityScoreMaxBonus;

      const bonusString = `@abilities.${ability.value}.value + ${bonus.value} > ${max} ? ${max} : @abilities.${ability.value}.value + ${bonus.value}`;
      effects.push(generateOverrideChange(bonusString, 5, `system.abilities.${ability.value}.value`));
    });
  }
  return effects;
}

function addStatBonuses(modifiers, name) {
  let changes = [];
  const stats = [
    "strength-score",
    "dexterity-score",
    "constitution-score",
    "wisdom-score",
    "intelligence-score",
    "charisma-score",
  ];
  stats.forEach((stat) => {
    const result = addStatBonusEffect(modifiers, name, stat);
    changes = changes.concat(result);
  });

  return changes;
}

// *
// Generate stat sets
//
function addStatSetEffect(modifiers, name, subType) {
  const bonuses = modifiers.filter((modifier) => modifier.type === "set" && modifier.subType === subType);

  let effects = [];
  // dwarfen "Maximum of 20"
  if (bonuses.length > 0) {
    bonuses.forEach((bonus) => {
      logger.debug(`Generating ${subType} stat set for ${name}`);
      const ability = DICTIONARY.character.abilities.find((ability) => ability.long === subType.split("-")[0]).value;
      effects.push(generateUpgradeChange(bonus.value, 3, `system.abilities.${ability}.value`));
    });
  }
  return effects;
}

// requires midi
// does not add advantages with restrictions - which is most of them
function addAbilityAdvantageEffect(modifiers, name, subType, type) {
  const bonuses = DDBHelper.filterModifiers(modifiers, "advantage", subType);

  let effects = [];
  if (bonuses.length > 0) {
    logger.debug(`Generating ${subType} saving throw advantage for ${name}`);
    const ability = DICTIONARY.character.abilities.find((ability) => ability.long === subType.split("-")[0]).value;
    effects.push(generateCustomChange(1, 4, `flags.midi-qol.advantage.ability.${type}.${ability}`));
  }
  return effects;
}

function addStatChanges(modifiers, name) {
  let changes = [];
  const stats = ["strength", "dexterity", "constitution", "wisdom", "intelligence", "charisma"];
  stats.forEach((stat) => {
    const ability = DICTIONARY.character.abilities.find((ab) => ab.long === stat);
    const statEffect = addStatSetEffect(modifiers, name, `${stat}-score`);
    const savingThrowAdvantage = addAbilityAdvantageEffect(modifiers, name, `${stat}-saving-throw`, "save");
    const abilityCheckAdvantage = addAbilityAdvantageEffect(modifiers, name, `${stat}-ability-checks`, "check");
    const abilityBonusesSave = addAddEffect(modifiers, name, `${stat}-saving-throws`, `system.abilities.${ability.value}.bonuses.save`);
    const abilityBonusesCheck = addAddEffect(modifiers, name, `${stat}-ability-checks`, `system.abilities.${ability.value}.bonuses.check`);
    changes = changes.concat(statEffect, savingThrowAdvantage, abilityCheckAdvantage, abilityBonusesSave, abilityBonusesCheck);
  });

  return changes;
}

// *
// Senses
//
function addSenseBonus(modifiers, name) {
  let changes = [];

  const senses = ["darkvision", "blindsight", "tremorsense", "truesight"];

  senses.forEach((sense) => {
    const base = modifiers
      .filter((modifier) => modifier.type === "set-base" && modifier.subType === sense)
      .map((mod) => mod.value);
    if (base.length > 0) {
      logger.debug(`Generating ${sense} base for ${name}`);
      changes.push(generateUpgradeChange(Math.max(base), 10, `system.attributes.senses.${sense}`));
    }
    const bonus = modifiers
      .filter((modifier) => modifier.type === "sense" && modifier.subType === sense)
      .reduce((a, b) => a + b.value, 0);
    if (bonus > 0) {
      logger.debug(`Generating ${sense} bonus for ${name}`);
      changes.push(generateAddChange(Math.max(bonus), 15, `system.attributes.senses.${sense}`));
    }
  });
  return changes;
}

/**
 * Proficiency bonus
 */

function addProficiencyBonus(modifiers, name) {
  let changes = [];
  const bonus = DDBHelper.filterModifiers(modifiers, "bonus", "proficiency-bonus").reduce((a, b) => a + b.value, 0);
  if (bonus) {
    logger.debug(`Generating proficiency bonus for ${name}`);
    changes.push(generateAddChange(bonus, 0, "system.attributes.prof"));
  }
  return changes;
}

// *
// Generate set speeds
//
function addSetSpeedEffect(modifiers, name, subType) {
  const bonuses = modifiers.filter((modifier) => modifier.type === "set" && modifier.subType === subType);

  let effects = [];
  // "Equal to Walking Speed"
  if (bonuses.length > 0) {
    bonuses.forEach((bonus) => {
      logger.debug(`Generating ${subType} speed set for ${name}`);
      const innate = subType.split("-").slice(-1)[0];
      const speedType = DICTIONARY.character.speeds.find((s) => s.innate === innate).type;
      // current assumption if no speed provided, set to walking speed
      const speed = bonus.value ? bonus.value : "@attributes.movement.walk";
      effects.push(generateUpgradeChange(speed, 5, `system.attributes.movement.${speedType}`));
    });
  }
  return effects;
}

/**
 * Innate Speeds
 */
function addSetSpeeds(modifiers, name) {
  let changes = [];
  const speedSets = [
    "innate-speed-walking",
    "innate-speed-climbing",
    "innate-speed-swimming",
    "innate-speed-flying",
    "innate-speed-burrowing",
    "speed-walking",
    "speed-climbing",
    "speed-swimming",
    "speed-flying",
    "speed-burrowing",
  ];
  speedSets.forEach((speedSet) => {
    const result = addSetSpeedEffect(modifiers, name, speedSet);
    changes = changes.concat(result);
  });

  return changes;
}

// *
// Generate speed bonus speeds
//
function addBonusSpeedEffect(modifiers, name, subType, speedType = null) {
  const bonuses = modifiers.filter((modifier) => modifier.type === "bonus" && modifier.subType === subType);

  let effects = [];
  // "Equal to Walking Speed"
  // max(10+(ceil(((@classes.monk.levels)-5)/4))*5,10)
  if (bonuses.length > 0) {
    logger.debug(`Generating ${subType} speed bonus for ${name}`);
    if (!speedType) {
      const innate = subType.split("-").slice(-1)[0];
      speedType = DICTIONARY.character.speeds.find((s) => s.innate === innate).type;
    }
    const bonusValue = bonuses.reduce((speed, mod) => speed + mod.value, 0);
    if (speedType === "all") {
      effects.push(generateCustomChange(`+ ${bonusValue}`, 9, `system.attributes.movement.${speedType}`));
    } else {
      effects.push(generateAddChange(bonusValue, 9, `system.attributes.movement.${speedType}`));
    }
  }
  return effects;
}

/**
 * Bonus Speeds
 */
function addBonusSpeeds(modifiers, name) {
  let changes = [];
  const speedBonuses = ["speed-walking", "speed-climbing", "speed-swimming", "speed-flying", "speed-burrowing"];
  speedBonuses.forEach((speed) => {
    const result = addBonusSpeedEffect(modifiers, name, speed);
    changes = changes.concat(result);
  });

  changes = changes.concat(addBonusSpeedEffect(modifiers, name, "unarmored-movement", "walk"));
  changes = changes.concat(addBonusSpeedEffect(modifiers, name, "speed", "walk")); // probably all, but doesn't handle cases of where no base speed set, so say fly gets set to 10.

  return changes;
}

function addSkillProficiencies(modifiers) {
  let changes = [];
  const ddbCharacter = new DDBCharacter();
  DICTIONARY.character.skills.forEach((skill) => {
    const prof = ddbCharacter.getSkillProficiency(skill, modifiers);
    if (prof != 0) {
      changes.push(generateUpgradeChange(prof, 9, `system.skills.${skill.name}.value`));
    }
  });
  return changes;
}

function addProficiencies(modifiers, name) {
  let changes = [];

  const proficiencies = modifiers
    .filter((mod) => mod.type === "proficiency")
    .map((mod) => {
      return { name: mod.friendlySubtypeName };
    });

  const ddbCharacter = new DDBCharacter();

  changes = changes.concat(addSkillProficiencies(modifiers));
  const toolProf = ddbCharacter.getToolProficiencies(proficiencies);
  const weaponProf = ddbCharacter.getWeaponProficiencies(proficiencies);
  const armorProf = ddbCharacter.getArmorProficiencies(proficiencies);

  toolProf.value.forEach((prof) => {
    logger.debug(`Generating tool proficiencies for ${name}`);
    changes.push(generateCustomChange(prof, 8, "system.traits.toolProf.value"));
  });
  weaponProf.value.forEach((prof) => {
    logger.debug(`Generating weapon proficiencies for ${name}`);
    changes.push(generateCustomChange(prof, 8, "system.traits.weaponProf.value"));
  });
  armorProf.value.forEach((prof) => {
    logger.debug(`Generating armor proficiencies for ${name}`);
    changes.push(generateCustomChange(prof, 8, "system.traits.armorProf.value"));
  });
  if (toolProf?.custom != "") changes.push(generateCustomChange(toolProf.custom, 8, "system.traits.toolProf.custom"));
  if (weaponProf?.custom != "")
    changes.push(generateCustomChange(weaponProf.custom, 8, "system.traits.weaponProf.custom"));
  if (armorProf?.custom != "") changes.push(generateCustomChange(armorProf.custom, 8, "system.traits.armorProf.custom"));

  return changes;
}

/**
 * Add HP effects
 * @param {*} modifiers
 * @param {*} name
 */
function addHPEffect(ddb, modifiers, name, consumable) {
  let changes = [];

  // HP per level
  DDBHelper.filterModifiers(modifiers, "bonus", "hit-points-per-level").forEach((bonus) => {
    const cls = DDBHelper.findClassByFeatureId(ddb, bonus.componentId);
    if (cls) {
      logger.debug(`Generating HP Per Level effects for ${name} for class ${cls.definition.name}`);
      changes.push(generateAddChange(`${bonus.value} * @classes.${cls.definition.name.toLowerCase()}.levels`, 14, "system.attributes.hp.max"));
    } else {
      logger.debug(`Generating HP Per Level effects for ${name} for all levels`);
      changes.push(generateAddChange(`${bonus.value} * @details.level`, 14, "system.attributes.hp.max"));
    }
  });

  const hpBonusModifiers = DDBHelper.filterModifiers(modifiers, "bonus", "hit-points");
  if (hpBonusModifiers.length > 0 && !consumable) {
    let hpBonus = "";
    hpBonusModifiers.forEach((modifier) => {
      let hpParse = DDBHelper.extractModifierValue(modifier);
      if (hpBonus !== "") hpBonus += " + ";
      hpBonus += hpParse;
    });
    changes.push(generateCustomChange(`${hpBonus}`, 14, "system.attributes.hp.max"));
  }

  return changes;
}

//
// Generate skill bonuses
//
function addSkillBonusEffect(modifiers, name, skill) {
  const bonus = DDBHelper.getValueFromModifiers(modifiers, name, skill.subType, "bonus");

  let changes = [];
  if (bonus) {
    logger.debug(`Generating ${skill.subType} skill bonus for ${name}`, bonus);
    changes.push(generateAddChange(bonus, 12, `system.skills.${skill.name}.bonuses.check`));
  }
  return changes;
}

//
// generate skill advantages
// requires midi
//
function addSkillMidiEffect(modifiers, name, skill, midiEffect = "advantage") {
  const allowedRestrictions = [
    "",
    null,
    "Sound Only",
    "Sight Only",
    "that rely on smell",
    "While the hood is up, checks made to Hide ",
  ];
  const advantage = DDBHelper.filterModifiers(modifiers, midiEffect, skill.subType, allowedRestrictions);

  let effects = [];
  if (advantage.length > 0) {
    logger.debug(`Generating ${skill.subType} skill ${midiEffect} for ${name}`);
    effects.push(generateCustomChange(1, 5, `flags.midi-qol.${midiEffect}.skill.${skill.name}`));
    // handled by midi already
    // advantage/disadvantage on skill grants +/-5 passive bonus, https://www.dndbeyond.com/sources/phb/using-ability-scores#PassiveChecks
    // if (midiEffect === "advantage") {
    //   effects.push(generateAddChange(5, 5, `system.skills.${skill.name}.bonuses.passive`));
    // } else if (midiEffect === "disadvantage") {
    //   effects.push(generateAddChange(-5, 5, `system.skills.${skill.name}.bonuses.passive`));
    // }
  }
  return effects;
}

function addSkillPassiveBonusEffect(modifiers, name, skill) {
  const bonus = DDBHelper.getValueFromModifiers(modifiers, name, `passive-${skill.subType}`, "bonus");

  let changes = [];
  if (bonus) {
    logger.debug(`Generating ${skill.subType} skill bonus for ${name}`, bonus);
    changes.push(generateAddChange(bonus, 12, `system.skills.${skill.name}.bonuses.passive`));
  }
  return changes;
}

function addSkillBonuses(modifiers, name) {
  let changes = [];
  DICTIONARY.character.skills.forEach((skill) => {
    const newMods = modifiers.filter((mod) => {
      if (mod.subType === `passive-${skill.subType}`) {
        const passiveMods = DDBHelper.filterModifiers(modifiers, "bonus", `passive-${skill.subType}`);
        const advantageMods = DDBHelper.filterModifiers(modifiers, "advantage", skill.subType);
        if (passiveMods.length > 0 && advantageMods.length > 0) return false;
        else return true;
      } else {
        return true;
      }
    });
    const skillBonuses = addSkillBonusEffect(newMods, name, skill);
    const skillPassiveBonuses = addSkillPassiveBonusEffect(newMods, name, skill);
    const skillAdvantages = addSkillMidiEffect(newMods, name, skill, "advantage");
    changes = changes.concat(skillBonuses, skillPassiveBonuses, skillAdvantages);
  });


  return changes;
}

//
// initiative
//
function addInitiativeBonuses(modifiers, name) {
  let changes = [];
  const advantage = DDBHelper.filterModifiers(modifiers, "advantage", "initiative");
  if (advantage.length > 0) {
    logger.debug(`Generating Initiative advantage for ${name}`);
    changes.push(generateCustomChange(1, 20, "flags.dnd5e.initiativeAdv"));
  }

  const advantageBonus = DDBHelper.getValueFromModifiers(modifiers, "initiative", "initiative", "bonus");
  if (advantageBonus) {
    logger.debug(`Generating Initiative bonus for ${name}`);
    changes.push(generateAddChange(advantageBonus, 20, "system.attributes.init.bonus"));
  }

  return changes;
}

//
// attack rolls against you
// midi only
//
function addAttackRollDisadvantage(modifiers, name) {
  let changes = [];
  const disadvantage = DDBHelper.filterModifiers(modifiers, "disadvantage", "attack-rolls-against-you", false);
  if (disadvantage.length > 0) {
    logger.debug(`Generating disadvantage for ${name}`);
    changes.push(generateCustomChange(1, 5, "flags.midi-qol.grants.disadvantage.attack.all"));
  }
  return changes;
}

// midi advantages on saving throws against spells and magical effects
function addMagicalAdvantage(modifiers, name) {
  let changes = [];
  const restrictions = [
    "against spells and magical effects",
    "Against Spells and Magical Effects",
    "Against Spells",
    "against spells",
    "Against spells",
    "Against spells and magical effects within 10 ft. (or 30 ft. at level 17+) while holding the Holy Avenger",
  ];
  const advantage = DDBHelper.filterModifiers(modifiers, "advantage", "saving-throws", restrictions);
  if (advantage.length > 0) {
    logger.debug(`Generating magical advantage on saving throws for ${name}`);
    changes.push(generateCustomChange("magic-resistant", 5, "system.traits.dr.custom"));
  }
  return changes;
}

function generateEffectDuration(foundryItem) {
  let duration = {
    seconds: null,
    startTime: null,
    rounds: null,
    turns: null,
    startRound: null,
    startTurn: null,
  };
  switch (foundryItem.system.duration.units) {
    case "turn":
      duration.turns = foundryItem.system.duration.value;
      break;
    case "round":
      duration.rounds = foundryItem.system.duration.value;
      break;
    case "hour":
      duration.seconds = foundryItem.system.duration.value * 60 * 60;
      break;
    case "minute":
      duration.rounds = foundryItem.system.duration.value * 10;
      break;
    // no default
  }
  return duration;
}

function consumableEffect(effect, ddbItem, foundryItem) {
  let label = `${foundryItem.name} - Consumable Effects`;
  if (isNewerVersion(game.version, 11)) {
    effect.name = label;
  } else {
    effect.label = label;
  }
  effect.disabled = false;
  effect.transfer = false;
  setProperty(effect, "flags.ddbimporter.disabled", false);
  setProperty(effect, "flags.dae.transfer", false);
  effect.duration = generateEffectDuration(foundryItem);
  if (!foundryItem.system.target?.value) {
    foundryItem.system.target = {
      value: 1,
      width: null,
      units: "",
      type: "creature",
    };
  }
  if (!foundryItem.system.range?.units) {
    foundryItem.system.range = {
      value: null,
      long: null,
      units: "touch",
    };
  }
  if (foundryItem.system.uses) {
    foundryItem.system.uses.autoDestroy = true;
    foundryItem.system.uses.autoUse = true;
  }

  return effect;
}

/**
 * This checks attunement status and similar to determine effect state
 * set disabled flags etc
 * @param {*} foundryItem
 * @param {*} effect
 * @param {*} ddbItem
 * @param {*} isCompendiumItem
 */
function addEffectFlags(foundryItem, effect, ddbItem, isCompendiumItem) {
  // check attunement status etc

  if (
    !ddbItem.definition?.canEquip
    && !ddbItem.definition?.canAttune
    && !ddbItem.definition?.isConsumable
    && DICTIONARY.types.inventory.includes(foundryItem.type)
  ) {
    // if item just gives a thing and not potion/scroll
    effect.disabled = false;
    setProperty(effect, "flags.ddbimporter.disabled", false);
    setProperty(foundryItem, "flags.dae.alwaysActive", true);
  } else if (
    isCompendiumItem
    || foundryItem.type === "feat"
    || (ddbItem.isAttuned && ddbItem.equipped) // if it is attuned and equipped
    || (ddbItem.isAttuned && !ddbItem.definition?.canEquip) // if it is attuned but can't equip
    || (!ddbItem.definition?.canAttune && ddbItem.equipped) // can't attune but is equipped
  ) {
    setProperty(foundryItem, "flags.dae.alwaysActive", false);
    setProperty(effect, "flags.ddbimporter.disabled", false);
    effect.disabled = false;
  } else {
    effect.disabled = true;
    setProperty(effect, "flags.ddbimporter.disabled", true);
    setProperty(foundryItem, "flags.dae.alwaysActive", false);
  }

  setProperty(effect, "flags.ddbimporter.itemId", ddbItem.id);
  setProperty(effect, "flags.ddbimporter.itemEntityTypeId", ddbItem.entityTypeId);
  // set dae flag for active equipped
  if (ddbItem.definition?.canEquip || ddbItem.definitio?.canAttune) {
    setProperty(foundryItem, "flags.dae.activeEquipped", true);
  } else {
    setProperty(foundryItem, "flags.dae.activeEquipped", false);
  }

  if (ddbItem.definition?.filterType === "Potion") {
    effect = consumableEffect(effect, ddbItem, foundryItem);
  }

  return [foundryItem, effect];
}

/**
 * Generate supported effects for items
 * @param {*} ddb
 * @param {*} character
 * @param {*} ddbItem
 * @param {*} foundryItem
 */
function generateGenericEffects(ddb, character, ddbItem, foundryItem, isCompendiumItem, labelOverride) {
  if (!foundryItem.effects) foundryItem.effects = [];

  const label = labelOverride
    ? labelOverride
    : `${foundryItem.name} - Constant Effects`;

  let effect = baseItemEffect(foundryItem, label);

  if (!ddbItem.definition?.grantedModifiers || ddbItem.definition.grantedModifiers.length === 0) return [foundryItem, effect];
  logger.debug(`Generating Effects for ${foundryItem.name}`, ddbItem);

  const globalSaveBonus = addGlobalSavingBonusEffect(ddbItem.definition.grantedModifiers, foundryItem.name);
  const globalAbilityBonus = addCustomBonusEffect(
    ddbItem.definition.grantedModifiers,
    foundryItem.name,
    "ability-checks",
    "system.bonuses.abilities.check",
  );
  const globalSkillBonus = addCustomBonusEffect(
    ddbItem.definition.grantedModifiers,
    foundryItem.name,
    "skill-checks",
    "system.bonuses.abilities.skill",
  );
  const languages = addLanguages(ddbItem.definition.grantedModifiers, foundryItem.name);
  const conditions = addDamageConditions(ddbItem.definition.grantedModifiers, foundryItem.name);
  const criticalHitImmunity = addCriticalHitImmunities(ddbItem.definition.grantedModifiers, foundryItem.name);
  const statSets = addStatChanges(ddbItem.definition.grantedModifiers, foundryItem.name);
  const statBonuses = addStatBonuses(ddbItem.definition.grantedModifiers, foundryItem.name);
  const senses = addSenseBonus(ddbItem.definition.grantedModifiers, foundryItem.name);
  const proficiencyBonus = addProficiencyBonus(ddbItem.definition.grantedModifiers, foundryItem.name);
  const speedSets = addSetSpeeds(ddbItem.definition.grantedModifiers, foundryItem.name);
  const spellAttackBonus = addCustomEffect(
    ddbItem.definition.grantedModifiers,
    foundryItem.name,
    "spell-attacks",
    "system.bonuses.spell.attack"
  );
  const spellDCBonus = addAddEffect(
    ddbItem.definition.grantedModifiers,
    foundryItem.name,
    "spell-save-dc",
    "system.bonuses.spell.dc"
  );
  const warlockSpellAttackBonus = addCustomEffect(
    ddbItem.definition.grantedModifiers,
    foundryItem.name,
    "warlock-spell-attacks",
    "system.bonuses.spell.attack"
  );
  const warlockSpellDCBonus = addAddEffect(
    ddbItem.definition.grantedModifiers,
    foundryItem.name,
    "warlock-spell-save-dc",
    "system.bonuses.spell.dc"
  );
  const healingSpellBonus = addCustomEffect(
    ddbItem.definition.grantedModifiers,
    foundryItem.name,
    "spell-group-healing",
    "system.bonuses.heal.damage",
    " + @item.level"
  );

  const profs = addProficiencies(ddbItem.definition.grantedModifiers, foundryItem.name);
  const hp = addHPEffect(ddb, ddbItem.definition.grantedModifiers, foundryItem.name, ddbItem.definition.isConsumable);
  const skillBonus = addSkillBonuses(ddbItem.definition.grantedModifiers, foundryItem.name);
  const initiative = addInitiativeBonuses(ddbItem.definition.grantedModifiers, foundryItem.name);
  const disadvantageAgainst = addAttackRollDisadvantage(ddbItem.definition.grantedModifiers, foundryItem.name);
  const magicalAdvantage = addMagicalAdvantage(ddbItem.definition.grantedModifiers, foundryItem.name);
  const bonusSpeeds = addBonusSpeeds(ddbItem.definition.grantedModifiers, foundryItem.name);

  const meleeAttackBonus = addCustomEffect(
    ddbItem.definition.grantedModifiers,
    foundryItem.name,
    "melee-attacks",
    "system.bonuses.mwak.attack"
  );
  const rangedAttackBonus = addCustomEffect(
    ddbItem.definition.grantedModifiers,
    foundryItem.name,
    "ranged-attacks",
    "system.bonuses.rwak.attack"
  );
  const meleeWeaponAttackBonus = addCustomEffect(
    ddbItem.definition.grantedModifiers,
    foundryItem.name,
    "melee-weapon-attacks",
    "system.bonuses.mwak.attack"
  );
  const rangedWeaponAttackBonus = addCustomEffect(
    ddbItem.definition.grantedModifiers,
    foundryItem.name,
    "ranged-weapon-attacks",
    "system.bonuses.rwak.attack"
  );
  const weaponAttackMeleeBonus = addCustomEffect(
    ddbItem.definition.grantedModifiers,
    foundryItem.name,
    "weapon-attacks",
    "system.bonuses.mwak.attack"
  );
  const weaponAttackRangedBonus = addCustomEffect(
    ddbItem.definition.grantedModifiers,
    foundryItem.name,
    "weapon-attacks",
    "system.bonuses.rwak.attack"
  );

  const globalDamageBonus = addGlobalDamageBonus(ddbItem.definition.grantedModifiers, foundryItem.name);

  effect.changes = [
    ...criticalHitImmunity,
    ...globalSaveBonus,
    ...globalAbilityBonus,
    ...globalSkillBonus,
    ...languages,
    ...conditions,
    ...statSets,
    ...statBonuses,
    ...senses,
    ...proficiencyBonus,
    ...speedSets,
    ...spellAttackBonus,
    ...warlockSpellAttackBonus,
    ...spellDCBonus,
    ...warlockSpellDCBonus,
    ...profs,
    ...hp,
    ...skillBonus,
    ...initiative,
    ...disadvantageAgainst,
    ...magicalAdvantage,
    ...bonusSpeeds,
    ...healingSpellBonus,
    ...meleeAttackBonus,
    ...rangedAttackBonus,
    ...meleeWeaponAttackBonus,
    ...rangedWeaponAttackBonus,
    ...weaponAttackMeleeBonus,
    ...weaponAttackRangedBonus,
    ...globalDamageBonus,
  ];

  // if we don't have effects, lets return the item
  if (effect.changes?.length === 0) {
    return [foundryItem, effect];
  }

  // generate flags for effect (e.g. checking attunement and equipped status)
  [foundryItem, effect] = addEffectFlags(foundryItem, effect, ddbItem, isCompendiumItem);

  return [foundryItem, effect];
}

export function generateEffects(ddb, character, ddbItem, foundryItem, isCompendiumItem, type) {
  let label;

  if (type === "item" && hasProperty(ddbItem, "definition.grantedModifiers")) {
    ddbItem.definition.grantedModifiers = ddbItem.definition.grantedModifiers.filter((modifier) =>
      modifier.type !== "damage" && modifier.subType !== null
    );
  }

  if (type == "infusion") {
    label = `${foundryItem.name} - Infusion Effects`;
  }
  let effect;
  [foundryItem, effect] = generateGenericEffects(ddb, character, ddbItem, foundryItem, isCompendiumItem, label);
  if (type == "infusion") {
    [foundryItem, effect] = generateACEffectChangesForItem(ddb, character, ddbItem, foundryItem, isCompendiumItem, effect);
  }
  if (effect.changes?.length > 0) {
    foundryItem.effects.push(effect);
  }
  switch (type) {
    case "infusion": {
      foundryItem = infusionEffectAdjustment(foundryItem);
      break;
    }
    case "equipment":
    case "item": {
      foundryItem = equipmentEffectAdjustment(foundryItem);
      break;
    }
    // spells and feats get called from respective parsers for async loading
    // no default
  }

  if (foundryItem.effects?.length > 0 || hasProperty(foundryItem.flags, "itemacro")) {
    logger.debug(`${type} effect ${foundryItem.name}:`, duplicate(foundryItem));
    setProperty(foundryItem, "flags.ddbimporter.effectsApplied", true);
  }
  return foundryItem;

}
