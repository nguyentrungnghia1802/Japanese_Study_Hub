import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { DictionaryController } from './dictionary.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DictionaryModule } from './dictionary.module.js';
import { ProviderHttpClient } from './provider-http-client.js';

describe('DictionaryModule integration wiring', () => {
  it('registers the controller and provider boundary during Nest bootstrap', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, DictionaryModule],
    }).compile();

    try {
      expect(moduleRef.get(DictionaryController)).toBeInstanceOf(DictionaryController);
      expect(moduleRef.get(ProviderHttpClient)).toBeInstanceOf(ProviderHttpClient);
    } finally {
      await moduleRef.close();
    }
  });
});
