// Test-only isolated host: no Clerk, learner routes, private config or production data.
import { createServer } from "node:http";
import { build } from "esbuild";
import { renderActive } from "@vchernoy/remark-active";
import { readActiveDocument } from "../../lib/active-document";
const html = renderActive(readActiveDocument("investing-basics-2026-05", "../assets/compound-interest.md"), { locale: "en-US" }).html;
async function start() {
const bundle = await build({ entryPoints: ["tests/browser/entry.tsx"], bundle: true, write: false, format: "esm", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' } });
createServer((req, res) => {
  if (req.url === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].text); return; }
  if (req.url !== "/") { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><meta name="viewport" content="width=device-width"><div id="root">' + '<button>Toggle documents</button><div data-testid="first"><div class="active-document">' + html + '</div></div><div data-testid="second"><div class="active-document">' + html + '</div></div>' + '</div><script type="application/json" id="payload">' + JSON.stringify(html).replace(/</g, "\\u003c") + '</script><script type="module" src="/bundle.js"></script>');
}).listen(4317, "127.0.0.1");

}
void start();
