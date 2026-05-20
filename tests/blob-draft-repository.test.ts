import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BlobDraftSdk } from "../lib/drafts/blob-draft-repository";
import { BlobDraftRepository } from "../lib/drafts/blob-draft-repository";
import { hashPublishedMdxSource } from "../lib/drafts/source-hash";

function utf8Stream(s: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(s));
      controller.close();
    },
  });
}

describe("BlobDraftRepository (mock SDK)", () => {
  const fakeUploadedAt = new Date("2026-05-19T12:00:00.000Z");

  it("saveDraft getDraft deleteDraft roundtrip", async () => {
    const bodies = new Map<string, string>();

    const sdk = {
      put: async (pathname: string, body: string | ReadableStream | Blob) => {
        bodies.set(pathname, typeof body === "string" ? body : "");
        return {
          pathname,
          url: `https://fake.blob.vercel-storage.com/${pathname}`,
          downloadUrl: "",
          contentType: "text/markdown",
          contentDisposition: "",
          etag: "",
        };
      },
      get: async (pathname: string) => {
        const raw = bodies.get(pathname);
        if (raw === undefined) return null;
        return {
          statusCode: 200,
          stream: utf8Stream(raw),
          headers: new Headers(),
          blob: {
            url: `https://fake.blob.vercel-storage.com/${pathname}`,
            downloadUrl: "",
            pathname,
            contentType: "text/markdown",
            contentDisposition: "",
            cacheControl: "",
            size: raw.length,
            uploadedAt: fakeUploadedAt,
            etag: "",
          },
        };
      },
      head: async (pathname: string) => ({
        url: `https://fake.blob.vercel-storage.com/${pathname}`,
        downloadUrl: "",
        pathname,
        size: 0,
        contentType: "",
        contentDisposition: "",
        cacheControl: "",
        uploadedAt: fakeUploadedAt,
        etag: "",
      }),
      del: async (pathname: string) => {
        bodies.delete(pathname);
      },
      list: async (opts: { prefix?: string }) => {
        const prefix = opts.prefix ?? "";
        const keys = [...bodies.keys()].filter((k) => k.startsWith(prefix));
        return {
          blobs: keys.map((pathname) => ({
            pathname,
            url: "",
            downloadUrl: "",
            size: 0,
            uploadedAt: fakeUploadedAt,
            etag: "",
          })),
          cursor: "",
          hasMore: false,
        };
      },
    } as BlobDraftSdk;

    const repo = new BlobDraftRepository(sdk);
    const target = {
      kind: "offeringLesson" as const,
      parentSlug: "investing-basics-2026-05",
      pageOrLessonSlug: "lesson-1",
    };
    const published = "# Published\n";
    assert.equal(await repo.getDraft(target, "u@example.org"), null);
    await repo.saveDraft(target, "u@example.org", "# Draft\n", published);
    const got = await repo.getDraft(target, "u@example.org");
    assert.ok(got);
    assert.equal(got!.source.trim(), "# Draft");
    assert.equal(got!.updatedBy, "u@example.org");
    assert.ok(got!.updatedAt.length > 10);
    assert.equal(got!.baseHash, hashPublishedMdxSource(published));
    await repo.deleteDraft(target, "u@example.org");
    assert.equal(await repo.getDraft(target, "u@example.org"), null);
  });

  it("listDraftsForAdmin gathers blobs for one admin basename", async () => {
    const bodies = new Map<string, string>();

    const sdk = {
      put: async (pathname: string, body: string | ReadableStream | Blob) => {
        bodies.set(pathname, typeof body === "string" ? body : "");
        return {
          pathname,
          url: `https://fake.blob.vercel-storage.com/${pathname}`,
          downloadUrl: "",
          contentType: "",
          contentDisposition: "",
          etag: "",
        };
      },
      get: async (pathname: string) => {
        const raw = bodies.get(pathname);
        if (raw === undefined) return null;
        return {
          statusCode: 200,
          stream: utf8Stream(raw),
          headers: new Headers(),
          blob: {
            url: `https://fake.blob.vercel-storage.com/${pathname}`,
            downloadUrl: "",
            pathname,
            contentType: "",
            contentDisposition: "",
            cacheControl: "",
            size: raw.length,
            uploadedAt: fakeUploadedAt,
            etag: "",
          },
        };
      },
      head: async (pathname: string) => ({
        url: `https://fake.blob.vercel-storage.com/${pathname}`,
        downloadUrl: "",
        pathname,
        size: 0,
        contentType: "",
        contentDisposition: "",
        cacheControl: "",
        uploadedAt: fakeUploadedAt,
        etag: "",
      }),
      del: async () => {},
      list: async (opts: { prefix?: string }) => {
        const prefix = opts.prefix ?? "";
        const keys = [...bodies.keys()].filter((k) => k.startsWith(prefix));
        return {
          blobs: keys.map((pathname) => ({
            pathname,
            url: "",
            downloadUrl: "",
            size: 0,
            uploadedAt: fakeUploadedAt,
            etag: "",
          })),
          cursor: "",
          hasMore: false,
        };
      },
    } as BlobDraftSdk;

    const repo = new BlobDraftRepository(sdk);
    const email = "alice@example.com";
    await repo.saveDraft(
      { kind: "offeringLesson", parentSlug: "o1", pageOrLessonSlug: "les-a" },
      email,
      "OA",
      "pa\n"
    );
    await repo.saveDraft(
      { kind: "sitePage", parentSlug: "s1", pageOrLessonSlug: "about" },
      email,
      "SB",
      "pb\n"
    );

    const listed = await repo.listDraftsForAdmin(email);
    assert.equal(listed.length, 2);
    assert.equal(listed.some((r) => r.kind === "offeringLesson" && r.source === "OA"), true);
    assert.equal(listed.some((r) => r.kind === "sitePage" && r.source === "SB"), true);
  });
});
