function page(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #f9fafb;
            color: #111827;
            padding: 2rem;
        }
        .container { max-width: 640px; margin: 0 auto; }
        h1 { font-size: 1.5rem; margin-bottom: 1rem; }
        .card {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
        }
        .card h2 {
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7280;
            margin-bottom: 0.5rem;
        }
        .card p { color: #374151; line-height: 1.5; }
        code {
            background: #e5e7eb;
            padding: 0.15em 0.4em;
            border-radius: 4px;
            font-size: 0.875em;
        }
        .badge {
            display: inline-block;
            background: #dbeafe;
            color: #1d4ed8;
            padding: 0.2em 0.6em;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        .badge.secret {
            background: #fef3c7;
            color: #92400e;
        }
    </style>
</head>
<body>
    <div class="container">${body}</div>
</body>
</html>`;
}

export function renderDashboard(decoded: any, data: any): string {
    return page(
        'Hello World',
        `
        <h1>Hello World</h1>
        <div class="card">
            <h2>Tenant</h2>
            <p><code>${decoded.envelope.tenantIdentifier}</code></p>
        </div>
        <div class="card">
            <p><span class="badge">Server</span> loaded via POST with an encrypted payload</p>
            <p><span class="badge">Payload Signature</span> ${decoded.signature.verified ? 'VERIFIED' : 'NOT_VERIFIED'}.</p>
            <p><span class="badge">Token Signature</span> ${decoded.backendToken.verified ? 'VERIFIED' : 'NOT_VERIFIED'}.</p>
        </div>
        <div class="card">
            <h2>Claims</h2>
            <pre>${JSON.stringify(decoded.backendToken.claims, null, 2)}</pre>
        </div>
        <div class="card">
            <h2>Context</h2>
            <pre>${JSON.stringify(decoded.envelope.entityContext, null, 2)}</pre>
        </div>
        <div class="card">
            <h2>Data</h2>
            <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>`,
    );
}
