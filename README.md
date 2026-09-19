# MCP Flow Atlas

A polished, dependency-free interactive guide to Model Context Protocol (MCP) architecture, Microsoft Entra ID authorization, protocol generations, and security boundaries.

## Run locally

No build or install is required. Open `index.html` directly, or serve the folder for the most browser-consistent experience:

```powershell
python -m http.server 4173
```

Then visit [http://localhost:4173](http://localhost:4173).

## Features

- Interactive architecture map with control, transport, and data layers
- Twelve selectable MCP lifecycle steps and realistic request/response examples
- MCP 2025-06-18 Streamable HTTP and MCP 2024-11-05 legacy HTTP+SSE modes, plus stdio
- Protocol-aware lifecycle copy, transport labels, wire metadata, and `initialize.protocolVersion`
- Compact and expert detail modes
- Request/response payload tabs with copy support
- Microsoft Entra ID protected-resource discovery and MSAL Authorization Code + PKCE guidance
- Confidential application patterns for managed identity, workload identity federation, certificates, and client credentials
- JWT validation, `scp` versus `roles`, principal-to-session binding, 401/403 behavior, and downstream OBO guidance
- Explicit token boundary: authorization tokens never enter JSON-RPC, MCP session state, tool arguments, or model context
- Protocol-aware “Onboard an MCP server” guide with a trust-to-operations sequence, host-specific manifest boundary, selectable stdio/HTTP/harness examples, field glossary, and configuration warnings
- Interactive OWASP MCP Top 10 2025 beta register with boundary filters, insecure examples, controls, and official sources
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
