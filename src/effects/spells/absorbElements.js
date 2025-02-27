import { loadMacroFile, generateItemMacroFlag } from "../macros.js";
import { baseSpellEffect } from "../specialSpells.js";

export async function absorbElementsEffect(document) {
  const itemMacroText = await loadMacroFile("spell", "absorbElements.js");
  document.flags["itemacro"] = generateItemMacroFlag(document, itemMacroText);
  setProperty(document, "flags.midi-qol.onUseMacroName", "[postActiveEffects]ItemMacro");

  const effect = baseSpellEffect(document, `${document.name} - Extra Damage`);
  effect.changes.push(
    {
      key: "system.bonuses.mwak.damage",
      value: `(@item.level)d6`,
      mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
      priority: 20,
    },
    {
      key: "system.bonuses.msak.damage",
      value: `(@item.level)d6`,
      mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
      priority: 20,
    },
  );

  effect.flags.dae.specialDuration = ["DamageDealt"];
  effect.duration.rounds = 2;
  effect.duration.startTurn = 1;

  document.effects.push(effect);

  const resistanceEffect = baseSpellEffect(document, `${document.name} - Resistance`);
  resistanceEffect.changes.push(
    {
      key: "system.traits.dr.value",
      value: "fire",
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      priority: 20,
    },
  );
  resistanceEffect.duration.rounds = 2;
  document.effects.push(resistanceEffect);


  document.system.damage = {
    parts: [],
    versatile: "",
    value: "",
  };
  document.system.target = {
    value: null,
    width: null,
    units: "",
    type: "self",
  };
  document.system.range = {
    value: null,
    long: null,
    units: "self",
  };
  setProperty(document, "system.actionType", "util");
  setProperty(document, "system.activation.type", "reactiondamage");

  return document;
}


