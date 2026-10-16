# Vimari 

Vim-style keyboard navigation for Safari: scroll with `j`/`k`, follow links with `f`, switch tabs with `w`/`q`, all without touching the mouse.

This is a personal fork of [televator-apps/vimari](https://github.com/televator-apps/vimari), which is itself a lightweight Safari port of [Vimium](https://github.com/philc/vimium). Upstream Vimari has not been updated since April 2021; this fork fixes scrolling problems that show up in current versions of Safari.

## What's different from upstream

| Area | Upstream Vimari | This fork |
| --- | --- | --- |
| Scroll animation | ~25 tiny `scrollBy` calls per keypress (about 400 ms) | One time-based animation, `scrollDuration` ms long (default 100 ms) |
| Pages with `scroll-behavior: smooth` CSS | `gg`/`G`/`j`/`k` stall or stop short | Every frame uses `behavior: 'instant'`, so page CSS can't interfere |
| Holding `j`/`k` | Each key repeat restarts the animation | Repeats add to where the scroll is already heading, so it doesn't lag |
| `G` on infinite feeds (e.g. YouTube) | Lands on a "bottom" that immediately moves | Follows the page down up to 3 times as more content loads |
| Native option | None | `scrollDuration: 0` uses Safari's own smooth scroll |
| Bundle IDs | `net.televator.Vimari` | `com.parun.Vimari` (so it can be signed with a personal Apple ID) |
| Minimum macOS | 10.12 (no longer builds) | 11.0 |

All changes are in `Vimari Extension/js/lib/svim-scripts.js`, `Vimari Extension/js/injected.js`, `Vimari Extension/json/defaultSettings.json`, `Vimari/ViewController.swift` and `Vimari.xcodeproj/project.pbxproj`. Run `git log` to see each change as its own commit.

## Building and installing

Requires a Mac with Xcode and a free Apple ID.

1. Clone this repo and open `Vimari.xcodeproj` in Xcode.
2. Click the **Vimari** project at the top of the sidebar. For **both** targets (**Vimari** and **Vimari Extension**), open **Signing & Capabilities** and set **Team** to your own Apple ID.
   - If you are not me, also change both **Bundle Identifier** values to your own reverse-domain prefix, and update `extensionIdentifier` in `Vimari/ViewController.swift` to match the extension's new ID. Apple IDs can't sign apps whose bundle IDs are registered to someone else.
3. Make sure the scheme next to ▶ says **Vimari › My Mac**, then press **Cmd+R**.
4. **Product → Show Build Folder in Finder → Products → Debug**, copy `Vimari.app` into **Applications**, and open it once.
5. In **Safari → Settings → Extensions**, tick **Vimari** and allow it on every website. Reload any open tabs.

If Vimari doesn't appear in Safari's list, enable **Develop → Developer Settings → Allow unsigned extensions** (turn on **Show features for web developers** under Safari → Settings → Advanced first).

Remove the App Store version of Vimari first if you have it, or the two copies will fight over the same keys.

## Configuration

Open the Vimari app and use the edit-config button to change `userSettings.json`. Reload your tabs afterwards.

The first time it runs, Vimari copies `Vimari Extension/json/defaultSettings.json` to create `userSettings.json`. After that it never re-reads the defaults file, so if you change the defaults in the repo, press the reset-config button in the Vimari app to pick them up.

### Scrolling settings

| Setting | Effect |
| --- | --- |
| `smoothScroll: false` | Instant jumps, no animation |
| `smoothScroll: true`, `scrollDuration: 100` | Fork's own animation, 100 ms per step (lower is snappier, e.g. 60–80) |
| `smoothScroll: true`, `scrollDuration: 0` | Safari's native smooth scroll: renders heavy pages best but is slower and fixed speed |
| `scrollSize` | Pixels per `j`/`k` press (default 150) |

### Other settings

| Setting | Effect |
| --- | --- |
| `openTabUrl` | Page opened by `t` |
| `excludedUrls` | Comma-separated sites where Vimari is disabled, e.g. `youtube.com,github.com` |
| `linkHintCharacters` | Characters used for `f` link labels |
| `detectByCursorStyle` | Also treat `cursor: pointer` elements as links (slower on big pages; off by default) |
| `transparentBindings` | Keys Vimari doesn't use pass through to the page |
| `modifier` | Key that must be held with every binding (blank = none) |

## Default key bindings

### In-page navigation

| Key | Action |
| --- | --- |
| `f` / `F` | Show link hints (open in current tab / new tab) |
| `j` / `k` | Scroll down / up |
| `h` / `l` | Scroll left / right |
| `d` / `u` | Scroll down / up half a page |
| `g g` | Go to top of page |
| `G` | Go to bottom of page |
| `g i` | Focus the first text input |

### Tabs and history

| Key | Action |
| --- | --- |
| `H` / `L` | History back / forward |
| `r` | Reload |
| `K` / `J` | Next / previous tab |
| `x` | Close tab |
| `t` | New tab (opens `openTabUrl`) |
| `y t` | Duplicate tab |

### Modes

| Key | Action |
| --- | --- |
| `i` | Insert mode: Vimari ignores keys so the page gets them |
| `Esc` or `Ctrl+[` | Back to normal mode |

Bindings can be changed under `"bindings"` in the config. A binding can be a single key, a sequence (`"g g"`), a modifier combo (`"shift+g"`), or a list of alternatives (`["g g", "shift+k"]`).

## Known limitations

- **Safari's start page:** Safari doesn't let any extension run on its built-in start page (Favourites / Frequently Visited). Set **Safari → Settings → General → New windows/tabs open with: Homepage** and point Homepage at a real URL to get Vimari on new tabs.
- **Heavy pages with the animation on:** On pages like YouTube, Safari may leave blank or black areas while script-driven scrolling moves the page. Set `scrollDuration` to `0` to use Safari's native smooth scroll instead, which renders properly.
- **Inner scroll areas:** Web apps that scroll an inner box instead of the page (ChatGPT, Claude, and similar) don't scroll with `j`/`k`/`gg`/`G`.
- **Reader mode:** Vimari can't run inside Safari's Reader view.

## Privacy

The extension makes no network requests. It has no `fetch`, `XMLHttpRequest` or `URLSession` calls. It does request access to every website, because it needs to listen for keys on every page.

## License

MIT, same as upstream. See [LICENSE](LICENSE). Original copyright © 2011 Guy Halford-Thompson and the Vimari contributors. Parts of the scrolling code come from [sVim](https://github.com/flipxfx/sVim) and [Vimium](https://github.com/philc/vimium).
