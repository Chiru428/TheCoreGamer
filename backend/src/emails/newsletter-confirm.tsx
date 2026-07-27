import * as React from "react";
import { renderAsync } from "@react-email/components";
import { EmailLayout, ACCENT, heading1, bodyText, mutedText, baseButton } from "./layout";

export interface NewsletterConfirmEmailProps {
  confirmUrl: string;
}

export default function NewsletterConfirmEmail({ confirmUrl }: NewsletterConfirmEmailProps) {
  return (
    <EmailLayout preview="Confirm your TheCoreGamer newsletter subscription">
      <h1 style={heading1}>One more step — confirm your subscription</h1>
      <p style={bodyText}>
        You&apos;re almost there! Click the button below to confirm your newsletter subscription and
        start receiving the latest gaming news, reviews, and guides from TheCoreGamer.
      </p>

      {/* What to expect */}
      <table
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{
          width: "100%",
          backgroundColor: "#f5f3ff",
          borderRadius: "12px",
          border: "1px solid #ede9fe",
          margin: "0 0 32px",
        }}
      >
        <tr>
          <td style={{ padding: "24px" }}>
            <p style={{ ...bodyText, margin: "0 0 16px", fontWeight: "700", color: "#4c1d95", letterSpacing: "-0.01em" }}>
              What you&apos;ll receive:
            </p>
            <table cellPadding={0} cellSpacing={0} role="presentation" style={{ width: "100%" }}>
              {[
                "Weekly roundup of top gaming news",
                "New review & guide highlights",
                "Exclusive price drop alerts",
              ].map((item, index) => (
                <tr key={item}>
                  <td style={{ width: "24px", verticalAlign: "top", paddingTop: "2px", paddingBottom: index === 2 ? "0" : "14px" }}>
                    <div style={{ backgroundColor: "#8b5cf6", width: "18px", height: "18px", borderRadius: "50%", textAlign: "center", lineHeight: "18px" }}>
                      <span style={{ color: "#ffffff", fontSize: "11px", fontWeight: "bold", marginLeft: "1px" }}>✓</span>
                    </div>
                  </td>
                  <td style={{ paddingLeft: "10px", verticalAlign: "top", paddingBottom: index === 2 ? "0" : "14px" }}>
                    <p style={{ ...bodyText, margin: "0", color: "#5b21b6", fontWeight: "500", fontSize: "14px" }}>
                      {item}
                    </p>
                  </td>
                </tr>
              ))}
            </table>
          </td>
        </tr>
      </table>

      {/* CTA */}
      <table cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: "0 0 28px" }}>
        <tr>
          <td>
            <a href={confirmUrl} style={baseButton}>
              Confirm Subscription
            </a>
          </td>
        </tr>
      </table>

      <p style={mutedText}>
        If you didn&apos;t subscribe to the TheCoreGamer newsletter, you can safely ignore this
        email — you won&apos;t receive any further emails from us.
      </p>

      {/* Fallback link */}
      <table
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{
          marginTop: "24px",
          backgroundColor: "#f8fafc",
          border: "1px dashed #cbd5e1",
          borderRadius: "8px",
          padding: "16px 20px",
          width: "100%",
        }}
      >
        <tr>
          <td>
            <p style={{ ...mutedText, margin: 0, color: "#64748b" }}>
              Button not working? Copy and paste this link into your browser:
            </p>
            <p
              style={{
                ...mutedText,
                margin: "8px 0 0",
                color: "#4f46e5",
                wordBreak: "break-all",
                fontWeight: "500",
              }}
            >
              {confirmUrl}
            </p>
          </td>
        </tr>
      </table>
    </EmailLayout>
  );
}

export function renderNewsletterConfirmEmail(confirmUrl: string): Promise<string> {
  return renderAsync(<NewsletterConfirmEmail confirmUrl={confirmUrl} />);
}
