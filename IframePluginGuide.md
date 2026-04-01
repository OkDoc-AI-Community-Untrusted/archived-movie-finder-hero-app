# OkDoc Iframe Plugin Developer Guide

Turn **any web page** into an OkDoc plugin. Iframe plugins run inside a sandboxed `<iframe>` — no build tools, no Angular, no npm required. Just add a single `<script>` tag from CDN, declare your tools, and the AI can call them.

> **Prerequisites:** None — works with any web project (plain HTML, Angular, React, etc.).
> If you need help creating an Ionic / Angular project first, see [IonicAngularProjectSetup.md](IonicAngularProjectSetup.md).

---

## What You Need

A single `<script>` tag in your HTML — nothing to download or install:

```html
<script src="https://cdn.jsdelivr.net/gh/okDoc-ai/plugin-sdk@1/cdn/okdoc-iframe-sdk.js"></script>
```

This loads the iframe SDK from CDN and adds the global `OkDoc` object to your page (~2 KB, zero dependencies).

> **Versioning:** `@1` in the url pins to the latest v1.x release (recommended). Use `@latest` for bleeding-edge, or any fixed version like `@1.3.0` for an exact version.

---

## Quick Start (Plain HTML)

### 1. Add the SDK via CDN and register tools

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Weather Plugin</title>
  <script src="https://cdn.jsdelivr.net/gh/okDoc-ai/plugin-sdk@1/cdn/okdoc-iframe-sdk.js"></script>
</head>
<body>
  <h1>Weather Plugin</h1>
  <script>
    // Step 1: Initialize
    OkDoc.init({
      id: 'my-weather-plugin',
      name: 'Weather Tools',
      namespace: 'weather',
      version: '1.0.0',
      description: 'Provides real-time weather data',
      icon: 'cloud-outline',
      mode: 'background',
      author: { name: 'Acme Corp', url: 'https://acme.example.com' },
    });

    // Step 2: Register tools
    OkDoc.registerTool('get_weather', {
      description: 'Get current weather for a city',
      inputSchema: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name' },
          units: {
            type: 'string',
            description: 'Temperature units',
            enum: ['celsius', 'fahrenheit'],
          },
        },
        required: ['city'],
      },
      handler: async (args) => {
        const res = await fetch(
          `https://api.example.com/weather?city=${encodeURIComponent(String(args.city))}`
        );
        const data = await res.json();
        return {
          content: [{ type: 'text', text: `Weather in ${args.city}: ${data.temp}° ${data.condition}` }],
        };
      },
    });
  </script>
</body>
</html>
```

### 2. Serve and load

```bash
npx http-server . --cors -p 8080
```

Open OkDoc → Settings → Plugin Store → paste `http://localhost:8080/index.html` → select **Web Page** mode → **Load**.

---

## Quick Start (Angular / TypeScript)

### Approach A: No type checking — just include and implement

The simplest approach. Include the CDN script and use `OkDoc` via `(window as any).OkDoc`. No downloads, no type definitions needed.

#### 1. Add the SDK script to `src/index.html`

```html
<script src="https://cdn.jsdelivr.net/gh/okDoc-ai/plugin-sdk@1/cdn/okdoc-iframe-sdk.js"></script>
```

#### 2. Use the global `OkDoc` in your component

```typescript
// src/app/app.ts (or any component)
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `<h1>Audio Player Plugin</h1>`,
})
export class App implements OnInit {
  ngOnInit(): void {
    const OkDoc = (window as any).OkDoc;
    if (typeof OkDoc === 'undefined') return;

    OkDoc.init({
      id: 'audio-player',
      name: 'Audio Player',
      namespace: 'audio',
      version: '1.0.0',
      description: 'Play and control audio tracks',
      icon: 'musical-notes-outline',
      mode: 'foreground',
      author: { name: 'Your Name', url: 'https://your-website.com' },
    });

    OkDoc.registerTool('play', {
      description: 'Play the current audio track',
      handler: async () => {
        // your play logic here
        return { content: [{ type: 'text', text: 'Playing audio.' }] };
      },
    });

    OkDoc.registerTool('set_url', {
      description: 'Set the audio source URL',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL of the audio file' },
        },
        required: ['url'],
      },
      handler: async (args) => {
        const url = String(args.url);
        // your setUrl logic here
        return { content: [{ type: 'text', text: `Audio source set to: ${url}` }] };
      },
    });
  }
}
```

