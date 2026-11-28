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
      /provider must be "vimeo", "cloudflare" or "bunny"/
    );
  });

  it("accepts bunny entries (numeric or string library id, GUID lowercased)", () => {
    const map = validateVideosContent({
      videos: {
        "lesson-01": { provider: "bunny", libraryId: 123456, videoId: "0F1E2D3C-4B5A-6978-8A9B-ACBDCEDF0123", title: "L1" },
        "lesson-02": { provider: "bunny", libraryId: "654321", videoId: "0f1e2d3c-4b5a-6978-8a9b-acbdcedf0124" },
      },
    });
    assert.deepEqual(map["lesson-01"], {
      provider: "bunny",
      libraryId: "123456",
      videoId: "0f1e2d3c-4b5a-6978-8a9b-acbdcedf0123",
      title: "L1",
    });
    assert.equal(map["lesson-02"]!.provider, "bunny");
  });

  it("rejects bunny entries with bad ids", () => {
    const guid = "0f1e2d3c-4b5a-6978-8a9b-acbdcedf0123";
    assert.throws(() => validateVideosContent({ videos: { a: { provider: "bunny", libraryId: "lib", videoId: guid } } }), /libraryId must be the numeric/);
    assert.throws(() => validateVideosContent({ videos: { a: { provider: "bunny", libraryId: "1", videoId: "abc" } } }), /videoId must be the Bunny video GUID/);
    assert.throws(() => validateVideosContent({ videos: { a: { provider: "bunny", videoId: guid } } }), /libraryId/);
  });
});
