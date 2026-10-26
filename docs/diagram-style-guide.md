# News4You diagram style

Design source: `apps/dashboard/src/styles/style.css`, approved for this page by the user. This project-local guide leaves the installed skill unchanged.

## Tokens

### Semantic roles

| Role          | Light     | Dark      |
| ------------- | --------- | --------- |
| `paper`       | `#f7f6f0` | `#27372e` |
| `paper-2`     | `#eeeee5` | `#324539` |
| `ink`         | `#27372e` | `#f7f6f0` |
| `ink-strong`  | `#17271e` | `#17271e` |
| `muted`       | `#596752` | `#d1d7c8` |
| `soft`        | `#626b59` | `#c2cbb8` |
| `rule`        | `#deded4` | `#52634d` |
| `rule-solid`  | `#b9c1af` | `#76856e` |
| `accent`      | `#9b5335` | `#e1a27e` |
| `accent-tint` | `#f0e8dc` | `#4c3b30` |
| `link`        | `#254f40` | `#b4d4b0` |

The rust accent is a darker derivative of the site's `#aa603d` for small-label contrast. Decorative borders are not used as the sole carrier of meaning. Static light output is used for `/explained`.

## Typography

| Role          | Family                                            | Size                                 | Weight     |
| ------------- | ------------------------------------------------- | ------------------------------------ | ---------- |
| `title`       | Georgia, 'Times New Roman', serif                 | 28px diagram / responsive page title | 400        |
| `node-name`   | Arial, Helvetica, sans-serif                      | 12px                                 | 600        |
| `sublabel`    | ui-monospace, SFMono-Regular, Consolas, monospace | 9px                                  | 400        |
| `eyebrow`     | ui-monospace, SFMono-Regular, Consolas, monospace | 8px                                  | 500        |
| `arrow-label` | ui-monospace, SFMono-Regular, Consolas, monospace | 8px                                  | 400        |
| `callout`     | Georgia, 'Times New Roman', serif                 | 28px                                 | 400 italic |

### Font source

Font source: `system`

Georgia and Arial preserve the site's intentional system stacks. Technical labels use a new system monospace role because the site has no existing technical font. No font downloads or image requests are needed.

## Layout

Architecture overview and validation flowchart use the `doc-wide` preset: `viewBox="0 0 1280 720"`. Each SVG keeps `min-width: 1280px` inside its own keyboard-focusable horizontal scroller. Printed diagrams scale to the sheet. No animation or shadows.
