# Karshyga Aknur — portfolio site

Single-page portfolio of Karshyga Aknur (Қаршыға Ақнұр), a teacher of Kazakh language and literature.
Plain HTML, CSS and JavaScript: no framework, no build step.

## Structure

```
index.html            the whole site
assets/styles.css     styles
assets/main.js        interactions (menu, quiz, presentation viewer, gallery)
assets/i18n.js        Kazakh → Russian / English dictionary and language switch
assets/decks/         presentation slides (full size + -sm previews, WebP)
assets/events/        photos from lessons and school events
assets/cert/          certificate image (personal numbers redacted)
assets/cv/            CV as PDF (download button on the site)
assets/og-image.png   link preview image
```

## Languages

Kazakh is the source language written in `index.html`. Russian and English come from `assets/i18n.js`.
Pick a language with the switch in the header or with a URL parameter: `?lang=kk`, `?lang=ru`, `?lang=en`.
The choice is remembered in `localStorage`.

To add or change a translation, edit `DICT` in `assets/i18n.js`: the key is the exact Kazakh text,
the value is `[russian, english]`.

## Run locally

```
python -m http.server 5173
```

Then open http://localhost:5173.

## Before going live

- `index.html` has `<meta name="robots" content="noindex, nofollow">`. Once the site has its own domain,
  change it to `index, follow` and add a canonical link.
- After changing CSS or JS, bump the `?v=` number on its `<link>` / `<script>` tag so browsers fetch the new file.
