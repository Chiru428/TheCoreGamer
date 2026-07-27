import { GET } from './src/app/api/admin/workers/health/route';

async function main() {
  try {
    // Mock request
    const req = new Request('http://localhost:3000/api/admin/workers/health', {
      headers: {
        cookie: 'test-cookie=1' // We will temporarily mock requireRole to bypass it
      }
    });

    const res = await GET(req);
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (e) {
    console.error("Unhandled error:", e);
  }
}
main();
