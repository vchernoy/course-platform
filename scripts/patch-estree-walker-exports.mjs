/**
 * estree-walker@3 is ESM-only in exports; tsx's CommonJS resolution fails without `require`.
 * Idempotent patch applied after npm install.
 */
import fs from "node:fs";
import path from "node:path";

const pkgPath = path.join(process.cwd(), "node_modules", "estree-walker", "package.json");
if (!fs.existsSync(pkgPath)) {
  process.exit(0);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const dot = pkg.exports && pkg.exports["."];
if (
  dot &&
  typeof dot === "object" &&
  typeof dot.import === "string" &&
  dot.require === undefined
) {
  dot.require = dot.import;
  dot.default = dot.import;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);
}
