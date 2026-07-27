import * as React from "react";
import { renderAsync } from "@react-email/components";
import { EmailLayout, ACCENT, heading1, bodyText, mutedText, baseButton } from "./layout";

export interface NewDeviceAlertEmailProps {
  displayName: string;
  browser: string;
  os: string;
  ipAddress: string;
  loginAt: string;
  securityUrl: string;
}

export default function NewDeviceAlertEmail({
  displayName,
  browser,
  os,
  ipAddress,
  loginAt,
  securityUrl,
}: NewDeviceAlertEmailProps) {
  const formattedDate = new Date(loginAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <EmailLayout preview="New sign-in to your TheCoreGamer account">
      <h1 style={heading1}>New sign-in to your account</h1>
      <p style={bodyText}>
        Hi <strong>{displayName}</strong>, we noticed a sign-in to your TheCoreGamer account from a
        device we haven&apos;t seen before.
      </p>

      <table
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{
          width: "100%",
          borderRadius: "10px",
          border: "1px solid #d4d4d8",
          overflow: "hidden",
          margin: "0 0 28px",
        }}
      >
        <tr>
          <td style={{ padding: "14px 20px", borderBottom: "1px solid #d4d4d8" }}>
            <p style={{ ...mutedText, margin: "0 0 2px" }}>Device</p>
            <p style={{ ...bodyText, margin: 0, fontWeight: "600", color: "#18181b" }}>
              {browser} on {os}
            </p>
          </td>
        </tr>
        <tr>
          <td style={{ padding: "14px 20px", borderBottom: "1px solid #d4d4d8" }}>
            <p style={{ ...mutedText, margin: "0 0 2px" }}>Approximate location</p>
            <p style={{ ...bodyText, margin: 0, fontWeight: "600", color: "#18181b" }}>
              IP range {ipAddress}
            </p>
          </td>
        </tr>
        <tr>
          <td style={{ padding: "14px 20px" }}>
            <p style={{ ...mutedText, margin: "0 0 2px" }}>Time</p>
            <p style={{ ...bodyText, margin: 0, fontWeight: "600", color: "#18181b" }}>
              {formattedDate}
            </p>
          </td>
        </tr>
      </table>

      <p style={bodyText}>
        If this was you, no action is needed — you can safely ignore this email.
      </p>

      <table cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: "0 0 24px" }}>
        <tr>
          <td>
            <a href={securityUrl} style={baseButton}>
              Review Account Security
            </a>
          </td>
        </tr>
      </table>

      <p style={mutedText}>
        <strong>Wasn&apos;t you?</strong> Someone else may have access to your account. Visit{" "}
        <a href={securityUrl} style={{ color: ACCENT, textDecoration: "none" }}>
          Account Security
        </a>{" "}
        and change your password as soon as possible.
      </p>
    </EmailLayout>
  );
}

export function renderNewDeviceAlertEmail(props: NewDeviceAlertEmailProps): Promise<string> {
  return renderAsync(<NewDeviceAlertEmail {...props} />);
}
