import * as React from "react";
import { renderAsync } from "@react-email/components";
import { EmailLayout, ACCENT, heading1, bodyText, mutedText, baseButton } from "./layout";

export interface EditorNotificationEmailProps {
  articleTitle: string;
  authorName: string;
  reviewUrl: string;
}

export default function EditorNotificationEmail({
  articleTitle,
  authorName,
  reviewUrl,
}: EditorNotificationEmailProps) {
  return (
    <EmailLayout preview={`New submission for review: "${articleTitle}"`}>
      <h1 style={heading1}>New article submitted for review</h1>
      <p style={bodyText}>
        <strong>{authorName}</strong> has submitted an article for editorial review.
      </p>

      {/* Submission card */}
      <table
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{
          width: "100%",
          backgroundColor: "#fafafa",
          borderRadius: "8px",
          borderLeft: `4px solid ${ACCENT}`,
          margin: "0 0 28px",
        }}
      >
        <tr>
          <td style={{ padding: "16px 20px" }}>
            <table cellPadding={0} cellSpacing={0} role="presentation" style={{ width: "100%" }}>
              <tr>
                <td style={{ paddingBottom: "10px" }}>
                  <p style={{ ...mutedText, margin: "0 0 4px" }}>Article title</p>
                  <p style={{ ...bodyText, margin: 0, fontWeight: "600", color: "#18181b" }}>
                    {articleTitle}
                  </p>
                </td>
              </tr>
              <tr>
                <td>
                  <p style={{ ...mutedText, margin: "0 0 4px" }}>Author</p>
                  <p style={{ ...bodyText, margin: 0, fontWeight: "500", color: "#18181b" }}>
                    {authorName}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      {/* CTA */}
      <table cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: "0 0 24px" }}>
        <tr>
          <td>
            <a href={reviewUrl} style={baseButton}>
              Review Submission
            </a>
          </td>
        </tr>
      </table>

      <p style={mutedText}>
        You are receiving this because you are an editor on TheCoreGamer. Manage your notification
        preferences in{" "}
        <a
          href="https://thecoregamer.com/settings/profile"
          style={{ color: ACCENT, textDecoration: "none" }}
        >
          account settings
        </a>
        .
      </p>
    </EmailLayout>
  );
}

export function renderEditorNotificationEmail(
  articleTitle: string,
  authorName: string,
  reviewUrl: string
): Promise<string> {
  return renderAsync(
    <EditorNotificationEmail
      articleTitle={articleTitle}
      authorName={authorName}
      reviewUrl={reviewUrl}
    />
  );
}
