"use strict";

const lifecycle = [
  {
    title: "Initialize & negotiate", short: "Handshake", kind: "request", phase: "Handshake",
    summary: "The client opens the session by declaring its protocol version, capabilities, and implementation identity. The server selects a compatible version and returns its own capabilities.",
    route: ["Host", "Client", "Transport", "Server"],
    guarantee: "A versioned capability handshake before normal operations.",
    ownership: "Launching or locating the server and choosing trusted configuration.",
    expert: "The client sends initialize first. It should use the protocol version in the server response for the session. Unsupported versions should fail explicitly rather than silently degrading.",
    request: { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: { elicitation: {}, roots: { listChanged: true }, sampling: {} }, clientInfo: { name: "atlas-desktop", version: "2.4.0" } } },
    response: { jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-06-18", capabilities: { tools: { listChanged: true }, resources: { subscribe: true, listChanged: true }, logging: {} }, serverInfo: { name: "inventory-mcp", version: "1.8.2" }, instructions: "Use tools to inspect inventory. Mutations require operator approval." } },
    http: { request: ["POST /mcp HTTP/1.1", "Content-Type: application/json", "Accept: application/json, text/event-stream"], response: ["HTTP/1.1 200 OK", "Content-Type: application/json", "MCP-Session-Id: s_7f3c9a"] },
    stdio: { request: ["stdin → server process", "one JSON-RPC message per line"], response: ["stdout ← server process", "no HTTP headers"] }
  },
  {
    title: "Initialization complete", short: "Initialized", kind: "notification", phase: "Handshake",
    summary: "After accepting the server's initialize result, the client sends an initialized notification. It has no id and receives no JSON-RPC response.",
    route: ["Client", "Transport", "Server"],
    guarantee: "A clear transition from negotiation into normal protocol operation.",
    ownership: "Waiting for initialize to succeed before issuing regular requests.",
    expert: "Notifications omit id by definition. A receiver must not reply to them. If an id is present, it is a request—not a notification.",
    request: { jsonrpc: "2.0", method: "notifications/initialized" },
    response: { note: "No JSON-RPC response is sent for a notification." },
    http: { request: ["POST /mcp HTTP/1.1", "MCP-Session-Id: s_7f3c9a", "Content-Type: application/json"], response: ["HTTP/1.1 202 Accepted", "no JSON-RPC response body"] },
    stdio: { request: ["stdin → server process", "notification has no id"], response: ["no stdout response"] }
  },
  {
    title: "Authenticate the caller", short: "Authentication", kind: "identity", phase: "Trust",
    summary: "For Streamable HTTP, the client obtains an access token and presents it to the MCP resource server. Local stdio usually relies on process and OS trust instead of an MCP authentication exchange.",
    route: ["Client", "Identity Provider", "Transport", "Server"],
    guarantee: "MCP's HTTP authorization model can integrate with OAuth-protected resource metadata and bearer tokens.",
    ownership: "Secure token acquisition, storage, audience binding, validation, rotation, and user consent.",
    expert: "Use Authorization Code with PKCE for user-facing public clients. A resource indicator binds token intent to the MCP server. The server validates signature, issuer, audience/resource, expiry, and accepted scopes.",
    requestHttp: { authorization_request: { response_type: "code", client_id: "atlas-desktop", code_challenge: "6fdk...Yq7", code_challenge_method: "S256", resource: "https://inventory.example.com/mcp", scope: "mcp:tools:read inventory:read", redirect_uri: "http://127.0.0.1:49152/callback" }, mcp_header: "Authorization: Bearer eyJhbGciOiJFUzI1NiIs..." },
    responseHttp: { access_token: "eyJhbGciOiJFUzI1NiIs...", token_type: "Bearer", expires_in: 900, scope: "mcp:tools:read inventory:read", resource: "https://inventory.example.com/mcp" },
    requestStdio: { process_context: { executable: "inventory-mcp", launched_by: "atlas-desktop", inherited_environment: ["USERPROFILE", "PATH"], credential_note: "Pass secrets through a secure launcher or OS credential store—not MCP JSON-RPC." } },
    responseStdio: { identity_boundary: "Local process/OS account", mcp_auth_message: false },
    http: { request: ["Authorization: Bearer <access-token>", "resource=https://inventory.example.com/mcp"], response: ["token claims: sub, aud, scope, exp", "401 + WWW-Authenticate on failure"] },
    stdio: { request: ["process launch / OS boundary", "no HTTP Authorization header"], response: ["server inherits local trust context"] }
  },
  {
    title: "Authorize the action", short: "Authorization", kind: "policy", phase: "Trust",
    summary: "The server maps identity claims and request context to policy. MCP carries the operation; it does not make the authorization decision or embed permission in the tool arguments.",
    route: ["Server", "Policy", "Data / Tools"],
    guarantee: "Nothing: authorization semantics are deliberately outside the JSON-RPC payload.",
    ownership: "Server policy, consent, scopes, tenant boundaries, tool-level rules, and downstream ACLs.",
    expert: "Reject before side effects. Combine coarse OAuth scopes with fine-grained checks such as subject, tenant, resource ownership, approved tool, argument constraints, and downstream permissions.",
    request: { evaluated_context: { subject: "usr_42", audience: "https://inventory.example.com/mcp", scopes: ["mcp:tools:read", "inventory:read"], tool: "inventory.lookup", tenant_id: "tenant_north" } },
    response: { decision: "allow", policy: "inventory-read-v3", checks: { token_valid: true, audience_match: true, scope_present: true, tenant_match: true, downstream_acl: true } },
    http: { request: ["server-side policy evaluation", "claims derived from bearer token"], response: ["allow → continue", "deny → JSON-RPC error / HTTP auth challenge as appropriate"] },
    stdio: { request: ["server-side policy evaluation", "identity derived from local trust/config"], response: ["allow → continue", "deny → JSON-RPC error"] }
  },
  {
    title: "Discover available tools", short: "Tools list", kind: "request", phase: "Discovery",
    summary: "The client asks which tools the server currently exposes. Each tool describes its purpose and JSON Schema input so the host can choose and validate arguments.",
    route: ["Host", "Client", "Transport", "Server"],
    guarantee: "A standard discovery method and machine-readable tool input schemas.",
    ownership: "Which tools to expose, tool descriptions, safe schemas, and whether the user should approve invocation.",
    expert: "Pagination uses an opaque cursor. If the server advertised tools.listChanged, it may later emit notifications/tools/list_changed and the client can refresh.",
    request: { jsonrpc: "2.0", id: 2, method: "tools/list", params: { cursor: "page_1" } },
    response: { jsonrpc: "2.0", id: 2, result: { tools: [{ name: "inventory.lookup", title: "Look up inventory", description: "Returns stock for an SKU at approved warehouses.", inputSchema: { type: "object", properties: { sku: { type: "string", pattern: "^[A-Z0-9-]{3,24}$" }, warehouse: { type: "string", enum: ["east", "west"] } }, required: ["sku"], additionalProperties: false }, annotations: { readOnlyHint: true, idempotentHint: true } }], nextCursor: null } },
    http: { request: ["POST /mcp HTTP/1.1", "MCP-Session-Id: s_7f3c9a", "Authorization: Bearer <token>"], response: ["HTTP/1.1 200 OK", "Content-Type: application/json"] },
    stdio: { request: ["stdin → server process"], response: ["stdout ← server process"] }
  },
  {
    title: "Invoke a tool", short: "Tool call", kind: "request", phase: "Execution",
    summary: "The client sends tools/call with a tool name and schema-valid arguments. A progress token allows the server to report long-running work without completing the request.",
    route: ["Host", "Client", "Transport", "Server"],
    guarantee: "A correlated request id, standard tool invocation shape, and optional progress metadata.",
    ownership: "User approval, argument validation, policy enforcement, timeouts, retries, and side-effect controls.",
    expert: "The request id correlates the final response. _meta.progressToken is distinct: it correlates progress notifications. Servers should not assume annotations are security guarantees.",
    request: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "inventory.lookup", arguments: { sku: "MCP-2048", warehouse: "east" }, _meta: { progressToken: "progress-3" } } },
    response: { jsonrpc: "2.0", id: 3, result: { content: [{ type: "text", text: "MCP-2048: 37 units available in east." }], structuredContent: { sku: "MCP-2048", warehouse: "east", available: 37, reserved: 4 }, isError: false } },
    http: { request: ["POST /mcp HTTP/1.1", "MCP-Session-Id: s_7f3c9a", "Authorization: Bearer <token>"], response: ["HTTP/1.1 200 OK", "Content-Type: application/json or text/event-stream"] },
    stdio: { request: ["stdin → server process"], response: ["stdout ← server process"] }
  },
  {
    title: "Process & access data", short: "Server processing", kind: "internal", phase: "Execution",
    summary: "The server validates inputs, re-checks policy, invokes the approved implementation, and accesses downstream systems using appropriately scoped credentials.",
    route: ["Server", "Policy", "Data / Tools"],
    guarantee: "No standard internal execution model; MCP stops at the server boundary.",
    ownership: "Validation, isolation, logging, secret handling, downstream identity, transactions, and output sanitization.",
    expert: "Use least-privilege downstream credentials and preserve end-user context where required. Treat tool output as untrusted data before returning it to a model or rendering it in a UI.",
    request: { internal_operation: "GET /v2/inventory/MCP-2048?warehouse=east", identity: { service: "inventory-mcp", on_behalf_of: "usr_42", tenant: "tenant_north" }, controls: ["schema-validation", "tenant-filter", "read-only-transaction"] },
    response: { status: 200, data: { sku: "MCP-2048", on_hand: 41, reserved: 4, available: 37 }, audit_id: "aud_01J8YQ" },
    http: { request: ["internal server → downstream request", "not an MCP wire message"], response: ["downstream response", "sanitized before MCP result"] },
    stdio: { request: ["same server-side processing"], response: ["transport choice does not change data policy"] }
  },
  {
    title: "Return result or error", short: "Result / error", kind: "response", phase: "Completion",
    summary: "The server completes the same request id with either a result or a JSON-RPC error. Tool execution failures may also be represented with isError inside a successful tools/call result.",
    route: ["Server", "Transport", "Client", "Host"],
    guarantee: "Exactly one response for a request id, carrying either result or error—not both.",
    ownership: "Safe error wording, retry policy, observability, and presenting results to the user or model.",
    expert: "Use JSON-RPC errors for protocol/request failures such as unknown methods or invalid params. For a tool's own operational failure, a tools/call result with isError: true lets the model inspect and potentially recover.",
    request: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "inventory.lookup", arguments: { sku: "RESTRICTED-7", warehouse: "east" } } },
    response: { jsonrpc: "2.0", id: 3, error: { code: -32602, message: "Invalid params", data: { reason: "warehouse is not permitted for this tenant", field: "arguments.warehouse", policy: "inventory-read-v3", retryable: false } } },
    http: { request: ["existing JSON-RPC request id: 3"], response: ["HTTP may still be 200 for a JSON-RPC error", "inspect the JSON-RPC error object"] },
    stdio: { request: ["existing JSON-RPC request id: 3"], response: ["error object written to stdout"] }
  },
  {
    title: "Progress & cancellation", short: "Async control", kind: "notification", phase: "Async",
    summary: "The server can emit progress for a token supplied by the client. Either party can signal cancellation for an in-flight request, but cancellation is best-effort.",
    route: ["Server", "Transport", "Client", "Transport", "Server"],
    guarantee: "Standard notification shapes for progress and cancellation signaling.",
    ownership: "Cooperative abort handling, cleanup, idempotency, and clear UI state when work cannot be stopped.",
    expert: "notifications/progress uses progressToken, while notifications/cancelled identifies the original requestId. Neither notification receives a response. Do not cancel initialize.",
    request: { jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 3, reason: "User closed the inventory panel" } },
    response: { jsonrpc: "2.0", method: "notifications/progress", params: { progressToken: "progress-3", progress: 62, total: 100, message: "Checking warehouse reservations" } },
    http: { request: ["POST /mcp: cancellation notification", "MCP-Session-Id: s_7f3c9a"], response: ["SSE event or JSON-RPC message: progress notification", "ordering can span independent HTTP connections"] },
    stdio: { request: ["stdin: cancellation notification"], response: ["stdout: progress notification", "messages share ordered process streams"] }
  },
  {
    title: "Close the session", short: "Shutdown", kind: "lifecycle", phase: "Teardown",
    summary: "The client ends transport use and releases session resources. Streamable HTTP may use DELETE when the server supports session termination; stdio closes stdin and terminates the child process cleanly.",
    route: ["Host", "Client", "Transport", "Server"],
    guarantee: "Transport-specific lifecycle guidance; there is no universal JSON-RPC shutdown method in MCP.",
    ownership: "Draining work, revoking local state, closing streams, process cleanup, and audit finalization.",
    expert: "For Streamable HTTP, send DELETE with MCP-Session-Id when session termination is supported. A 405 means the server does not permit client-initiated deletion. For stdio, close stdin, wait, then terminate only if necessary.",
    requestHttp: { method: "DELETE", path: "/mcp", headers: { "MCP-Session-Id": "s_7f3c9a", Authorization: "Bearer <access-token>" } },
    responseHttp: { status: "204 No Content", result: "Session state released" },
    requestStdio: { action: "close stdin", grace_period_ms: 3000 },
    responseStdio: { process_exit_code: 0, stdout_closed: true, stderr_closed: true },
    http: { request: ["DELETE /mcp HTTP/1.1", "MCP-Session-Id: s_7f3c9a"], response: ["HTTP/1.1 204 No Content"] },
    stdio: { request: ["close child stdin", "wait for graceful exit"], response: ["process exits; collect stderr diagnostics"] }
  }
];

