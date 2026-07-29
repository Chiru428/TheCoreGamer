const fetch = require("node-fetch");

async function run() {
  const res = await fetch("https://the-core-gamer-six.vercel.app/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "dhanavathchiranjeevi123@gmail.com", password: "Chiru@2004" })
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}

run();
