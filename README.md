# HitchEdits

Single-page portfolio. Three files, no build step, no dependencies. GitHub Pages
serves it as-is.

    index.html   content
    styles.css   design
    main.js      timecode readout, audio comparison, grade wipe, video loading

## Adding a video

Find the ID in the YouTube URL: `youtube.com/watch?v=ABC123xyz` → `ABC123xyz`.
Paste it into the `data-yt=""` of whichever slot you want:

```html
<figure class="media" data-yt="ABC123xyz">
```

Unlisted videos work. Private ones don't. YouTube blocks those from embedding
anywhere, so use Unlisted if you don't want them turning up in search.

YouTube thumbnails load for linked videos. The embedded player loads only after
someone clicks play, using the youtube-nocookie.com domain.

## Audio comparison

The audio section uses `audio/Audio_Example_Original.wav` and
`audio/Audio_Example_Fixed.wav`. Original and Fixed share the play button and seek
control; switching versions keeps the current playback position and stops the
previous version. Both files are stereo 48 kHz WAVs, about 31 seconds each.
Playback stops at the end of the shorter file.

The waveform paths in `index.html` were measured from these recordings. Update
them when replacing the audio. They are static, so the browser doesn't need to
decode both files to draw them. Native audio controls remain available when
JavaScript is disabled.

## Adding an image

Put the file in an `images/` folder, then point a slot at it:

```html
<figure class="media square" data-img="images/still-01.jpg">
```

The colour-correction section takes two: ungraded goes in `.compare-before`,
graded in `.compare-after`. Use the same frame, same size, for both. It
currently points at `images/placeholder-ungraded.jpg` and
`images/placeholder-graded.jpg`. Those are generated test images, so replace
them and delete the files.

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
jump through the page. Each section gets a tick on the bar, and its name shows
above the playhead while scrubbing. The name comes from the section's `<h2>`,
or from `data-name="..."` if the section has no heading.

## Logo

`images/logo.jpg` is the favicon. The brand gradient in `styles.css`
(`--brand-a` / `--brand-b`) was sampled from it. Swap a sharper PNG/SVG in at
the same path whenever one is available.

## Link preview

`images/og.jpg` (1200×630) is what shows when the site is shared on WhatsApp,
Discord, iMessage, X, etc. The `og:image` tag in `index.html` uses the full URL
`https://hitchedits.github.io/images/og.jpg`. If the site moves to a custom
domain, update that URL and `og:url`.