const roleNotes = {
  host: ["Host / App", "Owns the user experience, model orchestration, consent, and which MCP clients are created. It does not speak directly to every server implementation detail."],
  client: ["MCP Client", "Maintains one protocol session with a server, negotiates capabilities, correlates request ids, and exposes server features to the host."],
  transport: ["Transport", "Moves JSON-RPC messages. stdio uses process stdin/stdout; Streamable HTTP uses POST and may use SSE for server-to-client streaming."],
  server: ["MCP Server", "Publishes tools, resources, and prompts; validates requests; enforces policy; and converts internal work into MCP results or errors."],
  identity: ["Identity Provider", "Issues and signs access tokens for remote HTTP flows. It authenticates identities but does not replace the MCP server's authorization checks."],
  data: ["Data / Tools", "Databases, APIs, files, and business systems remain behind the server. Their own ACLs and authorization controls still apply."]
};

const state = { step: 0, transport: "http", mode: "compact", tab: "request" };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function highlightJson(object) {
  const json = JSON.stringify(object, null, 2);
  return escapeHtml(json).replace(/(&quot;.*?&quot;)(\s*:)?|\b(true|false)\b|\b(null)\b|-?\b\d+(?:\.\d+)?\b/g, (match, string, colon, bool, nil) => {
    if (string) return `<span class="${colon ? "code-key" : "code-string"}">${string}</span>${colon || ""}`;
    if (bool) return `<span class="code-boolean">${match}</span>`;
    if (nil) return `<span class="code-null">${match}</span>`;
    return `<span class="code-number">${match}</span>`;
  });
}

