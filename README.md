# TrunkSketch

Browser floor-plan editor for communication trunks, loop-off cable runs, device points, and vector PDF markups.

## Open the app

[Launch TrunkSketch](https://therealcrispy.github.io/trunksketch/)

Use **Open PDF** to load plans, or **Open project** for a `.trunks` file. PDFs and project data are processed in your browser and are not uploaded to GitHub. This repository deliberately excludes plan PDFs and user projects.

On iPhone, use Safari → Share → Add to Home Screen. On Android, use the browser menu → Add to Home screen. **Plans** opens the page/building list, **Settings** opens item controls, **Pan** moves a zoomed plan, and **Finish** ends a line without a keyboard.

## Continue work on another device

Choose **Save project** on the first device, transfer the `.trunks` file using Files/AirDrop/a storage service of your choice, then **Open project** on the other device. The file contains the PDF, markups, labels, and building groups.

Browser autosave is local to each device and website address. It is not a cloud backup. Supabase backup is not connected. Keep portable project copies until a private authenticated backup service is configured.

## Tools

- Edit: move points and route handles; drag labels independently; double-click markers to rename.
- Pan: drag to move around the plan; + / − / Fit change zoom.
- Points and EOL: place regular or end-of-line device markers.
- Route / Central trunk: tap each turn; a central trunk can pass through regular points and finishes at EOL.
- Loop off: draw paired cable legs from a central trunk to a point. EOL creates a one-way final run.
- Floor link: dotted connection for floor transitions.
- Finish / Enter: finish at the last tapped location. Cancel / Escape discards an unfinished route.
- Settings: free-angle routing, name visibility, individual labels, widths, spacing and defaults.
- Building groups: manually group page numbers under collapsible buildings.

## Run locally

Requires Node.js 22 or later:

```sh
npm ci
npm start
```

Then open http://127.0.0.1:8765/ and load your PDF or project. On macOS you can double-click `Launch.command`.

## Tests

```sh
node --check app.js
node test.cjs
```

PDF.js 5.6.205 and pdf-lib 1.17.1 are pinned in the package lock. The build bundles them under `site/vendor/` with their upstream licenses. GitHub Pages deploys this static build automatically after tests pass. PDF export adds vector markings to the original PDF pages rather than rasterizing them. This is a drawing aid; verify cable topology and field conditions.

Phone file picker: use Open project inside TrunkSketch, then Browse to the saved .trunks file in Files or Downloads. The picker allows all file types because iOS can disable custom extensions when a file filter is applied. The app checks the project format after selection.
