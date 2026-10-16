# KBT-dagbok

A small installable web app (PWA) for logging social situations during a CBT course for social phobia. Each entry has the fields from the course worksheet: Datum, Situation, Tanke, Känsla och kropp, Tankehantering and Utvärdering. The app has no build step and no backend. It's plain HTML, CSS and JavaScript.

Entries are stored only on the phone, in the browser's storage for the site's address. Nothing is sent anywhere.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Page shell |
| `styles.css` | All styling |
| `app.js` | Screens, storage, drafts, export/import |
| `manifest.webmanifest` | Makes the app installable (name, icons, colours) |
| `sw.js` | Service worker: offline support |
| `icons/` | App icons |

## Run it on your computer

From this folder:

```bash
python -m http.server 8000
```

Then open http://localhost:8000. Use the browser's phone view (F12 → device toolbar) to see it at phone size.

## Put it online (GitHub Pages, free)

The app must be served over HTTPS for Android to install it. GitHub Pages is the simplest free option.

1. Create a GitHub account if you don't have one, then create a new **public** repository, for example `kbt-dagbok`. A free account needs the repository to be public for Pages. Only the app's code is public. Your entries never leave your phone.
2. On the repository page, choose **Add file → Upload files** and drag in `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest` and the `icons` folder. Commit.
3. Go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute the app is live at `https://<your-username>.github.io/kbt-dagbok/`.

If you'd rather not use git or GitHub, Netlify Drop (app.netlify.com/drop) also works: drag the folder onto the page. You need a free account to keep the site.

## Install on Android

1. Open the app's address in **Chrome**.
2. Tap **⋮ → Installera app** (on some phones: **Lägg till på startskärmen**).
3. Open it from the home screen. It runs full screen and works offline.

## Updating the app

The app is live at https://mindbogglegames.github.io/kbt-dagbok/, published from `main` in [mindbogglegames/kbt-dagbok](https://github.com/mindbogglegames/kbt-dagbok). To update it, commit and push to `main`, or upload the changed files on GitHub. The next time you open the app with an internet connection, it loads the new version. Offline, it uses the last version it saved. GitHub Pages can take a few minutes to publish a change.

**Updates don't touch your entries.** The entries are stored separately from the app's files, under the site's address. The stored data carries a version number, so if a future update changes the format, the app converts old entries instead of discarding them. If the app ever can't read what's stored, it shows a warning and refuses to save, so it never overwrites the existing data.

## What can delete your entries

- **Moving the app to a different address**, for example another GitHub username or another host. A new address starts empty. Export first, then import at the new address.
- **Clearing Chrome's data for the site**, or clearing browsing data with *Cookies och webbplatsdata* selected.
- **Uninstalling Chrome or resetting the phone.** Uninstalling the home-screen app may also remove them. Export first to be safe.

## Backups

On the list screen, **Exportera** downloads a `kbt-dagbok-YYYY-MM-DD.json` file to the phone's Downloads folder. Copy it somewhere safe now and then, for example Google Drive. **Importera** reads such a file back. It adds entries that are missing and updates an entry only when the file has a newer version of it. It never deletes anything.
