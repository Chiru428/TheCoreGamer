import * as React from "react";
import { renderAsync } from "@react-email/components";
import { EmailLayout, heading1, bodyText, mutedText } from "./layout";

export interface AccountDeletedEmailProps {
  displayName: string;
}

export default function AccountDeletedEmail({ displayName }: AccountDeletedEmailProps) {
  return (
    <EmailLayout preview="Your TheCoreGamer account has been deleted">
      <h1 style={heading1}>Your account has been deleted</h1>
      <p style={bodyText}>
        Hi <strong>{displayName}</strong>, this confirms that your TheCoreGamer account has been
        deleted as requested.
      </p>
      <p style={bodyText}>
        Your profile information has been anonymized and personal data such as bookmarks, reading
        lists, and notifications has been removed. Comments you posted remain
        visible but are no longer associated with your account.
      </p>
      <p style={mutedText}>
        If you didn&apos;t request this, please contact our support team immediately.
      </p>
    </EmailLayout>
  );
}

export function renderAccountDeletedEmail(props: AccountDeletedEmailProps): Promise<string> {
  return renderAsync(<AccountDeletedEmail {...props} />);
}
