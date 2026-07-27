import * as React from "react";
import { renderAsync } from "@react-email/components";
import { EmailLayout, ACCENT, heading1, bodyText, mutedText, baseButton } from "./layout";

export interface WelcomeEmailProps {
  displayName: string;
  siteUrl: string;
}

export default function WelcomeEmail({ displayName, siteUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview={`Welcome to TheCoreGamer, ${displayName}!`}>
      <h1 style={heading1}>You&apos;re all set, {displayName}!</h1>
      <p style={bodyText}>
        Your TheCoreGamer account is verified and ready to go. Here&apos;s what you can do now:
      </p>

      {/* Feature highlights */}
      <table
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{ width: "100%", marginBottom: "28px" }}
      >
        {[
          {
            icon: "📰",
            title: "Read & comment",
            desc: "Dive into reviews, guides, and gaming news.",
          },
          {
            icon: "📋",
            title: "Save & organize",
            desc: "Bookmark articles and build reading lists.",
          },
          {
            icon: "✍️",
            title: "Write & publish",
            desc: "Apply to become an author and share your expertise.",
          },
        ].map(({ icon, title, desc }) => (
          <tr key={title}>
            <td
              style={{
                padding: "10px 0",
                borderBottom: "1px solid #d4d4d8",
                verticalAlign: "top",
              }}
            >
              <table cellPadding={0} cellSpacing={0} role="presentation">
                <tr>
                  <td style={{ width: "36px", verticalAlign: "top", paddingTop: "2px" }}>
                    <span style={{ fontSize: "20px" }}>{icon}</span>
                  </td>
                  <td style={{ paddingLeft: "8px" }}>
                    <p
                      style={{
                        ...bodyText,
                        margin: "0 0 2px",
                        fontWeight: "600",
                        color: "#18181b",
                      }}
                    >
                      {title}
                    </p>
                    <p style={{ ...mutedText, margin: 0 }}>{desc}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        ))}
      </table>

      {/* CTA button */}
      <table cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: "8px 0 24px" }}>
        <tr>
          <td>
            <a href={siteUrl} style={baseButton}>
              Explore TheCoreGamer
            </a>
          </td>
        </tr>
      </table>

      <p style={{ ...mutedText, margin: 0 }}>
        Questions? Reply to this email or visit our{" "}
        <a href={`${siteUrl}/contact`} style={{ color: ACCENT, textDecoration: "none" }}>
          support page
        </a>
        .
      </p>
    </EmailLayout>
  );
}

export function renderWelcomeEmail(displayName: string, siteUrl: string): Promise<string> {
  return renderAsync(<WelcomeEmail displayName={displayName} siteUrl={siteUrl} />);
}
