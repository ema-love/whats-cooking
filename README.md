# What's Cooking?

> Got ingredients? We've got ideas.

What's Cooking? helps you decide **what to cook with what you already have**. Search thousands of real recipes by name or by ingredients, filter by meal type, diet and allergies, and follow each recipe step by step. It uses the **Spoonacular Food API**.

| | |
|---|---|
| **Live site (load balancer)** | http://52.56.103.54 |
| **Demo video** |(https://drive.google.com/file/d/1MHNPJIAuVf6BwCufmMvi-vF50htThI_-/view?usp=sharing)|
| **API key** | Provided in the submission comment (never in this repository) |
| **Login** | None needed: the site has no accounts |

---

## Features

- **Home:** search by dish or ingredients, quick diet filters, featured recipes.
- **Discover:**
  - search by recipe name and/or ingredients (`rice, tomato`)
  - filter by meal type, diet (vegetarian, vegan, pescetarian, keto) and allergy (gluten, dairy, nuts, eggs)
  - hide any ingredient you want to avoid
  - sort by most popular, healthiest, quickest, or uses most of my ingredients
  - load more results
- **Recipe:** photo, time, servings, diets, ingredient checklist, numbered steps, link to the original recipe, Save and Share.
- **Saved recipes:** the heart buttons remember recipes in your browser.
- **Errors:** if the API is down, the daily limit is reached, or a reply is broken, the page shows a clear message with a **Try again** button.

---

## API

**Spoonacular Food API**: https://spoonacular.com/food-api · Docs: https://spoonacular.com/food-api/docs

| Endpoint | Used for |
|---|---|
| `GET /recipes/complexSearch` | Search, filters, sorting, paging, featured recipes |
| `GET /recipes/{id}/information` | Recipe page |

What I learned from the docs:
- **Key:** every request needs it, sent here in the `x-api-key` header.
- **Daily points limit:** the free plan has one, and the API answers **402** when it runs out. A bad key gives **401** and too many requests give **429**. Each of these shows its own message.
- **Diets vs allergies:** diets go in `diet`, allergies in `intolerances`. "Nut-free" sends `peanut,tree nut`.

### Keeping the API key secret

The browser never calls Spoonacular directly. It calls `/api/recipes/...` on **our own server**, which adds the key and forwards the request:

```
Browser ──/api/recipes/...──► our server (adds x-api-key) ──► api.spoonacular.com
```

- **Locally:** `server/api-proxy.js` reads the key from `.env`.
- **On the servers:** Nginx reads it from `/etc/nginx/snippets/spoonacular-key.conf`.
- **In the repository:** there's no key anywhere. `.env` is in `.gitignore`, and neither server will serve `.env`, `.git` or the `server/` folder.

---

## Project structure

```
whats-cooking/
├── index.html, discover.html, recipe.html
├── css/        style.css, discover.css, recipe.css, responsive.css
├── js/         main.js, discover.js, recipe.js
│   ├── api/    spoonacular.js    (all API calls and error messages)
│   └── utils/  helpers.js        (shared: cards, saving, menu, newsletter)
├── assets/     images/, logo/, icons/
├── server/     api-proxy.js (local), nginx.conf (web-01/02), haproxy.cfg (lb-01)
├── README.md
└── .gitignore
```

---

## Run it locally

Needs **Node.js 18+** (`node -v`). No packages to install.

```bash
git clone https://github.com/YOUR_USERNAME/whats-cooking.git
cd whats-cooking
echo "SPOONACULAR_API_KEY=your_key_here" > .env
node server/api-proxy.js
```
Open **http://localhost:8080**. Get a free key at https://spoonacular.com/food-api/console.

---

## Deployment

```
           Visitors
              │
       lb-01 (HAProxy)   ← takes turns between the two servers
          ┌───┴───┐
     web-01      web-02  ← Nginx: serves the site + adds the API key
          └───┬───┘
      api.spoonacular.com
```

### 1. Web servers (do this on web-01, then on web-02)

```bash
ssh ubuntu@3.8.117.215      # web-01  (web-02: ssh ubuntu@18.170.32.150)

sudo apt update && sudo apt install -y nginx git
sudo git clone https://github.com/YOUR_USERNAME/whats-cooking.git /var/www/whats-cooking

# Save the API key for Nginx only
sudo mkdir -p /etc/nginx/snippets
echo 'proxy_set_header x-api-key "YOUR_KEY";' | sudo tee /etc/nginx/snippets/spoonacular-key.conf > /dev/null
sudo chmod 600 /etc/nginx/snippets/spoonacular-key.conf

# Use our site config instead of the default one
sudo mkdir -p /var/cache/nginx/whats-cooking
sudo cp /var/www/whats-cooking/server/nginx.conf /etc/nginx/sites-available/whats-cooking
sudo ln -sf /etc/nginx/sites-available/whats-cooking /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

What `server/nginx.conf` does:
- **Serves the website** from `/var/www/whats-cooking`.
- **Proxies the API:** `/api/recipes/` goes to Spoonacular with the key added. Only `GET` requests are allowed.
- **Caches API answers for 1 hour**, which saves the daily limit and speeds up repeat searches.
- **Adds an `X-Served-By` header**, so you can see which server answered.
- **Hides private files:** `.env`, `.git` and `server/` return 404.

### 2. Load balancer (lb-01)

```bash
ssh ubuntu@52.56.103.54

sudo apt update && sudo apt install -y haproxy git
git clone https://github.com/YOUR_USERNAME/whats-cooking.git
sed -e "s/WEB01_IP/3.8.117.215/" -e "s/WEB02_IP/18.170.32.150/" whats-cooking/server/haproxy.cfg | sudo tee /etc/haproxy/haproxy.cfg > /dev/null
sudo haproxy -c -f /etc/haproxy/haproxy.cfg && sudo systemctl restart haproxy
```

What `server/haproxy.cfg` does:
- **`balance roundrobin`:** requests alternate web-01 → web-02 → web-01...
- **`check`:** HAProxy keeps checking both servers. If one stops answering, all visitors go to the other until it's back.

### 3. Testing

```bash
# Traffic alternates between the servers
for i in 1 2 3 4; do curl -sI http://52.56.103.54 | grep -i x-served-by; done
#   x-served-by: web-01
#   x-served-by: web-02
#   x-served-by: web-01
#   x-served-by: web-02

# The API works through the load balancer
curl -s "http://52.56.103.54/api/recipes/complexSearch?query=pasta&number=1"

# Private files are hidden (404)
curl -s -o /dev/null -w "%{http_code}\n" http://52.56.103.54/.env

# If one server stops, the site stays up
sudo systemctl stop nginx      # on web-01; requests now all go to web-02
sudo systemctl start nginx     # traffic alternates again
```

In the browser, open `http://52.56.103.54`, search, filter, sort, open a recipe and check that it all works.

---

## Challenges

| Challenge | Solution |
|---|---|
| A website's JavaScript is public, so it can't hide an API key | A small server adds the key (Nginx on the servers, `api-proxy.js` locally) |
| The free plan has a small daily limit | Search only runs on Enter or a click, and Nginx caches answers for an hour |
| My diet buttons didn't match the API's options one-to-one | Diets go in `diet`, allergies in `intolerances` |
| Recipe summaries come back as HTML | Turned into plain text before showing; all API text is escaped (stops XSS) |
| Copy-to-clipboard only works on https pages, and the servers use plain http | The Share button shows the link to copy instead |

---

## Credits

- **Recipe data:** [Spoonacular Food API](https://spoonacular.com/food-api)
- **Fonts:** [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) and [DM Sans](https://fonts.google.com/specimen/DM+Sans) (Google Fonts)
- **Servers:** [Nginx](https://nginx.org/) and [HAProxy](https://www.haproxy.org/)
- **Design, logo and icons:** Erioluwa Mercy Akintayo(Ema)
