# MCP Flow Atlas

A polished, dependency-free interactive guide to the Model Context Protocol (MCP). It maps the host, client, transport, server, identity provider, and backing systems across a ten-step lifecycle, with selectable JSON-RPC 2.0 payloads for both stdio and Streamable HTTP.

## Run locally

No build or install is required. Open `index.html` directly, or serve the folder for the most browser-consistent experience:

```powershell
python -m http.server 4173
```

Then visit [http://localhost:4173](http://localhost:4173).

## Features

- Interactive architecture map with control, transport, and data layers
- Ten selectable MCP lifecycle steps and realistic request/response examples
- Streamable HTTP and stdio transport modes
- Compact and expert detail modes
- Request/response payload tabs with copy support
- OAuth 2.1, PKCE, bearer token, resource indicator, scopes, claims, and policy guidance
- Responsive, keyboard-accessible, theme-aware interface that works offline

## File structure

```text
.
├── index.html             # Semantic page structure and app shell
├── assets/
│   ├── app.js             # Lifecycle data and interactive behavior
│   ├── styles.css         # Responsive design system and themes
│   └── mcp-mark.svg       # Local brand mark
└── README.md              # Usage and project overview
```

## Keyboard support

Use `Tab` to reach controls and lifecycle steps, `Enter` or `Space` to select, arrow keys inside payload tabs, and the Previous/Next buttons to traverse the flow. Motion is reduced automatically when the operating system requests it.
