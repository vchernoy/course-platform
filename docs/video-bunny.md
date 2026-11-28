# Lesson recordings with Bunny Stream

Lesson recordings (Zoom, 200–400 MB, 2–4 h) are hosted on [Bunny Stream](https://bunny.net/stream/) and played in lessons with `<VideoPlayer>`. Only enrolled students get a working player: the lesson page checks enrollment, then signs a short-lived embed link on the server. Tracking issue: #4. Related: [MDX authoring](./mdx-authoring.md#videoplayer), [Content layout](./content-layout.md#videosyaml).

## One-time setup (per Bunny library)

1. **Create a video library** in the Bunny dashboard: Stream → Add Video Library. Pick the main region your students are in. One library per customer is a good default.
2. **Encoding** (library → Encoding): limit output resolutions to **720p and lower**. Zoom screen recordings don't benefit from 1080p, and the cap keeps the bandwidth bill low.
3. **Security** (library → Security):
   - **Embed view token authentication: on.** Without a valid `token` + `expires`, the player shows 403.
   - **CDN token authentication: on.** This protects the stream files themselves (HLS playlists and segments), so a stream URL copied from the browser can't be shared.
   - **Allowed domains:** `course-platform.vchernoy.xyz` (plus `localhost` while testing locally).
   - **Direct play / MP4 fallback: off**, so there's no downloadable MP4 URL.
4. **Copy the token key.** In the same Security page, "Token authentication key": add it in Vercel (Project → Settings → Environment Variables, Production + Preview, *Sensitive*) as:
   - `BUNNY_STREAM_TOKEN_KEY`: used for every library, **or**
   - `BUNNY_STREAM_TOKEN_KEY_<libraryId>`: a key for one library. This variant wins, so each customer can have their own library and key.
   - Optional `BUNNY_STREAM_TOKEN_TTL_SECONDS` (default `21600` = 6 h, allowed 60 s to 24 h). This is how long a page's player link keeps working; it needs to cover a full viewing.

   The key must never go in `videos.yaml`, MDX or any repository.
5. **Register the library with its customer** in `config/sources.yaml` of the platform repo:

   ```yaml
   customers:
     - id: vchernoy
       bunnyLibraries: ["123456"]   # Bunny library ids this customer owns
       sources: [...]
   ```

   Links are signed only for a lesson whose offering belongs to the customer listing the library. A library can be listed by one customer only. An unlisted library renders unsigned (and won't play with token auth on), so one customer's content or admin preview can never mint links to another customer's recordings.
6. **Redeploy** so the variable and config take effect.

## Adding a recording (each lesson)

1. Upload the Zoom MP4 to the library (Videos → Upload), and wait until encoding finishes.
2. Open the video and copy its **Video ID** (a GUID). The **Library ID** is shown on the library's API page.
3. Add an entry to the offering's `videos.yaml`:

   ```yaml
   videos:
     lesson-01-recording:
       provider: bunny
       libraryId: "123456"
       videoId: "0f1e2d3c-4b5a-6978-8a9b-acbdcedf0123"
       title: "Lesson 1 recording"
   ```

4. Reference it in the lesson MDX:

   ```mdx
   <VideoPlayer assetId="lesson-01-recording" />
   ```

5. Commit and push the content repo. No code change is needed per video.

## How the protection works

- **Lesson access:** the lesson route renders only for an enrolled student (Clerk sign-in + `students.yaml`). `VideoPlayer` is a server component, so the signing happens on the server after that check, and the key never reaches the browser.
- **Customer scope:** the player is told which customer the lesson's offering belongs to, by server code (MDX props can't set it). It signs only for libraries in that customer's `bunnyLibraries`. This also covers admin preview, which renders submitted MDX.
- **Embed link:** `https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}?token=…&expires=…`, where `token = SHA256_HEX(key + videoId + expires)` ([Bunny docs](https://docs.bunny.net/stream/token-authentication)). After `expires`, the link stops working, so a link copied out of the page is only useful for a few hours.
- **Stream files:** CDN token authentication covers the HLS files the player loads ([Bunny docs](https://docs.bunny.net/cdn/security/token-authentication/advanced)).
- **Validation:** library and video ids are validated (numeric library id, GUID video id), so content can't point the player anywhere else.
- **Not signed:** a library outside the lesson's customer logs `bunny_library_not_in_scope`. With a missing key, the player still renders an unsigned link and logs `bunny_unsigned_embed`. That only plays while the library has token authentication **off**, which means the video is effectively public. Keep token auth on for paid courses.

This is not DRM: an enrolled student can still screen-record. Bunny offers DRM (MediaCage) as a paid add-on if that ever matters.

## Checks to run on a real library

Do these once per library after setup, and again if security settings change:

1. Signed in as an enrolled student, the lesson video plays.
2. Opening the embed URL **without** `token`/`expires` returns 403.
3. A copied embed URL stops working after `expires`. To test quickly, set `BUNNY_STREAM_TOKEN_TTL_SECONDS=60`, then restore it.
4. The `.m3u8` playlist URL seen in the browser's network tab fails when opened without a CDN token or from another site.
5. Signed out, or as a non-enrolled user, the lesson page itself is refused, so no signed link is ever produced.

## Cost

Bunny bills per GB: about $0.01/GB stored per month and $0.01/GB delivered in North America and Europe, with a $1/month minimum and free standard encoding. For one course (50 students, 9 recordings, each watched twice, 4 months), the estimate is **$4–25** in total, against about $200 on Cloudflare Stream. The working is in #4.

## Uploading from the admin UI

Not yet: uploads happen in the Bunny dashboard. Uploading through Bunny's TUS API from `/admin` is tracked in #20.
