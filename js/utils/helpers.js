// Helpers shared by all pages.

// Escape text before putting it in HTML (stops XSS)
const escapeHTML = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const label = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const ICONS = {
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  people: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>',
};

// Saved recipes, kept in the browser
const saved = {
  all: () => JSON.parse(localStorage.getItem("saved") || "[]"),
  has: (id) => saved.all().includes(id),
  toggle(id) {
    const list = saved.has(id) ? saved.all().filter((x) => x !== id) : [...saved.all(), id];
    localStorage.setItem("saved", JSON.stringify(list));
    return list.includes(id);
  },
};

// Heart buttons inside a list of cards
function bindHearts(container) {
  container.addEventListener("click", (e) => {
    const heart = e.target.closest(".fav");
    if (heart) heart.setAttribute("aria-pressed", saved.toggle(Number(heart.dataset.id)));
  });
}

// Recipe card (Discover page)
function recipeCard(r) {
  return `
    <article class="r-card">
      <a class="card-link" href="recipe.html?id=${r.id}" aria-label="${escapeHTML(r.title)}"></a>
      <div class="r-card__img">
        <img src="${escapeHTML(r.image)}" alt="" loading="lazy" />
        ${r.category ? `<span class="r-card__tag">${label(r.category)}</span>` : ""}
      </div>
      <button class="fav" data-id="${r.id}" aria-pressed="${saved.has(r.id)}" aria-label="Save">${ICONS.heart}</button>
      <div class="r-card__body">
        <h3>${escapeHTML(r.title)}</h3>
        <div class="r-card__meta">
          <span>${ICONS.clock} ${r.time} min</span>
          <span>${ICONS.people} ${r.servings}</span>
        </div>
      </div>
    </article>`;
}

// Error message with a "Try again" button
function showError(el, message, retry) {
  el.hidden = !message;
  if (!message) return;
  el.innerHTML = `<p>${escapeHTML(message)}</p><button type="button" class="banner__retry">Try again</button>`;
  el.querySelector("button").onclick = retry;
}

// Mobile menu and newsletter (same on every page)
document.querySelector(".nav-toggle").addEventListener("click", (e) => {
  const open = e.currentTarget.getAttribute("aria-expanded") !== "true";
  e.currentTarget.setAttribute("aria-expanded", open);
  document.getElementById("main-nav").classList.toggle("is-open", open);
});

document.getElementById("newsletter-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const ok = e.target.email.checkValidity() && e.target.email.value;
  document.getElementById("newsletter-msg").textContent = ok
    ? "You're in! Fresh recipes are on their way."
    : "Please enter a valid email address.";
  if (ok) e.target.reset();
});