// Recipe page: shows one recipe from recipe.html?id=...

const $ = (id) => document.getElementById(id);
const id = Number(new URLSearchParams(location.search).get("id")) || 716429; // default recipe

async function load() {
  try {
    const r = await API.recipe(id);
    showError($("api-banner"), "");
    show(r);
  } catch (err) {
    showError($("api-banner"), err.message, load);
  }
}

function show(r) {
  document.title = `${r.title} | What's Cooking?`;
  $("r-photo").insertAdjacentHTML("afterbegin", `<img src="${escapeHTML(r.image)}" alt="${escapeHTML(r.title)}" />`);
  $("r-cat").textContent = label(r.category);
  $("r-cat").hidden = !r.category;
  $("r-title").textContent = r.title;
  $("r-rating").textContent = `${r.likes} likes · Health score ${r.healthScore}/100`;
  $("r-desc").textContent = r.description;
  $("r-time").textContent = `${r.time} min`;
  $("r-servings").textContent = r.servings;
  $("r-diets").innerHTML = r.diets.map((d) => `<li>${label(d)}</li>`).join("") || "<li>None listed</li>";
  $("r-ingredients").innerHTML = r.ingredients
    .map((text) => `<li><label><input type="checkbox" /> <span>${escapeHTML(text)}</span></label></li>`)
    .join("");
  $("r-steps").innerHTML = r.steps.map((text) => `<li>${escapeHTML(text)}</li>`).join("");
  if (r.sourceUrl) {
    $("r-source").innerHTML = `Original recipe: <a href="${escapeHTML(r.sourceUrl)}" target="_blank" rel="noopener">${escapeHTML(r.sourceName || "source")}</a>`;
  }
  $("rp-grid").hidden = false;
}

// Save and share
function paintSave(on) {
  $("save-btn").setAttribute("aria-pressed", on);
  $("save-btn").querySelector("span").textContent = on ? "Saved" : "Save Recipe";
}
paintSave(saved.has(id));
$("save-btn").addEventListener("click", () => paintSave(saved.toggle(id)));

// Clipboard only works on https pages, so show the link otherwise
$("share-btn").addEventListener("click", () => {
  if (!navigator.clipboard) return prompt("Copy this link:", location.href);
  navigator.clipboard.writeText(location.href).then(() => ($("share-btn").textContent = "Link copied"));
});

load();