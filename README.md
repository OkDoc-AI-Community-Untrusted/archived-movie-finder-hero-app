# Archive Film Finder Hero App

An OkDoc iframe plugin that lets users search and watch public-domain films from the Internet Archive. Built with Angular 21 and Tailwind CSS.

## Features

- Search the Internet Archive film collection
- Stream videos with playback speed, quality, and volume controls
- Responsive design optimized for small iframe embeds
- Focus mode for distraction-free viewing
- OkDoc SDK integration with 14 registered tools for AI-driven control

## Run Locally

**Prerequisites:** Node.js 22+

```bash
npm install
npm start
```

The app runs at `http://localhost:4200`.

## Build

```bash
npx ng build
```

Output is written to `dist/app/browser`.

## Deploy

Push to `main` to trigger the GitHub Actions workflow, which builds and deploys to GitHub Pages.

## OkDoc SDK Integration

This app registers tools with the OkDoc iframe SDK so an AI assistant can control playback:

`search_films`, `select_film`, `play`, `pause`, `skip_forward`, `skip_backward`, `volume_up`, `volume_down`, `toggle_mute`, `set_playback_rate`, `set_quality`, `clear`, `close`, `toggle_focus_mode`, `toggle_fullscreen`

See [IframePluginGuide.md](IframePluginGuide.md) for SDK details.
