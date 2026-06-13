# Content pages: Roadmap & Changelog

Two static content pages, **linked only from the footer** (not the main nav).

| Route | View | Content source |
|---|---|---|
| `GET /roadmap` | `views/roadmap.ejs` | `content/roadmap.js` |
| `GET /changelog` | `views/changelog.ejs` | `content/changelog.js` |

Both render inside `views/layouts/main.ejs` and reuse two partials:
`views/partials/page-header.ejs` (slim header: logo home + "Get early access") and
`views/partials/footer.ejs` (the shared footer carrying the Roadmap / Changelog / Contact
links). The page `<title>` is set per route via the `pageTitle` local.

## Editing the roadmap

Edit `content/roadmap.js`. It exports `{ intro, sections[] }`; each section has
`{ title, items[] }`; each item is `{ status, title, desc }` where **status** is one of:

- `done` — green checkbox, "Done" badge
- `active` — amber box, "In progress" badge
- `planned` — empty box, "Planned" badge

The per-section count (e.g. `3/3`) is computed from how many items are `done`.

## Editing the changelog

Edit `content/changelog.js`. It exports an array of entries, **newest first**:
`{ date: 'YYYY-MM-DD', title, changes[] }`; each change is `{ tag, text }` where **tag**
is one of `new` (green), `improved` (blue), `fixed` (amber). Dates are formatted for
display automatically (e.g. `13 Jun 2026`).

## Notes

- No build step and no new dependencies: routes `require()` the data module and pass it to EJS.
- Changes to either data file take effect after a deploy (`git pull` + app restart), since
  `require` caches the module.
- Copy follows the project voice: direct, no em dashes, no marketing buzzwords.
