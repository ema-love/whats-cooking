// Discover page: search, filter and sort recipes

const $ = (id) => document.getElementById(id);
const toList = (text) => text.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

const state = { query: "", include: [], exclude: [], category: "", diets: new Set(), sort: "popularity" };
let shown = 0;

// Start from the link (e.g. coming from the Home page search)
const params = new URLSearchParams(location.search);
const q = (params.get("q") || "").toLowerCase();
if (q.includes(",")) state.include = toList(q); // a comma list means ingredients
else state.query = q;
toList(params.get("diet") || "").forEach((d) => state.diets.add(d));
$("q-name").value = state.query;
$("q-ing").value = state.include.join(", ");

async function load(more = false) {
  if (!more) {
    shown = 0;
    $("grid").innerHTML = "";
    $("results-count").textContent = "Searching...";
  }
  try {
    const { results, total } = await API.search({ ...state, diets: [...state.diets], offset: shown });
    shown += results.length;
    showError($("api-banner"), "");
    $("grid").insertAdjacentHTML("beforeend", results.map(recipeCard).join(""));
    $("results-count").textContent = `${total} recipes found`;
    $("empty").hidden = total > 0;
    $("load-more").hidden = shown >= total;
  } catch (err) {
    $("results-count").textContent = "";
    $("load-more").hidden = true;
    showError($("api-banner"), err.message, () => load(more));
  }
}

// Draw buttons and tags to match the current filters
function render() {
  document.querySelectorAll(".cat").forEach((b) => b.classList.toggle("is-active", b.dataset.cat === (state.category || "all")));
  document.querySelectorAll(".pill").forEach((p) => p.setAttribute("aria-pressed", state.diets.has(p.dataset.diet)));
  $("avoid-tags").innerHTML = state.exclude
    .map((w) => `<li class="tag-x">${escapeHTML(w)} <button type="button" data-word="${escapeHTML(w)}" aria-label="Remove ${escapeHTML(w)}">×</button></li>`)
    .join("");
  $("sort").value = state.sort;
}

function update() {
  render();
  load();
}

// Search boxes
$("d-search").addEventListener("submit", (e) => {
  e.preventDefault();
  state.query = $("q-name").value.trim();
  state.include = toList($("q-ing").value);
  update();
});

// Meal types
document.querySelectorAll(".cat").forEach((b) =>
  b.addEventListener("click", () => {
    state.category = b.dataset.cat === "all" ? "" : b.dataset.cat;
    update();
  }));

// Diets and allergies
document.querySelectorAll(".pill").forEach((p) =>
  p.addEventListener("click", () => {
    state.diets.has(p.dataset.diet) ? state.diets.delete(p.dataset.diet) : state.diets.add(p.dataset.diet);
    update();
  }));

// Ingredients to avoid
$("avoid-form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.exclude = [...new Set([...state.exclude, ...toList($("avoid-input").value)])];
  $("avoid-input").value = "";
  update();
});

$("avoid-tags").addEventListener("click", (e) => {
  if (!e.target.dataset.word) return;
  state.exclude = state.exclude.filter((w) => w !== e.target.dataset.word);
  update();
});

// Sort, load more, clear
$("sort").addEventListener("change", (e) => {
  state.sort = e.target.value;
  load();
});

$("load-more").addEventListener("click", () => load(true));

$("clear-all").addEventListener("click", () => {
  Object.assign(state, { query: "", include: [], exclude: [], category: "", sort: "popularity" });
  state.diets.clear();
  $("q-name").value = $("q-ing").value = "";
  update();
});

bindHearts($("grid"));
update();