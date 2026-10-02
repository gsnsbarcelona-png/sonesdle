import { InputNormalizerStrategy } from '../abstracts.js';

export class LoLInputNormalizer extends InputNormalizerStrategy {
  normalize(raw) {
    return raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }
}
