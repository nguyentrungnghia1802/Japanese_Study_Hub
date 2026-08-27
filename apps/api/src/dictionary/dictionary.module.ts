import { Module } from '@nestjs/common';
import { KanjiApiProvider } from './kanjiapi.provider.js';
import { MinhqndDictionaryProvider } from './minhqnd.provider.js';
import { ProviderHttpClient } from './provider-http-client.js';
import { TatoebaProvider } from './tatoeba.provider.js';
import { VietnameseWiktionaryProvider } from './wiktionary.provider.js';

@Module({
  providers: [
    ProviderHttpClient,
    MinhqndDictionaryProvider,
    VietnameseWiktionaryProvider,
    KanjiApiProvider,
    TatoebaProvider,
  ],
  exports: [
    ProviderHttpClient,
    MinhqndDictionaryProvider,
    VietnameseWiktionaryProvider,
    KanjiApiProvider,
    TatoebaProvider,
  ],
})
export class DictionaryModule {}
