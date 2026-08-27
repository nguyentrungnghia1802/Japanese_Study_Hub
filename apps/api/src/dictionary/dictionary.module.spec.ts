import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { DictionaryController } from './dictionary.controller.js';
import { DictionaryModule } from './dictionary.module.js';

describe('DictionaryModule integration wiring', () => {
  it('registers the controller and provider boundary as one Nest module', async () => {
    const module = await Test.createTestingModule({ imports: [DictionaryModule] }).compile();
    expect(module.get(DictionaryController)).toBeInstanceOf(DictionaryController);
  });
});
