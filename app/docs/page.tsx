/**
 * API Documentation Page
 *
 * Provides Swagger UI for interactive API exploration
 * Displays OpenAPI 3.0.3 specification with full documentation
 */

import Script from "next/script";
import { generateOpenAPISpec } from "@/lib/services/api-documentation-service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function APIDocsPage() {
  const spec = generateOpenAPISpec();

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "40px 20px",
          textAlign: "center",
          color: "white",
          marginBottom: "20px",
        }}
      >
        <h1
          style={{
            margin: "0",
            fontSize: "2.5rem",
            fontWeight: 700,
          }}
        >
          Architect Platform API
        </h1>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: "1.1rem",
            opacity: 0.9,
          }}
        >
          World-class AI-powered software generation platform API
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          <a
            href="/api/openapi/spec"
            style={{
              color: "white",
              textDecoration: "none",
              padding: "10px 20px",
              border: "2px solid white",
              borderRadius: "6px",
              fontWeight: 600,
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e: any) => {
              e.target.style.background = "white";
              e.target.style.color = "#667eea";
            }}
            onMouseOut={(e: any) => {
              e.target.style.background = "transparent";
              e.target.style.color = "white";
            }}
          >
            Download OpenAPI Spec (JSON)
          </a>
          <a
            href="/api/openapi"
            style={{
              color: "white",
              textDecoration: "none",
              padding: "10px 20px",
              border: "2px solid white",
              borderRadius: "6px",
              fontWeight: 600,
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e: any) => {
              e.target.style.background = "white";
              e.target.style.color = "#667eea";
            }}
            onMouseOut={(e: any) => {
              e.target.style.background = "transparent";
              e.target.style.color = "white";
            }}
          >
            Get Specification Info
          </a>
        </div>
      </div>

      <div id="swagger-ui" />

      <script
        dangerouslySetInnerHTML={{
          __html: `window.SPECIFICATION = ${JSON.stringify(spec)};`,
        }}
      />

      <link
        rel="stylesheet"
        type="text/css"
        href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css"
      />

      <Script
        src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />

      <Script
        id="swagger-init"
        strategy="afterInteractive"
      >
        {`
          (function() {
            const ui = SwaggerUIBundle({
              spec: window.SPECIFICATION,
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.StandalonePreset
              ],
              plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
              ],
              layout: "StandaloneLayout",
              defaultModelsExpandDepth: 1,
              defaultModelExpandDepth: 1,
              docExpansion: "list",
              filter: true,
              showRequestHeaders: true,
              showCommonExtensions: true,
              tryItOutEnabled: true,
              persistAuthorization: true,
              displayRequestDuration: true,
              displayOperationId: false,
              supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
              validatorUrl: null
            });

            const style = document.createElement('style');
            style.textContent = '.swagger-ui .topbar { display: none; }';
            document.head.appendChild(style);
          })();
        `}
      </Script>
    </div>
  );
}