function currentPayload(step, tab) {
  const transportSuffix = state.transport === "http" ? "Http" : "Stdio";
  return step[`${tab}${transportSuffix}`] || step[tab];
}

function renderTimeline() {
  $("#timeline").innerHTML = lifecycle.map((step, index) => `
    <li><button class="step-button" type="button" data-step="${index}" aria-current="${index === state.step ? "step" : "false"}">
      <span class="step-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="step-name"><strong>${step.short}</strong><small>${step.phase}</small></span>
      <span class="step-kind">${step.kind}</span>
    </button></li>`).join("");
  $$(".step-button").forEach((button) => button.addEventListener("click", () => selectStep(Number(button.dataset.step))));
}

function renderRoute(route) {
  return route.map((node, index) => `${index ? '<span class="route-arrow" aria-hidden="true">→</span>' : ""}<span class="route-node ${index === 0 || index === route.length - 1 ? "active" : ""}">${node}</span>`).join("");
}

function renderPayload() {
  const step = lifecycle[state.step];
  const payload = currentPayload(step, state.tab);
  const meta = step[state.transport][state.tab] || [];
  $("#payloadCode").innerHTML = highlightJson(payload);
  $("#wireMeta").innerHTML = meta.map((line) => `<span>${escapeHtml(line)}</span>`).join("");
  $("#payloadPanel").setAttribute("aria-labelledby", `${state.tab}Tab`);
  $$("[data-tab]").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.tab === state.tab)));
}

