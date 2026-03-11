import { EventBus }               from './EventBus.js';
import { EVENTS }                  from './events.js';
import { AllCellsFilledStrategy }  from './strategies/AllCellsFilledStrategy.js';
import { RandomGridBuilder }       from './strategies/RandomGridBuilder.js';
import { LoLInputNormalizer }      from './strategies/LoLInputNormalizer.js';
import { GameSession }             from './application/GameSession.js';
import { InputCoordinator }        from './application/InputCoordinator.js';
import { GridRenderer }            from './presentation/GridRenderer.js';
import { ProgressRenderer }        from './presentation/ProgressRenderer.js';
import { LivesDisplay }            from './presentation/LivesDisplay.js';
import { ModalPresenter }          from './presentation/ModalPresenter.js';
import { AutocompletePresenter }   from './presentation/AutocompletePresenter.js';
import { EndScreenPresenter }      from './presentation/EndScreenPresenter.js';
import { ParticleSystem }          from './presentation/ParticleSystem.js';

/**
 * Composition root.
 *
 * Usage:
 *   GameFactory.create({
 *     playerRepository,
 *     categoryRepository,
 *     winCondition?,   // default: AllCellsFilledStrategy
 *     gridBuilder?,    // default: RandomGridBuilder
 *     normalizer?,     // default: LoLInputNormalizer
 *     lives?,          // default: 5
 *   }).start();
 */
export class GameFactory {
  static create({ playerRepository, categoryRepository, winCondition, gridBuilder, normalizer, lives }) {
    const bus = new EventBus();

    // Presentation — order matters only for event subscription timing (none here)
    const acPresenter = new AutocompletePresenter(
      bus,
      document.getElementById('playerInput'),
      document.getElementById('acList')
    );
    new GridRenderer(bus, document.getElementById('grid'));
    new ProgressRenderer(bus, document.getElementById('progressRow'));
    new LivesDisplay(bus, document.getElementById('livesRow'));
    new ModalPresenter(bus, document.getElementById('modalOverlay'), document.getElementById('playerInput'));
    new ParticleSystem(bus, document.getElementById('bgCanvas'), document.getElementById('confettiCanvas'));
    new EndScreenPresenter(bus, document.getElementById('victoryOverlay'),  document.getElementById('btnVictoryReplay'),  EVENTS.GAME_WON);
    new EndScreenPresenter(bus, document.getElementById('gameoverOverlay'), document.getElementById('btnGameoverReplay'), EVENTS.GAME_LOST);

    // Application — InputCoordinator holds acPresenter ref for confirmFocused()
    new InputCoordinator(bus, {
      inputEl:    document.getElementById('playerInput'),
      confirmBtn: document.getElementById('btnConfirm'),
      cancelBtn:  document.getElementById('btnCancel'),
      overlayEl:  document.getElementById('modalOverlay'),
      acPresenter,
    });

    return new GameSession({
      bus,
      playerRepository,
      categoryRepository,
      winCondition: winCondition ?? new AllCellsFilledStrategy(),
      gridBuilder:  gridBuilder  ?? new RandomGridBuilder(),
      normalizer:   normalizer   ?? new LoLInputNormalizer(),
      maxLives:     lives        ?? 5,
    });
  }
}
