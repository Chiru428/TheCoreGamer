import { renderAsync } from '@react-email/components';
import AccountDeletedEmail from './src/emails/account-deleted';

async function main() {
  try {
    const html = await renderAsync(AccountDeletedEmail({ displayName: 'Test User' }));
    console.log("Success! Rendered HTML length:", html.length);
  } catch (err) {
    console.error("Render Error:", err);
  }
}
main();