This works perfectly — just follow the API reference below for the correct shapes. If you're using an AI coding assistant, point it to the type definitions URL so it knows the exact API:

```
https://cdn.jsdelivr.net/gh/okDoc-ai/plugin-sdk@1/cdn/okdoc-iframe-sdk-global.d.ts
```

---

### Approach B: Full type checking with TypeScript definitions

For IntelliSense and compile-time validation, download the `.d.ts` file once and reference it in your project.

#### 1. Add the SDK script to `src/index.html` (same as Approach A)

```html
<script src="https://cdn.jsdelivr.net/gh/okDoc-ai/plugin-sdk@1/cdn/okdoc-iframe-sdk.js"></script>
```

#### 2. Download the type definitions

Save the `.d.ts` file into your `src/` directory (or any directory included in your `tsconfig.json` `"include"` array):

```bash
curl -o src/okdoc-iframe-sdk-global.d.ts \
  https://cdn.jsdelivr.net/gh/okDoc-ai/plugin-sdk@1/cdn/okdoc-iframe-sdk-global.d.ts
```

Your project structure:

```
your-project/
├── src/
│   ├── okdoc-iframe-sdk-global.d.ts    ← type definitions
│   ├── index.html                       ← has the CDN <script> tag
│   └── app/
│       └── app.ts
└── tsconfig.json
```

#### 3. Use the global `OkDoc` API directly — TypeScript recognizes it

```typescript
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `<h1>Audio Player Plugin</h1>`,
})
export class App implements OnInit {
  ngOnInit(): void {
    OkDoc.init({
      id: 'audio-player',
      name: 'Audio Player',
      namespace: 'audio',
      version: '1.0.0',
      description: 'Play and control audio tracks',
      icon: 'musical-notes-outline',
      mode: 'foreground',
      author: { name: 'Your Name', url: 'https://your-website.com' },
    });

    OkDoc.registerTool('play', {
      description: 'Play the current audio track',
      handler: async () => {
        return { content: [{ type: 'text', text: 'Playing audio.' }] };
      },
    });

    OkDoc.registerTool('set_url', {
      description: 'Set the audio source URL',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL of the audio file' },
        },
        required: ['url'],
      },
      handler: async (args) => {
        const url = String(args.url);
        return { content: [{ type: 'text', text: `Audio source set to: ${url}` }] };
      },
    });
  }
}
```

TypeScript will recognize `OkDoc` as a global variable with full IntelliSense — no imports needed.

---

## Naming Conventions

You do **not** need to add any prefix to your plugin `id` or `namespace` — the SDK handles it automatically.

| Field | Convention | Example |
|-------|-----------|--------|
| `id` | `<company>-<plugin>` | `'acme-weather'` |
| `namespace` | `<company>_<plugin>` (underscores) | `'acme_weather'` |
| `name` | Free-form display name | `'Acme Weather'` |
| `author` | `{ name, url }` or `{ name, email }` | `{ name: 'Acme Corp', url: 'https://acme.com' }` |

> **Automatic prefixing:** The SDK automatically prepends `odci_` (iframe) or `odcp_` (packaged) to your namespace. For example, `namespace: 'acme_weather'` becomes `odci_acme_weather` for iframe plugins or `odcp_acme_weather` for packaged Angular plugins.
>
> Hyphens in the namespace are automatically converted to underscores.

---

## Full API Reference

### `OkDoc.init(options)`

Initialize the plugin. **Must be called before `registerTool()`.**

