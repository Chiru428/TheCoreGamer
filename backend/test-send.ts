import { sendNewsletterConfirmationEmail } from "./src/lib/resend";

async function run() {
  try {
    await sendNewsletterConfirmationEmail("test@example.com", "test-token");
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
