# HitchEdits

Single-page portfolio. Three files, no build step, no dependencies. GitHub Pages
serves it as-is.

    index.html   content
    styles.css   design
    main.js      timecode readout, waveform, grade wipe, video loading

## Adding a video

Find the ID in the YouTube URL: `youtube.com/watch?v=ABC123xyz` → `ABC123xyz`.
Paste it into the `data-yt=""` of whichever slot you want:

```html
<figure class="media" data-yt="ABC123xyz">
```

Unlisted videos work. Private ones don't. YouTube blocks those from embedding
anywhere, so use Unlisted if you don't want them turning up in search.

Nothing loads from YouTube until someone clicks play, so the page stays fast and
doesn't drop cookies on visitors.

## Adding an image

Put the file in an `images/` folder, then point a slot at it:

```html
<figure class="media square" data-img="images/still-01.jpg">
```

The colour-correction section takes two: ungraded goes in `.compare-before`,
graded in `.compare-after`.

## Empty slots

Any slot left empty shows SMPTE colour bars and `NO MEDIA LINKED`. That's
deliberate, so the page never looks broken while you're filling it in. Fill them
as you go.

## Placeholders to replace

Anything in `[square brackets]` is waiting on you:

- the line under the big HitchEdits wordmark
- `[Clip title]` / `[Still]` captions on each slot
- `[Paragraph About Myself As A Person]`
- the email in the footer, in two places: the visible text and the `mailto:`

## The timecodes

Each section carries a `data-tc` attribute. The readout in the bottom bar
starts at `00:00:00:00` at the top of the page and interpolates between them as
you scroll, ending on the last section's timecode at the bottom. If you add or
reorder sections, give them timecodes that keep climbing and it keeps working.

The bar can be dragged (or clicked, or focused and moved with the arrow keys) to
jump through the page.

## Logo

`images/logo.jpg` is the favicon. The brand gradient in `styles.css`
(`--brand-a` / `--brand-b`) was sampled from it. Swap a sharper PNG/SVG in at
the same path whenever one is available.
