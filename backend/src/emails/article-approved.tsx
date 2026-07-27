import * as React from "react";
import { renderAsync } from "@react-email/components";
import { EmailLayout, ACCENT, heading1, bodyText, mutedText, baseButton } from "./layout";

export interface ArticleApprovedEmailProps {
  displayName: string;
  articleTitle: string;
  articleUrl: string;
}

export default function ArticleApprovedEmail({
  displayName,
  articleTitle,
  articleUrl,
}: ArticleApprovedEmailProps) {
  return (
    <EmailLayout preview={`Great news, ${displayName} — your article is live!`}>
      <h1 style={heading1}>Your article is live! 🎉</h1>
      <p style={bodyText}>
        Hi <strong>{displayName}</strong>, great news — your article has been reviewed and published
        on TheCoreGamer.
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
          borderLeft: "4px solid #10b981",
          margin: "0 0 28px",
        }}
      >
        <tr>
          <td style={{ padding: "16px 20px" }}>
            <p style={{ ...mutedText, margin: "0 0 4px" }}>Published article</p>
            <p
              style={{
                ...bodyText,
                margin: 0,
                fontWeight: "600",
                color: "#18181b",
              }}
            >
              {articleTitle}
            </p>
          </td>
        </tr>
      </table>

      {/* CTA */}
      <table cellPadding={0} cellSpacing={0} role="presentation" style={{ margin: "0 0 28px" }}>
        <tr>
          <td>
            <a href={articleUrl} style={{ ...baseButton, backgroundColor: "#10b981" }}>
              View Your Article
            </a>
          </td>
        </tr>
      </table>

      <p style={mutedText}>
        Share it with your network to get more readers! You can also track views and comments from
        your{" "}
        <a
          href="https://thecoregamer.com/admin"
          style={{ color: ACCENT, textDecoration: "none" }}
        >
          author dashboard
        </a>
        .
      </p>
    </EmailLayout>
  );
}

export function renderArticleApprovedEmail(
  displayName: string,
  articleTitle: string,
  articleUrl: string
): Promise<string> {
  return renderAsync(
    <ArticleApprovedEmail
      displayName={displayName}
      articleTitle={articleTitle}
      articleUrl={articleUrl}
    />
  );
}