| Field         | Type     | Required | Description |
|---------------|----------|----------|-------------|
| `id`          | string   | ✅       | Unique plugin identifier |
| `name`        | string   | ✅       | Display name shown in Plugin Store |
| `namespace`   | string   | ✅       | MCP namespace prefix for all tools (SDK auto-prefixes `odci_`) |
| `version`     | string   | ✅       | Semver version (e.g. `'1.0.0'`) |
| `description` | string   | ❌       | Short plugin description |
| `icon`        | string   | ❌       | Ionicon name (e.g. `'globe-outline'`). Browse icons at [ionic.io/ionicons](https://ionic.io/ionicons) |
| `mode`        | string   | ❌       | `'background'` (default) or `'foreground'` |
| `author`      | object   | ✅       | Plugin author info: `{ name: string, email?: string, url?: string }`. Must include `name` and at least one of `email` or `url`. |

> **Validation:** `id`, `name`, `namespace`, `version`, and `author` (with `name` + `email` or `url`) are required. The SDK throws at runtime if any are missing or empty.
>
> **Namespace prefixing:** The SDK automatically prepends `odci_` (iframe community untrusted) to the namespace you provide. Hyphens are converted to underscores.
>
> **SDK version:** The SDK automatically includes its own version in the plugin manifest — you don't need to set it manually.

### `OkDoc.registerTool(name, config)`

Register a tool that the AI can invoke.

| Field                  | Type     | Required | Description |
|------------------------|----------|----------|-------------|
| `name`                 | string   | ✅       | Tool name (the AI sees `{namespace}_{name}`) |
| `config.description`   | string   | ✅       | Human-readable description for the AI |
| `config.inputSchema`   | object   | ❌       | JSON Schema for arguments |
| `config.annotations`   | object   | ❌       | Tool hints (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) |
| `config.handler`       | function | ✅       | `async (args: Record<string, unknown>) => ToolResult` |

**Tool naming:** A tool registered as `get_weather` in namespace `weather` becomes `odci_weather_get_weather` when the AI sees it (the SDK auto-prepends `odci_` to the namespace).

### Handler return format (`ToolResult`)

```typescript
{
  content: ContentBlock[];       // At least one content block
  structuredContent?: Record<string, unknown>;  // Optional structured data
  isError?: boolean;             // true if the tool call failed
}
```

**ContentBlock types:**

| `type` | Fields | Description |
|--------|--------|-------------|
| `'text'` | `text` | Plain text response |
| `'image'` | `data`, `mimeType` | Base64-encoded image |
| `'audio'` | `data`, `mimeType` | Base64-encoded audio |
| `'resource'` | `resource: { uri, mimeType?, text?, blob? }` | Embedded resource |
| `'resource_link'` | `uri`, `name?`, `description?` | Link to a resource |

### `OkDoc.notify(message)`

Send a push notification to the AI conversation (only works after the host has connected).

```javascript
OkDoc.notify('Alert: Audio track finished playing.');
```

### `OkDoc.destroy()`

Clean up the SDK: remove event listeners, close the MessageChannel port, clear state. Called automatically when the iframe is destroyed, but you can call it manually for cleanup.

### `OkDoc.version`

The iframe protocol version this SDK implements (currently `2`).

### `OkDoc.mcpProtocolVersion`

The MCP protocol version this SDK targets (currently `'2025-03-26'`).

---

## Plugin Modes

| Mode | Description | Iframe Visibility |
|------|-------------|-------------------|
| `'background'` | Tool-only — no visible UI | Hidden (default) |
| `'foreground'` | Tools + visible UI panel | Shown in plugin outlet area |

**Background plugins** appear in the Plugin Store with a **"Running"** badge and a stop button when active. Stopping destroys the iframe but keeps tools registered — they re-activate on the next tool call.

**Foreground plugins** render in the main app area. The iframe gets 100% width and default height. A header bar with the plugin name, minimize, and exit buttons is added by the host.

---

## Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                        DISCOVERY                                  │
│  1. User pastes URL in Plugin Store (Web Page mode)              │
│  2. Host creates hidden iframe → loads your page                 │
│  3. Host sends handshake via postMessage with MessageChannel     │
│  4. SDK responds with manifest + tool declarations               │
│  5. Host registers tools (metadata only) → destroys iframe       │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                  ACTIVATION (on first tool call)                  │
│  1. AI calls a tool → host re-creates iframe → re-handshakes    │
│  2. Host sends tool call via MessageChannel port                 │
│  3. SDK routes to registered handler → returns result            │
│  4. Iframe stays alive for subsequent calls                      │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                        STOP / DISABLE                            │
│  • Stop: Iframe destroyed, tools stay registered (lazy reactivation) │
│  • Disable: Iframe destroyed, tools unregistered                 │
│  • Remove: Everything cleaned up, URL forgotten                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Communication Protocol (Advanced)

The host and iframe communicate via **MessageChannel** — a private port pair that prevents cross-talk between plugins.

| Direction | Message Type | When |
|-----------|-------------|------|
| Host → iframe | `okdoc:handshake` (via `postMessage` with `port2`) | On iframe load |
| iframe → Host | `okdoc:manifest` (via port) | Response to handshake |
| Host → iframe | `okdoc:call` (via port) | AI calls a tool |
| iframe → Host | `okdoc:result` (via port) | Tool execution result |
| iframe → Host | `okdoc:notify` (via port) | Push notification to AI |

Each `okdoc:call` includes a unique `id` that the `okdoc:result` echoes back for correlation (supports concurrent tool calls).

---

## Protocol Version

The SDK declares its protocol version during the handshake. The host checks for compatibility:

- **SDK version ≤ Host version**: Works (backward-compatible adapters applied if needed)
- **SDK version > Host version**: Rejected — user is asked to update the app

Current version: **2**. Reported automatically — you don't set it manually.

---

## `inputSchema` Reference

The `inputSchema` follows [JSON Schema](https://json-schema.org/) format. Common patterns:

```javascript
// String argument
{ type: 'string', description: 'City name' }

// String with allowed values
{ type: 'string', enum: ['celsius', 'fahrenheit'] }

// Number with range
{ type: 'number', minimum: 0, maximum: 100 }

// Boolean
{ type: 'boolean', description: 'Enable verbose output' }

// Array of strings
{ type: 'array', items: { type: 'string' }, minItems: 1 }

// Nested object
{
  type: 'object',
  properties: {
    lat: { type: 'number' },
    lon: { type: 'number' },
  },
  required: ['lat', 'lon'],
}
```

---

## Complete Example: Multi-Tool Background Plugin

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/gh/okDoc-ai/plugin-sdk@1/cdn/okdoc-iframe-sdk.js"></script>
</head>
<body>
<script>
  OkDoc.init({
    id: 'odc-acme-notes',
    name: 'Notes Manager',
    namespace: 'odc-acme-notes',
    version: '1.0.0',
    description: 'Create and manage notes',
    icon: 'document-text-outline',
    mode: 'background',
  });

  const notes = [];

  OkDoc.registerTool('add_note', {
    description: 'Add a new note',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Note title' },
        body: { type: 'string', description: 'Note content' },
      },
      required: ['title', 'body'],
    },
    handler: async (args) => {
      notes.push({ title: String(args.title), body: String(args.body) });
      return {
        content: [{ type: 'text', text: `Note "${args.title}" added. Total: ${notes.length}` }],
      };
    },
  });

  OkDoc.registerTool('list_notes', {
    description: 'List all saved notes',
    handler: async () => {
      if (notes.length === 0) {
        return { content: [{ type: 'text', text: 'No notes yet.' }] };
      }
      const list = notes.map((n, i) => `${i + 1}. ${n.title}: ${n.body}`).join('\n');
      return { content: [{ type: 'text', text: list }] };
    },
  });

  OkDoc.registerTool('clear_notes', {
    description: 'Delete all notes',
    annotations: { destructiveHint: true },
    handler: async () => {
      const count = notes.length;
      notes.length = 0;
      return { content: [{ type: 'text', text: `Cleared ${count} notes.` }] };
    },
  });
