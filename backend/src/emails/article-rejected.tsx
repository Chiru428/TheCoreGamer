import * as React from "react";
import { renderAsync } from "@react-email/components";
import { EmailLayout, ACCENT, heading1, bodyText, mutedText, baseButton } from "./layout";

export interface ArticleRejectedEmailProps {
  displayName: string;
  articleTitle: string;
  reason: string;
  editUrl: string;
}

export default function ArticleRejectedEmail({
  displayName,
  articleTitle,
  reason,
  editUrl,
}: ArticleRejectedEmailProps) {
  return (
    <EmailLayout preview={`Update on your article "${articleTitle}"`}>
      <h1 style={heading1}>Your article needs some changes</h1>
      <p style={bodyText}>
        Hi <strong>{displayName}</strong>, our editorial team has reviewed your article and has some
        feedback before it can be published.
      </p>

      {/* Article title card */}
      <table
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{
          width: "100%",
          backgroundColor: "#fafafa",
          borderRadius: "8px",
          borderLeft: "4px solid #f59e0b",
          margin: "0 0 20px",
        }}
      >
        <tr>
          <td style={{ padding: "16px 20px" }}>
            <p style={{ ...mutedText, margin: "0 0 4px" }}>Article</p>
            <p style={{ ...bodyText, margin: 0, fontWeight: "600", color: "#18181b" }}>
              {articleTitle}
            </p>
          </td>
        </tr>
      </table>

      {/* Rejection reason */}
      <table
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{
          width: "100%",
          backgroundColor: "#fffbeb",
          borderRadius: "8px",
          border: "1px solid #fcd34d",
          margin: "0 0 28px",
        }}
      >
        <tr>
          <td style={{ padding: "16px 20px" }}>
            <p style={{ ...mutedText, margin: "0 0 6px", fontWeight: "600", color: "#92400e" }}>
              Editor feedback
            </p>
            <p style={{ ...bodyText, margin: 0, color: "#78350f" }}>{reason}</p>
          </td>
        </tr>
      </table>

      <p style={bodyText}>
        Please update your article based on the feedback above and resubmit for review.
      </p>

      {/* CTA */}
      <table cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: "0 0 24px" }}>
        <tr>
          <td>
            <a href={editUrl} style={{ ...baseButton, backgroundColor: "#f59e0b" }}>
              Edit Article
            </a>
          </td>
        </tr>
      </table>

      <p style={mutedText}>
        Questions about the feedback? Reach out to our editorial team at{" "}
        <a
          href="mailto:editorial@thecoregamer.com"
          style={{ color: ACCENT, textDecoration: "none" }}
        >
          editorial@thecoregamer.com
        </a>
        .
      </p>
    </EmailLayout>
  );
}

export function renderArticleRejectedEmail(
  displayName: string,
  articleTitle: string,
  reason: string,
  editUrl: string
): Promise<string> {
  return renderAsync(
    <ArticleRejectedEmail
      displayName={displayName}
      articleTitle={articleTitle}
      reason={reason}
      editUrl={editUrl}
    />
  );
}
