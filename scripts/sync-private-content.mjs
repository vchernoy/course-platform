#!/usr/bin/env node
/**
 * Clone the private content repository into `private-content/` before `next build`.
 *
 * Runs as the npm `prebuild` script. Configuration (Vercel project → Settings → Environment Variables):
 *
 *   PRIVATE_CONTENT_REPO   owner/name of the private repo, e.g. vchernoy/course-platform-private
 *   PRIVATE_CONTENT_TOKEN  GitHub fine-grained token with read-only "Contents" access to that repo
 *   PRIVATE_CONTENT_REF    optional branch or tag (default: the repo's default branch)
 *   PRIVATE_CONTENT_DIR    optional target folder (default: private-content)
 *
 * When PRIVATE_CONTENT_REPO is unset the script does nothing, so local development and CI keep
 * working with the public sample content (or a private-content/ folder you manage yourself).
 * When it is set, any failure stops the build: deploying without the private users and courses
 * would silently lock out students.
 *
 * See docs/private-content.md.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repo = process.env.PRIVATE_CONTENT_REPO?.trim();
if (!repo) {
  console.log("[private-content] PRIVATE_CONTENT_REPO not set; using public content only.");
  process.exit(0);
}

function fail(message) {
  console.error(`[private-content] ${message}`);
  process.exit(1);
}

if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
  fail(`PRIVATE_CONTENT_REPO must look like owner/name, got ${JSON.stringify(repo)}.`);
}

const token = process.env.PRIVATE_CONTENT_TOKEN?.trim();
if (!token) {
  fail("PRIVATE_CONTENT_REPO is set but PRIVATE_CONTENT_TOKEN is missing.");
}

const ref = process.env.PRIVATE_CONTENT_REF?.trim();
if (ref && !/^[A-Za-z0-9_./-]+$/.test(ref)) {
  fail(`PRIVATE_CONTENT_REF has unexpected characters: ${JSON.stringify(ref)}.`);
}

const root = process.cwd();
const target = path.resolve(root, process.env.PRIVATE_CONTENT_DIR?.trim() || "private-content");
const rel = path.relative(root, target);
if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
  fail(`PRIVATE_CONTENT_DIR must be a folder inside the project, got ${JSON.stringify(target)}.`);
}

fs.rmSync(target, { recursive: true, force: true });

// Pass the token as an HTTP header for this one command, so it never lands in the
// clone URL, the saved git config, or error messages that echo the URL.
const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
const args = [
  "-c",
  `http.https://github.com/.extraheader=AUTHORIZATION: basic ${basic}`,
  "clone",
  "--depth",
  "1",
  "--quiet",
  ...(ref ? ["--branch", ref] : []),
  `https://github.com/${repo}.git`,
  target,
];

try {
  execFileSync("git", args, {
    stdio: ["ignore", "ignore", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
} catch (e) {
  const stderr = e && typeof e === "object" && "stderr" in e ? String(e.stderr) : String(e);
  fail(`git clone of ${repo}${ref ? `@${ref}` : ""} failed: ${stderr.split(basic).join("***").trim()}`);
}

fs.rmSync(path.join(target, ".git"), { recursive: true, force: true });

const has = (p) => fs.existsSync(path.join(target, p));
const found = [
  has("config/students.yaml") && "config/students.yaml",
  has("config/admins.yaml") && "config/admins.yaml",
  has("content/offerings") && `${fs.readdirSync(path.join(target, "content/offerings")).length} offering folder(s)`,
  has("content/sites") && `${fs.readdirSync(path.join(target, "content/sites")).length} site folder(s)`,
].filter(Boolean);

if (found.length === 0) {
  fail(`${repo} has none of config/students.yaml, config/admins.yaml, content/offerings, content/sites.`);
}

console.log(`[private-content] Synced ${repo}${ref ? `@${ref}` : ""} into ${rel}: ${found.join(", ")}.`);
