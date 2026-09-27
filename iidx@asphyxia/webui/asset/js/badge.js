// Badge tab: the 5 slots filled from the badges the player has (iidxGetBadgeEquip), each shown as
// the game draws it when the badge parts are imported (Customize Images): the textures are laid
// over each other at the positions the server gives ([texture, left, top, scale] in 180x180).
(async () => {
  const IMAGES = "static/asset/customize/33/badge_";
  const form = document.getElementById("badge-form");
  const status = document.getElementById("badge-status");

  const css = document.createElement("style");
  css.textContent = `
    .bd-slot { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
    .bd-art { position: relative; overflow: hidden; flex: none; }
    .bd-art .bd-inner { position: absolute; left: 0; top: 0; width: 180px; height: 180px; transform-origin: 0 0; }
    .bd-art img { position: absolute; max-width: none; height: auto; transform-origin: 0 0; }
    .bd-panel { margin-top: .5rem; padding: .5rem; border: 1px solid rgba(128,128,128,.4); border-radius: 4px; }
    .bd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 6px;
      max-height: 32rem; overflow-y: auto; margin-top: .5rem; }
    .bd-item { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 3px; cursor: pointer;
      border: 2px solid transparent; border-radius: 4px; background: none; color: inherit; font-size: .72rem;
      line-height: 1.2; text-align: center; }
    .bd-item:hover { border-color: rgba(128,128,128,.5); }
    .bd-item.is-chosen { border-color: #00d1b2; }
    .bd-item[hidden] { display: none; }`;
  document.head.appendChild(css);

  /** A badge's picture, size px square. */
  function art(layers, size) {
    const box = document.createElement("div");
    box.className = "bd-art";
    box.style.width = box.style.height = size + "px";
    const inner = document.createElement("div");
    inner.className = "bd-inner";
    inner.style.transform = `scale(${size / 180})`;
    for (const [texture, x, y, scale] of layers) {
      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = IMAGES + texture + ".png";
      img.alt = "";
      img.style.left = x + "px";
      img.style.top = y + "px";
      if (scale) img.style.transform = `scale(${scale})`;
      img.onerror = () => img.remove();
      inner.append(img);
    }
    box.append(inner);
    return box;
  }

  try {
    const res = await fetch("/emit/iidxGetBadgeEquip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refid: form.elements.refid.value }),
    });
    if (!res.ok) throw new Error(res.status + " " + (await res.text()));
    const { badges, slots, pictures } = await res.json();
    const byKey = new Map(badges.map((b) => [b.key, b]));

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
      if (!pictures) continue;

      // the chosen badge's picture, and a grid of all of them to choose from
      const row = select.closest(".bd-slot");
      const preview = document.createElement("div");
      row.prepend(preview);
      const show = () => preview.replaceChildren(byKey.has(select.value) ? art(byKey.get(select.value).art, 72) : art([], 72));
      select.addEventListener("change", show);
      show();

      const button = document.createElement("button");
      button.type = "button";
      button.className = "button is-small";
      button.textContent = "Choose...";
      row.append(button);
      const panel = document.createElement("div");
      panel.className = "bd-panel";
      panel.hidden = true;
      row.after(panel);
      button.addEventListener("click", () => {
        if (!panel.firstChild) {
          const filter = document.createElement("input");
          filter.className = "input is-small";
          filter.placeholder = "Filter by name";
          const grid = document.createElement("div");
          grid.className = "bd-grid";
          for (const b of badges) {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "bd-item";
            item.dataset.key = b.key;
            item.dataset.search = (b.group + " " + b.name).toLowerCase();
            item.title = b.group + " / " + b.name;
            const caption = document.createElement("span");
            caption.textContent = b.name;
            item.append(art(b.art, 96), caption);
            item.addEventListener("click", () => {
              select.value = b.key;
              select.dispatchEvent(new Event("change"));
              panel.hidden = true;
            });
            grid.append(item);
          }
          filter.addEventListener("input", () => {
            const q = filter.value.trim().toLowerCase();
            for (const item of grid.children) item.hidden = q !== "" && !item.dataset.search.includes(q);
          });
          panel.append(filter, grid);
        }
        for (const item of panel.querySelectorAll(".bd-item")) item.classList.toggle("is-chosen", item.dataset.key === select.value);
        panel.hidden = !panel.hidden;
      });
    }

    status.textContent = !badges.length
      ? "No Sparkle Shower badges yet: play a credit first."
      : `${badges.length} badges. A badge can be in one slot only.` +
        (pictures ? "" : " Pictures of the badges can be imported on the Customize Images page.");
  } catch (e) {
    status.textContent = "Could not load the badges: " + e.message;
    status.classList.add("is-danger");
  }
})();