function renderStep({ announce = false } = {}) {
  const step = lifecycle[state.step];
  $("#stepBadge").textContent = `Step ${String(state.step + 1).padStart(2, "0")}`;
  $("#phaseBadge").textContent = step.phase;
  $("#stepTitle").textContent = step.title;
  $("#stepSummary").textContent = step.summary;
  $("#stepRoute").innerHTML = renderRoute(step.route);
  $("#guaranteeText").textContent = step.guarantee;
  $("#ownershipText").textContent = step.ownership;
  $("#expertNote").innerHTML = `<strong>Expert note:</strong> ${escapeHtml(step.expert)}`;
  $("#stepCounter").textContent = `${state.step + 1} / ${lifecycle.length}`;
  $("#prevStep").disabled = state.step === 0;
  $("#nextStep").disabled = state.step === lifecycle.length - 1;
  $$(".step-button").forEach((button, index) => button.setAttribute("aria-current", index === state.step ? "step" : "false"));
  renderPayload();
  if (announce) $("#announcer").textContent = `Step ${state.step + 1}: ${step.title}`;
}

function selectStep(index) {
  state.step = Math.max(0, Math.min(index, lifecycle.length - 1));
  state.tab = "request";
  renderStep({ announce: true });
  if (window.innerWidth <= 720) $("#stepDetail").scrollIntoView({ behavior: "smooth", block: "start" });
}

