import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  bunnyEmbedToken,
  bunnyEmbedUrl,
  bunnyTokenKeyFor,
  bunnyTokenTtlSeconds,
  DEFAULT_TOKEN_TTL_SECONDS,
} from "../lib/bunny-stream";
import { createLessonVideoPlayer, VideoPlayer } from "../components/mdx/VideoPlayer";
import { validateVideosContent } from "../lib/offering-videos";

const LIB = "123456";
const VID = "0f1e2d3c-4b5a-6978-8a9b-acbdcedf0123";
const NOW_MS = Date.UTC(2027, 0, 10, 12, 0, 0);
const NOW_S = NOW_MS / 1000;

describe("bunnyEmbedToken", () => {
  it("is hex SHA-256 of key + videoId + expires", () => {
    const expected = createHash("sha256").update(`secret-key${VID}1800000000`).digest("hex");
    assert.equal(bunnyEmbedToken("secret-key", VID, 1800000000), expected);
    assert.match(expected, /^[0-9a-f]{64}$/);
  });

  it("changes with any input", () => {
    const base = bunnyEmbedToken("k", VID, 1);
    assert.notEqual(bunnyEmbedToken("k2", VID, 1), base);
    assert.notEqual(bunnyEmbedToken("k", VID.replace("0f", "1f"), 1), base);
    assert.notEqual(bunnyEmbedToken("k", VID, 2), base);
  });
});

describe("bunnyTokenKeyFor / bunnyTokenTtlSeconds", () => {
  it("prefers the per-library key, then the shared key", () => {
    assert.equal(bunnyTokenKeyFor(LIB, { BUNNY_STREAM_TOKEN_KEY: "shared" }), "shared");
    assert.equal(
      bunnyTokenKeyFor(LIB, { BUNNY_STREAM_TOKEN_KEY: "shared", [`BUNNY_STREAM_TOKEN_KEY_${LIB}`]: "own" }),
      "own"
    );
    assert.equal(bunnyTokenKeyFor(LIB, {}), undefined);
    assert.equal(bunnyTokenKeyFor(LIB, { BUNNY_STREAM_TOKEN_KEY: "  " }), undefined);
  });

  it("defaults to 6 hours and clamps", () => {
    assert.equal(bunnyTokenTtlSeconds({}), DEFAULT_TOKEN_TTL_SECONDS);
    assert.equal(bunnyTokenTtlSeconds({ BUNNY_STREAM_TOKEN_TTL_SECONDS: "3600" }), 3600);
    assert.equal(bunnyTokenTtlSeconds({ BUNNY_STREAM_TOKEN_TTL_SECONDS: "5" }), 60);
    assert.equal(bunnyTokenTtlSeconds({ BUNNY_STREAM_TOKEN_TTL_SECONDS: "9999999" }), 86400);
    assert.equal(bunnyTokenTtlSeconds({ BUNNY_STREAM_TOKEN_TTL_SECONDS: "abc" }), DEFAULT_TOKEN_TTL_SECONDS);
  });
});

describe("bunnyEmbedUrl", () => {
  it("signs with token and expires when a key is configured", () => {
    const env = { BUNNY_STREAM_TOKEN_KEY: "secret-key", BUNNY_STREAM_TOKEN_TTL_SECONDS: "3600" };
    const e = bunnyEmbedUrl(LIB, VID, { env, nowMs: NOW_MS });
    const u = new URL(e.src);
    assert.equal(u.origin, "https://iframe.mediadelivery.net");
    assert.equal(u.pathname, `/embed/${LIB}/${VID}`);
    assert.equal(e.signed, true);
    assert.equal(e.expires, NOW_S + 3600);
    assert.equal(u.searchParams.get("expires"), String(NOW_S + 3600));
    assert.equal(u.searchParams.get("token"), bunnyEmbedToken("secret-key", VID, NOW_S + 3600));
    assert.ok(!e.src.includes("secret-key"), "the key itself never appears in the URL");
  });

  it("is unsigned without a key", () => {
    const e = bunnyEmbedUrl(LIB, VID, { env: {}, nowMs: NOW_MS });
    assert.equal(e.signed, false);
    assert.equal(new URL(e.src).searchParams.get("token"), null);
  });

  it("rejects ids that could change the host or path", () => {
    for (const [lib, vid] of [
      ["123/../x", VID],
      ["abc", VID],
      [LIB, "not-a-guid"],
      [LIB, `${VID}/../../evil`],
      [LIB, `${VID}?x=1`],
    ] as const) {
      assert.throws(() => bunnyEmbedUrl(lib, vid, { env: {} }), /Invalid Bunny/);
    }
  });
});

