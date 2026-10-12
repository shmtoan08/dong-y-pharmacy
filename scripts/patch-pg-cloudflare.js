// Patch pg-cloudflare để esbuild bundle đúng CloudflareSocket thay vì file stub rỗng.
// Chạy tự động sau mỗi lần npm install (postinstall).
const fs = require("fs");
const path = require("path");

const pkgPath = path.join(__dirname, "..", "node_modules", "pg-cloudflare", "package.json");

try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (pkg.exports && pkg.exports["."]) {
    pkg.exports["."].default = "./dist/index.js";
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    console.log("[patch] pg-cloudflare exports.default -> ./dist/index.js");
  }
} catch (e) {
  // pg-cloudflare chưa được cài (vd: npm install --ignore-scripts) → bỏ qua
  console.log("[patch] skip pg-cloudflare patch:", e.message);
}
