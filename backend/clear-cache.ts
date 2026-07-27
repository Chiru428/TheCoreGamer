import { cacheDeletePattern } from './src/lib/redis';
import 'dotenv/config';
cacheDeletePattern('itad:mapping:*')
  .then(() => console.log('Done'))
  .catch(console.error);
