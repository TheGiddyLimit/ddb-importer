const lastArg = args[args.length - 1];

// macro vars
const sequencerFile = "jb2a.particles.outward.greenyellow.01.05";
const sequencerScale = 1.5;
const damageType = "fire";

// sequencer caller for effects on target
function sequencerEffect(target, file, scale) {
  if (game.modules.get("sequencer")?.active && hasProperty(Sequencer.Database.entries, "jb2a")) {
    new Sequence().effect().file(file).atLocation(target).scaleToObject(scale).play();
  }
}

async function findTargets(originToken, range, includeOrigin = false, excludeActorIds = []) {
  const aoeTargets = await canvas.tokens.placeables.filter((placeable) =>
    (includeOrigin || placeable.id !== originToken.id) &&
    !excludeActorIds.includes(placeable.actor?.id) &&
    placeable.actor?.data.data.attributes.hp.value !== 0 &&
    canvas.grid.measureDistance(originToken, placeable) <= (range + 4.5) &&
    !canvas.walls.checkCollision(new Ray(originToken.center, placeable.center)
  ));
  return aoeTargets;
}

function weaponAttack(caster, sourceItemData, origin, target) {
  const chosenWeapon = DAE.getFlag(caster, "greenFlameBladeChoice");
  const filteredWeapons = caster.items.filter((i) => i.data.type === "weapon" && i.data.data.equipped);
  const weaponContent = filteredWeapons
    .map((w) => {
      const selected = chosenWeapon && chosenWeapon == w.id ? " selected" : "";
      return `<option value="${w.id}"${selected}>${w.name}</option>`;
    })
    .join("");

  const content = `<div class="form-group"><label>Weapons : </label><select name="weapons"}>${weaponContent}</select></div>`;
  new Dialog({
    title: "Green Flame Blade: Choose a weapon to attack with",
    content,
    buttons: {
      Ok: {
        label: "Ok",
        callback: async (html) => {
          const characterLevel = caster.data.type === "character" ? caster.data.data.details.level : caster.data.data.details.cr;
          const cantripDice = 1 + Math.floor((characterLevel + 1) / 6);
          const itemId = html.find("[name=weapons]")[0].value;
          const weaponItem = caster.getEmbeddedDocument("Item", itemId);
          DAE.setFlag(caster, "greenFlameBladeChoice", itemId);
          const weaponCopy = duplicate(weaponItem);
          delete weaponCopy._id;
          if (cantripDice > 0) {
            weaponCopy.data.damage.parts[0][0] += ` + ${cantripDice - 1}d8[${damageType}]`;
          }
          weaponCopy.name = weaponItem.name + " [Green Flame Blade]";
          weaponCopy.effects.push({
            changes: [{ key: "macro.itemMacro", mode: 0, value: "", priority: "20", }],
            disabled: false,
            duration: { seconds: 0 },
            icon: sourceItemData.img,
            label: sourceItemData.name,
            origin,
            transfer: false,
            flags: { targetUuid: target.uuid, casterId: caster.id, origin, cantripDice, damageType, dae: { transfer: false }},
          });
          setProperty(weaponCopy, "flags.itemacro", duplicate(sourceItemData.flags.itemacro));
          setProperty(weaponCopy, "flags.midi-qol.effectActivation", false);
          const attackItem = new CONFIG.Item.documentClass(weaponCopy, { parent: caster });
          const options = { showFullCard: false, createWorkflow: true, configureDialog: true };
          await MidiQOL.completeItemRoll(attackItem, options);
        },
      },
      Cancel: {
        label: "Cancel",
      },
    },
  }).render(true);
}

async function attackNearby(originToken, ignoreIds) {
  const potentialTargets = await findTargets(originToken, 5, false, ignoreIds);
  const sourceItem = await fromUuid(lastArg.efData.flags.origin);
  const caster = sourceItem.parent;
  const casterToken = canvas.tokens.placeables.find((t) => t.actor.uuid === caster.uuid);
  const targetContent = potentialTargets.map((t) => `<option value="${t.id}">${t.name}</option>`).join("");
  const content = `<div class="form-group"><label>Targets : </label><select name="secondaryTargetId"}>${targetContent}</select></div>`;

  new Dialog({
    title: "Green Flame Blade: Choose a secondary target to attack",
    content,
    buttons: {
      Choose: {
        label: "Choose",
        callback: async (html) => {
          const selectedId = html.find("[name=secondaryTargetId]")[0].value;
          const targetToken = canvas.tokens.get(selectedId);
          const sourceItem = await fromUuid(lastArg.efData.flags.origin);
          const mod = caster.data.data.abilities[sourceItem.abilityMod].mod;
          const damageRoll = await new Roll(`${lastArg.efData.flags.cantripDice - 1}d8[${damageType}] + ${mod}`).evaluate({ async: true });
          if (game.dice3d) game.dice3d.showForRoll(damageRoll);
          const workflowItemData = duplicate(sourceItem.data);
          workflowItemData.data.target = { value: 1, units: "", type: "creature" };
          workflowItemData.name = "Green Flame Blade: Secondary Damage";

          await new MidiQOL.DamageOnlyWorkflow(
            caster,
            casterToken.data,
            damageRoll.total,
            damageType,
            [targetToken],
            damageRoll,
            {
              flavor: `(${CONFIG.DND5E.damageTypes[damageType]})`,
              itemCardId: "new",
              itemData: workflowItemData,
              isCritical: false,
            }
          );
          sequencerEffect(targetToken, sequencerFile, sequencerScale);
        },
      },
      Cancel: {
        label: "Cancel",
      },
    },
  }).render(true);
}

if (args[0].tag === "OnUse"){
  if (lastArg.targets.length > 0) {
    const caster = await fromUuid(lastArg.actorUuid);
    weaponAttack(caster, lastArg.itemData, lastArg.uuid, lastArg.targets[0]);
  } else {
    ui.notifications.error("Green Flame Blade: No target selected: please select a target and try again.");
  }
} else if (args[0] === "on") {
  const targetToken = canvas.tokens.get(lastArg.tokenId);
  const casterId = lastArg.efData.flags.casterId;
  await attackNearby(targetToken, [casterId]);
}