describe("VideoPlayer with provider bunny", () => {
  it("shows a helper instead of an iframe for bad inline ids", () => {
    const html = renderToStaticMarkup(
      createElement(VideoPlayer, { provider: "bunny", libraryId: "1", videoId: "https://evil.example/x" })
    );
    assert.ok(!html.includes("<iframe"));
    assert.ok(html.includes("Bunny video needs"));
  });

  it("keeps vimeo and cloudflare working", () => {
    const vimeo = renderToStaticMarkup(createElement(VideoPlayer, { provider: "vimeo", videoId: "76979871" }));
    assert.ok(vimeo.includes("https://player.vimeo.com/video/76979871"));
    const cf = renderToStaticMarkup(createElement(VideoPlayer, { provider: "cloudflare", playbackId: "abc" }));
    assert.ok(cf.includes("https://iframe.videodelivery.net/abc"));
  });
});

/**
 * Codex review on #30 (P1): signing must be scoped to the customer that owns the lesson, so one
 * customer's content (or an admin preview) can't mint links to another customer's library.
 */
describe("Bunny signing is scoped to the offering's customer", () => {
  const MINE = "111111";
  const THEIRS = "222222";
  const UNLISTED = "333333";
  let tmp: string;
  const origCwd = process.cwd();
  const prevKey = process.env.BUNNY_STREAM_TOKEN_KEY;

  const write = (file: string, body: string) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body, "utf8");
  };
  const offering = (root: string, slug: string) =>
    write(
      path.join(root, "content/offerings", slug, "offering.yaml"),
      `title: "${slug}"\nformat: course\nmodules:\n  - slug: m\n    title: M\n    lessons:\n      - slug: l\n        title: L\n`
    );
  const tokenOf = (html: string) => {
    const src = /src="([^"]+)"/.exec(html)?.[1]?.replace(/&amp;/g, "&");
    assert.ok(src, "renders an iframe");
    return new URL(src).searchParams.get("token");
  };
  const render = (offeringSlug: string | undefined, props: Record<string, unknown>, videos = {}) =>
    renderToStaticMarkup(createElement(createLessonVideoPlayer(validateVideosContent({ videos }), offeringSlug), props as never));

  beforeEach(() => {
    tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "bunny-scope-")));
    const app = path.join(tmp, "app");
    write(
      path.join(app, "config/sources.yaml"),
      `customers:\n  - id: me\n    bunnyLibraries: ["${MINE}"]\n    sources:\n      - dir: ../me\n  - id: them\n    bunnyLibraries: [${THEIRS}]\n    sources:\n      - dir: ../them\n`
    );
    offering(path.join(tmp, "me"), "my-course");
    offering(path.join(tmp, "them"), "their-course");
    process.chdir(app);
    process.env.BUNNY_STREAM_TOKEN_KEY = "shared-key";
  });

  afterEach(() => {
    process.chdir(origCwd);
    if (prevKey === undefined) delete process.env.BUNNY_STREAM_TOKEN_KEY;
    else process.env.BUNNY_STREAM_TOKEN_KEY = prevKey;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("signs the offering customer's own library", () => {
    const html = render("my-course", { assetId: "rec" }, { rec: { provider: "bunny", libraryId: MINE, videoId: VID } });
    assert.match(tokenOf(html) ?? "", /^[0-9a-f]{64}$/);
  });

  it("does not sign another customer's library from videos.yaml", () => {
    const html = render("my-course", { assetId: "rec" }, { rec: { provider: "bunny", libraryId: THEIRS, videoId: VID } });
    assert.equal(tokenOf(html), null);
  });

  it("does not sign another customer's library from inline MDX props (admin preview path)", () => {
    const html = render("my-course", { provider: "bunny", libraryId: THEIRS, videoId: VID });
    assert.equal(tokenOf(html), null);
    // ...while the owning customer's lesson does get a token for the same video.
    assert.ok(tokenOf(render("their-course", { provider: "bunny", libraryId: THEIRS, videoId: VID })));
  });

  it("does not sign a library no customer lists", () => {
    assert.equal(tokenOf(render("my-course", { provider: "bunny", libraryId: UNLISTED, videoId: VID })), null);
  });

  it("does not sign without a lesson scope, or for an unknown offering", () => {
    assert.equal(tokenOf(render(undefined, { provider: "bunny", libraryId: MINE, videoId: VID })), null);
    assert.equal(tokenOf(render("no-such-course", { provider: "bunny", libraryId: MINE, videoId: VID })), null);
    assert.equal(
      tokenOf(renderToStaticMarkup(createElement(VideoPlayer, { provider: "bunny", libraryId: MINE, videoId: VID }))),
      null
    );
  });

  it("ignores scope-like props passed from MDX", () => {
    const html = render("my-course", { provider: "bunny", libraryId: THEIRS, videoId: VID, scope: { customer: "them" }, customer: "them" });
    assert.equal(tokenOf(html), null);
  });
});
