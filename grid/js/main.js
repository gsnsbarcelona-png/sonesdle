import { GameFactory }            from './GameFactory.js';
import { LoLPlayerRepository }    from './repositories/LoLPlayerRepository.js';
import { LoLCategoryRepository }  from './repositories/LoLCategoryRepository.js';

const [players, categories] = await Promise.all([
  fetch('./data/players.json').then(r => r.json()),
  fetch('./data/categories.json').then(r => r.json()),
]);

GameFactory.create({
  playerRepository:   new LoLPlayerRepository(players),
  categoryRepository: new LoLCategoryRepository(categories),
}).start();
