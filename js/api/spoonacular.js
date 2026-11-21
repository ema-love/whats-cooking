// Spoonacular API calls.
// The browser calls /api/... on our own server, which adds the secret API key.

const API = (() => {
  const MESSAGES = {
    401: "The recipe service didn't accept our API key.",
    402: "We've used today's free allowance from the recipe service. Please try again tomorrow.",
    404: "We couldn't find that recipe.",
    429: "Too many searches at once. Please wait a few seconds and try again.",
    network: "We can't reach the recipe service right now. Check your connection.",
    timeout: "The recipe service is taking too long to answer.",
    invalid: "The recipe service sent back something we couldn't read.",
    server: "The recipe service is having trouble right now.",
  };

  // GET a path with query parameters. Throws an Error with a friendly message.
  async function get(path, params = {}) {
    const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null));
    let res;
    try {
      res = await fetch(`/api${path}?${query}`, { signal: AbortSignal.timeout(10000) });
    } catch (err) {
      throw new Error(err.name === "TimeoutError" ? MESSAGES.timeout : MESSAGES.network);
    }
    if (!res.ok) throw new Error(MESSAGES[res.status] || MESSAGES.server);
    try {
      return await res.json();
    } catch {
      throw new Error(MESSAGES.invalid);
    }
  }

  // Our diet buttons -> Spoonacular "diet" or "intolerances"
  const DIETS = { vegetarian: "vegetarian", vegan: "vegan", pescetarian: "pescetarian", keto: "ketogenic" };
  const INTOLERANCES = { "gluten-free": "gluten", "dairy-free": "dairy", "nut-free": "peanut,tree nut", "egg-free": "egg" };
  const CATEGORIES = ["breakfast", "main course", "salad", "soup", "dessert", "snack"];

  // Turn an API recipe into the simple shape the pages use
  function clean(r) {
    const diets = [];
    if (r.vegetarian) diets.push("vegetarian");
    if (r.vegan) diets.push("vegan");
    if (r.glutenFree) diets.push("gluten-free");
    if (r.dairyFree) diets.push("dairy-free");
    return {
      id: r.id,
      title: r.title,
      image: r.image || `https://img.spoonacular.com/recipes/${r.id}-312x231.jpg`,
      time: r.readyInMinutes,
      servings: r.servings,
      likes: r.aggregateLikes,
      healthScore: r.healthScore,
      category: (r.dishTypes || []).find((d) => CATEGORIES.includes(d)) || "",
      diets,
    };
  }

  async function search({ query = "", include = [], exclude = [], category = "", diets = [], sort = "popularity", offset = 0, number = 12 }) {
    const data = await get("/recipes/complexSearch", {
      query,
      includeIngredients: include.join(","),
      excludeIngredients: exclude.join(","),
      type: category,
      diet: diets.map((d) => DIETS[d]).filter(Boolean).join(","),
      intolerances: diets.map((d) => INTOLERANCES[d]).filter(Boolean).join(","),
      sort,
      sortDirection: sort === "time" ? "asc" : "desc",
      addRecipeInformation: true,
      instructionsRequired: true,
      offset,
      number,
    });
    if (!Array.isArray(data.results)) throw new Error(MESSAGES.invalid);
    return { results: data.results.map(clean), total: data.totalResults };
  }

  async function recipe(id) {
    const r = await get(`/recipes/${id}/information`);
    if (!r.title) throw new Error(MESSAGES.invalid);
    const summary = new DOMParser().parseFromString(r.summary || "", "text/html").body.textContent;
    return {
      ...clean(r),
      image: r.image,
      description: (summary.match(/[^.!?]+[.!?]/g) || []).slice(0, 2).join(""),
      ingredients: (r.extendedIngredients || []).map((i) => i.original),
      steps: (r.analyzedInstructions?.[0]?.steps || []).map((s) => s.step),
      sourceName: r.sourceName,
      sourceUrl: r.sourceUrl,
    };
  }

  return { search, recipe };
})();