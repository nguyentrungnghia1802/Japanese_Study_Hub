import { describe, expect, it } from 'vitest';
import { createFlashcardDraftText } from './lookup-flashcard-dialog.js';

describe('LookupFlashcardDialog (TASK-440)', () => {
  it('prefills Japanese front and Vietnamese/example back without creating a set', () => {
    expect(
      createFlashcardDraftText({
        japanese: '日本語',
        reading: 'にほんご',
        meaning: 'ngôn ngữ Nhật Bản',
        example: '日本語を勉強します。\nTôi học tiếng Nhật.',
      }),
    ).toEqual({
      front: '日本語\nにほんご',
      back: 'ngôn ngữ Nhật Bản\n\n日本語を勉強します。\nTôi học tiếng Nhật.',
    });
  });

  it('accepts a concise mistake draft without adding provider option payloads', () => {
    expect(
      createFlashcardDraftText({
        front: '日本へ行く前に何をしましたか。',
        back: 'Đáp án đúng: 勉強しました\nĐã chọn: 寝ました',
      }),
    ).toEqual({
      front: '日本へ行く前に何をしましたか。',
      back: 'Đáp án đúng: 勉強しました\nĐã chọn: 寝ました',
    });
  });
});
