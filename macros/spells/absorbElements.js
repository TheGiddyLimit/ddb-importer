const itemName = args[0].itemData.name;
const targetActor = args[0].tokenUuid
  ? (await fromUuid(args[0].tokenUuid)).actor
  : game.actors.get(args[0].actorId);

async function updateEffects(html) {
  const element = html.find("#element").val();
  const effect = targetActor.effects.find((i) => (i.name ?? i.label) === `${itemName} - Extra Damage`);
  const changes = duplicate(effect.changes);
  changes[0].value += `[${element}]`;
  changes[1].value += `[${element}]`;
  await effect.update({ changes });
  const resistanceEffect = targetActor.effects.find((i) => (i.name ?? i.label) === `${itemName} - Resistance`);
  const resistanceChanges = duplicate(resistanceEffect.changes);
  resistanceChanges[0].value = element;
  await resistanceEffect.update({ resistanceChanges });
}

async function promptForChoice() {
  new Dialog({
    title: "Choose a damage type",
    content: `
      <form class="flexcol">
        <div class="form-group">
          <select id="element">
            <option value="acid">Acid</option>
            <option value="cold">Cold</option>
            <option value="fire">Fire</option>
            <option value="lightning">Lightning</option>
            <option value="thunder">Thunder</option>
          </select>
        </div>
      </form>
    `,
    // select element type
    buttons: {
      yes: {
        icon: '<i class="fas fa-bolt"></i>',
        label: "Select",
        callback: updateEffects,
      },
    },
  }).render(true);
}

await promptForChoice();
