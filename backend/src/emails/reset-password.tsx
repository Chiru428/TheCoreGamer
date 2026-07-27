import * as React from "react";
import { renderAsync } from "@react-email/components";
import { EmailLayout, ACCENT, heading1, bodyText, mutedText, baseButton } from "./layout";

export interface ResetPasswordEmailProps {
  resetUrl: string;
}

export default function ResetPasswordEmail({ resetUrl }: ResetPasswordEmailProps) {
  return (
    <EmailLayout preview="Reset your TheCoreGamer password">
      <h1 style={heading1}>Reset your password</h1>
      <p style={bodyText}>
        We received a request to reset the password for your TheCoreGamer account. Click the button
        below to choose a new password.
      </p>

      {/* CTA button */}
      <table cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: "28px 0" }}>
        <tr>
          <td>
            <a href={resetUrl} style={baseButton}>
              Reset Password
            </a>
          </td>
        </tr>
      </table>

      <p style={mutedText}>This link expires in 1 hour.</p>
      <p style={mutedText}>
        If you didn&apos;t request a password reset, please ignore this email. Your password will
        remain unchanged.
      </p>

      {/* Security notice */}
      <table
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{
          marginTop: "24px",
          borderLeft: "3px solid #fbbf24",
          paddingLeft: "14px",
        }}
      >
        <tr>
          <td>
            <p style={{ ...mutedText, margin: 0 }}>
              For security, this link can only be used once. If you need to reset your password
              again, request a new link from the login page.
            </p>
          </td>
        </tr>
      </table>

      {/* Fallback link */}
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
              {resetUrl}
            </p>
          </td>
        </tr>
      </table>
    </EmailLayout>
  );
}

export function renderResetPasswordEmail(resetUrl: string): Promise<string> {
  return renderAsync(<ResetPasswordEmail resetUrl={resetUrl} />);
}
