import { describe, expect, it } from 'vitest';
import {
  isMarkdownImportFile,
  MAX_MULTI_FILE_IMPORTS,
  previewFilesSequential,
  TextFileLike,
} from './multi-file-import.js';

function file(name: string, content: string): TextFileLike {
  return { name, text: async () => content };
}

describe('multi-file import policy', () => {
  it('previews files sequentially and keeps a per-file failure isolated', async () => {
    const order: string[] = [];
    let active = 0;
    let maxActive = 0;
    const items = await previewFilesSequential(
      [file('one.md', 'one'), file('bad.md', 'bad'), file('three.md', 'three')],
      async (content) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        order.push(content);
        await Promise.resolve();
        active -= 1;
        if (content === 'bad') throw new Error('invalid markdown');
        return content.toUpperCase();
      },
    );

    expect(order).toEqual(['one', 'bad', 'three']);
    expect(maxActive).toBe(1);
    expect(items.map((item) => item.status)).toEqual(['PREVIEWED', 'ERROR', 'PREVIEWED']);
    expect(items[0].preview).toBe('ONE');
    expect(items[1].error).toBe('invalid markdown');
    expect(items[2].preview).toBe('THREE');
  });

  it('bounds a batch and accepts only markdown-compatible extensions', async () => {
    expect(isMarkdownImportFile('LESSON.MD')).toBe(true);
    expect(isMarkdownImportFile('notes.txt')).toBe(true);
    expect(isMarkdownImportFile('lesson.pdf')).toBe(false);

    const files = Array.from({ length: MAX_MULTI_FILE_IMPORTS + 1 }, (_, index) =>
      file(`file-${index}.md`, 'content'),
    );
    await expect(previewFilesSequential(files, async () => 'ok')).rejects.toThrow(
      `Select no more than ${MAX_MULTI_FILE_IMPORTS} files at once.`,
    );
  });
});
