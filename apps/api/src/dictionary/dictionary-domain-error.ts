import { DictionaryErrorCode } from '@japanese-learning/contracts';

export class DictionaryDomainError extends Error {
  constructor(public readonly code: DictionaryErrorCode) {
    super(`Dictionary lookup failed: ${code}`);
    this.name = 'DictionaryDomainError';
  }
}
