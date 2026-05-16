import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateVideosContent } from "../lib/offering-videos";

describe("validateVideosContent", () => {
  it("accepts vimeo and cloudflare entries", () => {
    const map = validateVideosContent({
      videos: {
        "a-recording": {
          provider: "vimeo",
          videoId: "123",
          title: "T",
        },
        "b-recording": {
          provider: "cloudflare",
          playbackId: "xyz",
        },
      },
    });
    assert.equal(map["a-recording"]!.provider, "vimeo");
    assert.equal(map["b-recording"]!.provider, "cloudflare");
  });

  it("rejects invalid asset id key", () => {
    assert.throws(
      () =>
        validateVideosContent({
          videos: {
            Bad_Key: { provider: "vimeo", videoId: "1" },
          },
        }),
      /invalid videos key/
    );
  });

  it("rejects missing videos map", () => {
    assert.throws(() => validateVideosContent({}), /"videos" is required/);
  });

  it("rejects unknown provider", () => {
    assert.throws(
      () =>
        validateVideosContent({
          videos: {
            x: { provider: "youtube", videoId: "1" },
          },
        }),
      /provider must be "vimeo" or "cloudflare"/
    );
  });
});
