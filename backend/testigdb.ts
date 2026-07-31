import { getIGDBGame } from './src/lib/igdb'; getIGDBGame(1942).then(g => console.log('Follows:', g.follows));
