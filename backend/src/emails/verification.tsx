import * as React from "react";
import { renderAsync } from "@react-email/components";
import { EmailLayout, ACCENT, heading1, bodyText, mutedText, baseButton } from "./layout";

export interface VerificationEmailProps {
  displayName: string;
  verificationUrl: string;
}

export default function VerificationEmail({
  displayName,
  verificationUrl,
}: VerificationEmailProps) {
  return (
    <EmailLayout preview={`Hi ${displayName} — verify your TheCoreGamer account`}>
      <h1 style={heading1}>Verify your email address</h1>
      <p style={bodyText}>
        Hi <strong>{displayName}</strong>, thanks for signing up! Click the button below to confirm
        your email address and activate your account.
      </p>

      {/* CTA button */}
      <table cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: "28px 0" }}>
        <tr>
          <td>
            <a href={verificationUrl} style={baseButton}>
              Verify Email Address
            </a>
          </td>
        </tr>
      </table>

      <p style={mutedText}>This link expires in 24 hours.</p>
      <p style={mutedText}>
        If you didn&apos;t create a TheCoreGamer account, you can safely ignore this email.
      </p>

      {/* Fallback plain-text link */}
      <table
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{
          marginTop: "24px",
          backgroundColor: "#fafafa",
          borderRadius: "6px",
          padding: "12px 16px",
          width: "100%",
        }}
      >
        <tr>
          <td>
            <p style={{ ...mutedText, margin: 0 }}>
              Button not working? Copy and paste this link into your browser:
            </p>
            <p
              style={{
                ...mutedText,
                margin: "6px 0 0",
                color: ACCENT,
                wordBreak: "break-all",
              }}
            >
              {verificationUrl}
            </p>
          </td>
        </tr>
      </table>
    </EmailLayout>
  );
}

export function renderVerificationEmail(
  displayName: string,
  verificationUrl: string
): Promise<string> {
  return renderAsync(
    <VerificationEmail displayName={displayName} verificationUrl={verificationUrl} />
  );
}
