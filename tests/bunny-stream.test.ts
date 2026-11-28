import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
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
  it("renders a signed iframe from videos.yaml", () => {
    const prev = process.env.BUNNY_STREAM_TOKEN_KEY;
    process.env.BUNNY_STREAM_TOKEN_KEY = "secret-key";
    try {
      const videos = validateVideosContent({
        videos: { "lesson-01": { provider: "bunny", libraryId: Number(LIB), videoId: VID.toUpperCase(), title: "Lecture 1" } },
      });
      const html = renderToStaticMarkup(createElement(createLessonVideoPlayer(videos), { assetId: "lesson-01" }));
      const src = /src="([^"]+)"/.exec(html)?.[1]?.replace(/&amp;/g, "&") ?? "";
      const u = new URL(src);
      assert.equal(u.pathname, `/embed/${LIB}/${VID}`);
      assert.match(u.searchParams.get("token") ?? "", /^[0-9a-f]{64}$/);
      assert.ok(Number(u.searchParams.get("expires")) > Date.now() / 1000);
      assert.ok(html.includes("Lecture 1"));
      assert.ok(html.includes('referrerPolicy="strict-origin-when-cross-origin"') || html.includes("referrerpolicy"));
      assert.ok(!html.includes("secret-key"));
    } finally {
      if (prev === undefined) delete process.env.BUNNY_STREAM_TOKEN_KEY;
      else process.env.BUNNY_STREAM_TOKEN_KEY = prev;
    }
  });

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
