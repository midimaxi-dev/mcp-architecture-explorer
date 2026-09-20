# MCP Flow Atlas

A polished, dependency-free interactive one-page guide to Model Context Protocol (MCP) purpose, architecture, primitives, current protocol behavior, Microsoft Entra ID authorization, and security boundaries.

## Run locally

No build or install is required. Open `index.html` directly, or serve the folder for the most browser-consistent experience:

```powershell
python -m http.server 4173
```

Then visit [http://localhost:4173](http://localhost:4173).

## Features

- Version-aligned overview of server primitives and client-offered features, with control models, methods, examples, and taxonomy boundaries
- Interactive architecture map with control, transport, and data layers
- Thirteen selectable MCP lifecycle steps with explicit initiator, receiver, responder, channel, purpose, success/failure guidance, and realistic payloads
- Responsive selected-step swimlanes plus clear labels for identity alternatives, internal processing, conditional work, and optional operations
- Current MCP 2026-07-28 and legacy initialization-based MCP 2025-06-18 modes, plus stdio
- Required per-request `params._meta`, `server/discover`, stateless request handling, MRTR, subscriptions, and legacy initialization comparisons
- Compact and expert detail modes
- Request/response payload tabs with copy support
- Microsoft Entra ID protected-resource discovery and MSAL Authorization Code + PKCE guidance
- Confidential application patterns for managed identity, workload identity federation, certificates, and client credentials
- JWT validation, `scp` versus `roles`, per-request principal authorization, 401/403 behavior, and downstream OBO guidance
- Explicit token boundary: authorization tokens never enter JSON-RPC, `_meta`, tool arguments, application state, or model context
- Protocol-aware “Onboard an MCP server” guide with a trust-to-operations sequence, host-specific manifest boundary, selectable stdio/HTTP/harness examples, field glossary, and configuration warnings
- Interactive OWASP MCP Top 10 2025 beta register with a review method, boundary filters, insecure/secure comparisons, impact, controls, verification checks, and official sources
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
