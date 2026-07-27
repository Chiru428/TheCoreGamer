import * as React from "react";
if (typeof process !== "undefined" && process.env.npm_lifecycle_event === "email:preview") {
  require("web-streams-polyfill/polyfill");
}

import {

  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Preview,
  Img,
} from "@react-email/components";

const baseUrl = process.env.SITE_URL || "https://thecoregamer.com";
const isPreview = typeof process !== "undefined" && process.env.npm_lifecycle_event === "email:preview";
const logoUrl = isPreview ? "/static/logo_white.svg" : `${baseUrl}/logo_white.svg`;

export const ACCENT = "#7b5cfa";
export const ACCENT_DARK = "#6344e0";

export const baseButton = {
  display: "inline-block" as const,
  backgroundColor: ACCENT,
  backgroundImage: `linear-gradient(135deg, ${ACCENT} 0%, #4c1d95 100%)`,
  color: "#ffffff",
  padding: "14px 32px",
  borderRadius: "9999px",
  textDecoration: "none",
  fontWeight: "700" as const,
  fontSize: "15px",
  lineHeight: "1",
  boxShadow: "0 4px 14px 0 rgba(123, 92, 250, 0.39)",
};

export const heading1 = {
  color: "#09090b",
  fontSize: "26px",
  fontWeight: "800" as const,
  margin: "0 0 16px",
  lineHeight: "1.2",
  letterSpacing: "-0.02em",
};

export const bodyText = {
  color: "#3f3f46",
  fontSize: "15px",
  lineHeight: "1.7",
  margin: "0 0 20px",
};

export const mutedText = {
  color: "#71717a",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: "0 0 8px",
};

export interface EmailLayoutProps {
  children: React.ReactNode;
  preview?: string;
}

export function EmailLayout({ children, preview }: EmailLayoutProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <style>
          {`
            @media (max-width: 600px) {
              .outer-table {
                padding: 16px 8px !important;
              }
              .header {
                padding: 20px 24px !important;
              }
              .content {
                padding: 32px 24px 24px !important;
              }
              .footer {
                padding: 16px 24px 24px !important;
              }
              .footer-divider {
                padding: 0 16px !important;
              }
            }
          `}
        </style>
      </Head>
      {preview && <Preview>{preview}</Preview>}
      <Body
        style={{
          backgroundColor: "#ffffff",
          margin: "0",
          padding: "0",
          fontFamily:
            '"Acumin Pro", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          WebkitTextSizeAdjust: "100%",
        }}
      >
        {/* Outer wrapper table — centers the 600px card */}
        <table
          className="outer-table"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          role="presentation"
          style={{ backgroundColor: "#ffffff", padding: "40px 16px" }}
        >
          <tr>
            <td align="center">
              {/* Card table */}
              <table
                width="600"
                cellPadding={0}
                cellSpacing={0}
                role="presentation"
                style={{
                  maxWidth: "600px",
                  width: "100%",
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #d4d4d8",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
                  overflow: "hidden",
                }}
              >
                {/* Brand header */}
                <tr>
                  <td
                    className="header"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${ACCENT} 0%, #4c1d95 100%)`,
                      padding: "24px 40px",
                    }}
                  >
                    <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
                      <tr>
                        <td>
                          <Img
                            src={logoUrl}
                            alt="TheCoreGamer"
                            height="24"
                            style={{ display: "block", outline: "none", border: "none", textDecoration: "none" }}
                          />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                {/* Main content */}
                <tr>
                  <td className="content" style={{ padding: "40px 40px 32px" }}>{children}</td>
                </tr>

                {/* Footer divider */}
                <tr>
                  <td className="footer-divider" style={{ padding: "0 32px" }}>
                    <hr
                      style={{
                        border: "none",
                        borderTop: "1px solid #d4d4d8",
                        margin: 0,
                      }}
                    />
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td className="footer" style={{ padding: "20px 40px 28px" }}>
                    <p
                      style={{
                        color: "#a1a1aa",
                        fontSize: "12px",
                        margin: "0 0 6px",
                        lineHeight: "1.6",
                      }}
                    >
                      © {new Date().getFullYear()} TheCoreGamer. All rights reserved.
                    </p>
                    <p style={{ color: "#a1a1aa", fontSize: "12px", margin: 0, lineHeight: "1.6" }}>
                      <a
                        href="https://thecoregamer.com/privacy"
                        style={{ color: "#a1a1aa", textDecoration: "underline" }}
                      >
                        Privacy Policy
                      </a>
                      &nbsp;&middot;&nbsp;
                      <a
                        href="https://thecoregamer.com/settings/notifications"
                        style={{ color: "#a1a1aa", textDecoration: "underline" }}
                      >
                        Email preferences
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </Body>
    </Html>
  );
}
