import { InputNormalizerStrategy } from '../abstracts.js';

export class LoLInputNormalizer extends InputNormalizerStrategy {
  normalize(raw) { return raw.toLowerCase().trim(); }
}
