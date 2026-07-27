import 'dotenv/config';
import { getPrices } from './src/lib/itad';

async function main() {
  console.log('Starting ITAD test...');
  try {
    // Test with a known ITAD game ID
    const results = await getPrices(['steam:440']);
    console.log('Results:', results);
    console.log('Done!');
  } catch (err) {
    console.error('Error during test:', err);
  }
}

main();

