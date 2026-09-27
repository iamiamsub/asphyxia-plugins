// Badges tab: fills the 5 slots with the badges the player has (iidxGetBadgeEquip), grouped by kind.
(async () => {
  const form = document.getElementById("badge-form");
  const status = document.getElementById("badge-status");
  try {
    const res = await fetch("/emit/iidxGetBadgeEquip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refid: form.elements.refid.value }),
    });
    if (!res.ok) throw new Error(res.status + " " + (await res.text()));
    const { badges, slots } = await res.json();

    const groups = new Map();
    for (const b of badges) {
      if (!groups.has(b.group)) groups.set(b.group, []);
      groups.get(b.group).push(b);
    }
    for (const select of form.querySelectorAll("select[data-slot]")) {
      for (const [group, list] of groups) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = group;
        for (const b of list) optgroup.append(new Option(b.name, b.key));
        select.append(optgroup);
      }
      select.value = slots[select.dataset.slot] || "";
    }
    status.textContent = badges.length
      ? `${badges.length} badges. A badge can be in one slot only.`
      : "No Sparkle Shower badges yet: play a credit first.";
  } catch (e) {
    status.textContent = "Could not load the badges: " + e.message;
    status.classList.add("is-danger");
  }
})();
