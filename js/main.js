// Home page

const filters = new Set();
const dietToggle = document.getElementById("diet-toggle");

// Diet chips (on the page and in the dropdown)
document.querySelectorAll("[data-filter]").forEach((chip) =>
  chip.addEventListener("click", () => {
    const on = chip.getAttribute("aria-pressed") !== "true";
    chip.setAttribute("aria-pressed", on);
    on ? filters.add(chip.dataset.filter) : filters.delete(chip.dataset.filter);
  }));

dietToggle.addEventListener("click", () =>
  dietToggle.setAttribute("aria-expanded", dietToggle.getAttribute("aria-expanded") !== "true"));

// Search: open Discover with the search and diets in the link
document.getElementById("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const params = new URLSearchParams({ q: document.getElementById("search-input").value.trim() });
  if (filters.size) params.set("diet", [...filters].join(","));
  location.href = `discover.html?${params}`;
});

// Featured recipes
const cards = document.getElementById("featured-cards");
const banner = document.getElementById("api-banner");

async function loadFeatured() {
  try {
    const { results } = await API.search({ number: 3 });
    showError(banner, "");
    cards.innerHTML = results.map((r) => `
      <article class="card">
        <a class="card-link" href="recipe.html?id=${r.id}" aria-label="${escapeHTML(r.title)}"></a>
        <div class="card__img"><img src="${escapeHTML(r.image)}" alt="" /></div>
        <div class="card__body">
          <h3>${escapeHTML(r.title)}</h3>
          <p class="meta">${ICONS.clock} ${r.time} mins</p>
          <p class="meta">${ICONS.people} Serves ${r.servings}</p>
        </div>
        <button class="fav" data-id="${r.id}" aria-pressed="${saved.has(r.id)}" aria-label="Save">${ICONS.heart}</button>
      </article>`).join("");
  } catch (err) {
    showError(banner, err.message, loadFeatured);
  }
}

bindHearts(cards);
loadFeatured();