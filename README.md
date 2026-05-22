# OHZI GLB Viewer Web

This is the web app for the OHZI GLB Viewer.

Explore, look, and inspect your GLB models with detailed material, texture, geometry, and animation analysis.

![OHZI GLB Viewer Web](https://github.com/ohzinteractive/glb-viewer-web/blob/main/public/images/previews/preview-13.0.0.jpg?raw=true)

## Features

### 🎨 Material Inspection
- View and inspect all materials in your GLB model
- Detailed material properties and parameters

### 🖼️ Texture Viewer
- Preview all textures embedded in your model
- Support for compressed textures (Basis Universal, Draco)
- Texture details and metadata

### 📐 Geometry Analysis
- Inspect mesh geometries and their attributes
- View vertex counts, indices, and buffer information
- Geometry hierarchy visualization

### 🎬 Animation Controls
- Play, pause, and scrub through animations
- Support for multiple animation tracks

### 🌳 Scene Hierarchy
- Interactive scene tree view
- Search scene nodes
- Node selection and inspection

### ⚙️ Advanced Settings
- Skeleton visualization for rigged models

## Prerequisites

Before you begin, ensure you have met the following requirements:
* You have installed the following version of
    1. Node.js: `18.x.x`
    2. Git: `2.x.x`
    3. pnpm: latest (recommended)

## Building GLB Viewer Web

To build GLB Viewer Web, follow these steps:

1. Build the application: `pnpm run build`
2. You'll find the built project on `dist` folder.
3. You can test the build going to the dist folder with `http-server -c-1`

## Deploying to GitHub Pages

This repository now builds with a configurable base path, so it can be published as a static site on GitHub Pages without breaking asset URLs.

1. Push the repository to GitHub.
2. In the repository settings, set Pages source to GitHub Actions.
3. Keep the default branch as `main` or update `.github/workflows/deploy.yml` to match your branch.
4. Every push to `main` will build `dist` and deploy it automatically.
5. The workflow sets `VITE_BASE_PATH` automatically to `/<repo-name>/`, which matches the GitHub Pages project URL.

If you want to publish manually, run `pnpm run build` and upload the `dist` folder to any static host.

## Committing and Pushing changes

When making changes in the GLB Core Submodule, you can use the VS Code extension to choose to commit changes to the web app or the core submodule.
The order is:
 1st Commit and push changes to the core submodule (make sure to sync before)
 2nd Commit and push changes to the web app with the core submodule hash changed


## Contact

If you want to contact us you can reach us at `support@ohzi.io`.

## License

This project uses the following license: MIT.