function setTransport(transport) {
  state.transport = transport;
  $$('[data-transport]').forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.transport === transport)));
  const isHttp = transport === "http";
  $("#transportNodeTitle").textContent = isHttp ? "Streamable HTTP" : "Standard I/O";
  $("#transportNodeSubtitle").textContent = isHttp ? "POST + optional SSE stream" : "stdin / stdout process streams";
  $("#transportChip").textContent = isHttp ? "remote" : "local";
  $("#transportSummary").textContent = isHttp ? "HTTP carries JSON-RPC in POST bodies; SSE may stream server messages." : "stdio carries one JSON-RPC message at a time over stdin/stdout; stderr is for diagnostics.";
  renderPayload();
  $("#announcer").textContent = `${isHttp ? "Streamable HTTP" : "stdio"} transport selected`;
}

function setMode(mode) {
  state.mode = mode;
  document.body.dataset.mode = mode;
  $$('[data-mode]').forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === mode)));
  $("#announcer").textContent = `${mode === "detail" ? "Expert" : "Compact"} detail mode selected`;
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("mcp-atlas-theme", theme);
  const light = theme === "light";
  $("#themeToggle").setAttribute("aria-label", `Switch to ${light ? "dark" : "light"} theme`);
  $("#themeIcon").textContent = light ? "☾" : "☼";
}

function init() {
  renderTimeline();
  renderStep();
  setMode("compact");
  const savedTheme = localStorage.getItem("mcp-atlas-theme");
  const preferred = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  setTheme(savedTheme || preferred);

  $$('[data-transport]').forEach((button) => button.addEventListener("click", () => setTransport(button.dataset.transport)));
  $$('[data-mode]').forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  $$("[data-tab]").forEach((button, index, tabs) => {
    button.addEventListener("click", () => { state.tab = button.dataset.tab; renderPayload(); });
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
      tabs[next].focus(); tabs[next].click();
    });
  });
  $("#prevStep").addEventListener("click", () => selectStep(state.step - 1));
  $("#nextStep").addEventListener("click", () => selectStep(state.step + 1));
  $("#themeToggle").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  $("#copyPayload").addEventListener("click", async () => {
    const text = JSON.stringify(currentPayload(lifecycle[state.step], state.tab), null, 2);
    try { await navigator.clipboard.writeText(text); $("#copyPayload").textContent = "Copied"; setTimeout(() => $("#copyPayload").innerHTML = '<span aria-hidden="true">⧉</span> Copy', 1400); }
    catch { $("#announcer").textContent = "Clipboard access is unavailable. Select the payload text to copy it."; }
  });
  $$(".node").forEach((node) => node.addEventListener("click", () => {
    $$(".node").forEach((item) => item.classList.remove("active"));
    $$(".layer").forEach((item) => item.classList.remove("active"));
    node.classList.add("active"); node.closest(".layer").classList.add("active");
    const [title, text] = roleNotes[node.dataset.role];
    $("#roleNote").innerHTML = `<strong>${title}:</strong> ${text}`;
  }));
}

document.addEventListener("DOMContentLoaded", init);