</script>
</body>
</html>
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Plugin not discovered | `OkDoc.init()` and `OkDoc.registerTool()` must run synchronously during page load (before the 10-second handshake timeout). Check the browser console. |
| Tool call times out | Handlers have a 30-second timeout. For longer tasks, return a "processing" message and use `OkDoc.notify()` when done. |
| CORS errors | Your page must be accessible from the app's origin. Use `--cors` flag with your dev server. |
| TypeScript doesn't recognize `OkDoc` | Download `okdoc-iframe-sdk-global.d.ts` into a directory included in your `tsconfig.json` `"include"` array (see [Approach B](#approach-b-full-type-checking-with-typescript-definitions) above). |
| Mobile (Capacitor) | iOS WKWebView and Android WebView support cross-origin iframes. If your page needs HTTPS features, use an HTTPS dev server. |

---

## Related Guides

- **[IonicAngularProjectSetup.md](IonicAngularProjectSetup.md)** — Create an Ionic 8 / Angular 20 project (matching OkDoc's stack)
- **[SampleRemoteComponentDevelopmentGuide.md](SampleRemoteComponentDevelopmentGuide.md)** — Create a reusable Angular web component
- **[RemotePluginGuide.md](RemotePluginGuide.md)** — Build a remote plugin (Web Component loaded by URL)
