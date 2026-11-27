/**
 * Clone every GitHub source listed in config/sources.yaml into external-content/<customer>/<source>/.
 *
 * Runs as the npm `prebuild` script (and `npm run sync:sources`). Private repos name an environment
 * variable that holds a read-only GitHub token (`tokenEnv:`); public repos need none.
 *
 * Strict mode (on Vercel, or SOURCES_STRICT=1): any source that cannot be fetched fails the build,
 * so a deploy never silently drops a customer's students or courses.
 * Otherwise (local dev, CI): such sources are skipped with a warning.
 *
 * See docs/content-sources.md.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { EXTERNAL_CONTENT_DIR, githubCloneDir, loadSourcesConfig, sourceRootDir } from "../lib/sources";

const projectRoot = process.cwd();
const strict = process.env.VERCEL === "1" || process.env.SOURCES_STRICT === "1";

function log(msg: string) {
  console.log(`[content-sources] ${msg}`);
}

let config;
try {
  config = loadSourcesConfig(projectRoot);
} catch (e) {
  console.error(`[content-sources] ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

const problems: string[] = [];

function clone(repo: string, ref: string | undefined, token: string | undefined, target: string) {
  const args: string[] = [];
  let secret: string | undefined;
  if (token) {
    // Pass the token as an HTTP header for this one command, so it never lands in the clone URL,
    // the saved git config, or error output that echoes the URL.
    secret = Buffer.from(`x-access-token:${token}`).toString("base64");
    args.push("-c", `http.https://github.com/.extraheader=AUTHORIZATION: basic ${secret}`);
  }
  args.push("clone", "--depth", "1", "--quiet", ...(ref ? ["--branch", ref] : []), `https://github.com/${repo}.git`, target);
  try {
    execFileSync("git", args, {
      stdio: ["ignore", "ignore", "pipe"],
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
  } catch (e) {
    const stderr = e && typeof e === "object" && "stderr" in e ? String((e as { stderr: unknown }).stderr) : String(e);
    let clean = stderr;
    for (const t of [token, secret]) if (t) clean = clean.split(t).join("***");
    throw new Error(`git clone failed: ${clean.trim()}`);
  }
  fs.rmSync(path.join(target, ".git"), { recursive: true, force: true });
}

function describe(root: string): string {
  const has = (p: string) => fs.existsSync(path.join(root, p));
  const count = (p: string) =>
    has(p) ? fs.readdirSync(path.join(root, p), { withFileTypes: true }).filter((d) => d.isDirectory()).length : 0;
  const parts = [
    has("config/students.yaml") && "students",
    has("config/admins.yaml") && "admins",
    count("content/offerings") && `${count("content/offerings")} offering(s)`,
    count("content/sites") && `${count("content/sites")} site(s)`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "nothing (no config/ or content/)";
}

fs.rmSync(path.join(projectRoot, EXTERNAL_CONTENT_DIR), { recursive: true, force: true });

for (const customer of config.customers) {
  for (const source of customer.sources) {
    const label = `${customer.id}/${source.id}`;
    try {
      if (source.type === "github") {
        const token = source.tokenEnv ? process.env[source.tokenEnv]?.trim() : undefined;
        if (source.tokenEnv && !token) {
          throw new Error(`environment variable ${source.tokenEnv} (token for ${source.repo}) is not set`);
        }
        const target = githubCloneDir(projectRoot, customer.id, source.id);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        clone(source.repo, source.ref, token, target);
      }
      const root = sourceRootDir(projectRoot, customer.id, source);
      if (!fs.existsSync(root)) {
        throw new Error(`folder ${path.relative(projectRoot, root) || "."} does not exist`);
      }
      const where = source.type === "github" ? `${source.repo}${source.ref ? `@${source.ref}` : ""}` : source.type;
      log(`${label} (${where}${source.path ? `, path ${source.path}` : ""}): ${describe(root)}`);
    } catch (e) {
      const msg = `${label}: ${e instanceof Error ? e.message : String(e)}`;
      problems.push(msg);
      console[strict ? "error" : "warn"](`[content-sources] ${strict ? "ERROR" : "skipping"} ${msg}`);
    }
  }
}

if (problems.length && strict) {
  console.error(`[content-sources] ${problems.length} source(s) failed; stopping the build.`);
  process.exit(1);
}
