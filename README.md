# How to Run

Three tools, each a single HTML file. There's nothing to install or build. Use **Chrome or Edge** if you want edits to auto-save to the JSON files.

| Tool | File | Data |
|------|------|------|
| Literature | `literature.html` | `literature.json` |
| Knowledge | `knowledge.html` | `knowledge.json` |
| Worklist | `worklist.html` | `worklist.json` |

## Start

```bash
cd /Users/bayrakrg/Documents/personal/knowledge
python3 -m http.server 8000
```

Then open one of these:
- http://localhost:8000/literature.html
- http://localhost:8000/knowledge.html
- http://localhost:8000/worklist.html

Press `Ctrl+C` in the terminal to stop the server.

You can also skip the server and open a file directly, e.g. `open literature.html`. The page won't load its JSON file automatically, though, so you'll need to click **📂 Open** once.

## Saving

### How it works now
Every change is saved to the **browser** right away (localStorage). Browser storage belongs to one browser profile and one address: `localhost:8000` and a file opened directly are different addresses, so each has its own data. Clearing site data erases it.

All three tools can also auto-save to their JSON file once it's linked (below).

### The buttons
| Button | What it does |
|--------|-------------|
| **📂 Open** | Loads a JSON file. If it differs from what's on screen, you choose **Merge** (keep both; for items in both, the more recently edited wins), **Replace**, or **Cancel**. In Chrome/Edge it also links that file, so later changes auto-save to it. |
| **💾 Save** (`Ctrl/Cmd+S`) | Linked: writes to the file now. Not linked: asks where to save and links that file. Firefox/Safari: downloads a copy. |
| **⬇ Export** | Downloads a copy. It doesn't link anything or change the linked file. Use it for backups. |

**Nothing is lost silently.** Whenever opening a file or loading on startup would change what's on screen, the current work is backed up first. An **Undo** button appears right away, and **↶ Backups** in the status bar keeps the last 5. On startup, whichever is newer (browser copy or file) wins.

### To save consistently
1. Use Chrome or Edge, and always open the tool from the same address (e.g. `http://localhost:8000/...`).
2. One time: click **📂 Open** and pick the tool's JSON file (`literature.json` / `knowledge.json` / `worklist.json`). The file name shows in the header.
3. Done. Every change now auto-saves to the file, and the file stays linked after reloads.
4. If an amber banner appears after a browser restart, click it once to restore auto-save.

Firefox and Safari can't write to files: use **⬇ Export** and replace the JSON file yourself.