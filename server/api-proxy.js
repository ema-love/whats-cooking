// Local server: serves the website and adds the API key to /api requests.

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg" };

// Read the API key from .env
const env = fs.existsSync(path.join(ROOT, ".env")) ? fs.readFileSync(path.join(ROOT, ".env"), "utf8") : "";
const API_KEY = (env.match(/SPOONACULAR_API_KEY=(\S+)/) || [])[1];

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  // API: forward to Spoonacular with the key
  if (url.pathname.startsWith("/api/recipes/")) {
    try {
      const api = await fetch("https://api.spoonacular.com" + url.pathname.slice(4) + url.search, {
        headers: { "x-api-key": API_KEY || "" },
      });
      res.writeHead(api.status, { "Content-Type": "application/json" });
      return res.end(await api.text());
    } catch {
      res.writeHead(502);
      return res.end();
    }
  }

  // Website files (never .env or the server folder)
  const file = path.join(ROOT, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname));
  const relative = path.relative(ROOT, file);
  if (relative.startsWith("..") || relative.startsWith(".") || relative.startsWith("server")) {
    res.writeHead(404);
    return res.end("Not found");
  }
  fs.readFile(file, (err, data) => {
    res.writeHead(err ? 404 : 200, { "Content-Type": TYPES[path.extname(file)] || "text/plain" });
    res.end(err ? "Not found" : data);
  });
}).listen(8080, () => console.log("What's Cooking? running at http://localhost:8080"));