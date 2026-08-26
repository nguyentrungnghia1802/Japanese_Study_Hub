export const MAX_MULTI_FILE_IMPORTS = 20;

export type MultiFileImportStatus =
  'PENDING' | 'PREVIEWING' | 'PREVIEWED' | 'CONFIRMING' | 'IMPORTED' | 'ERROR';

export interface MultiFileImportItem<T> {
  index: number;
  fileName: string;
  status: MultiFileImportStatus;
  preview: T | null;
  error: string | null;
}

export interface TextFileLike {
  name: string;
  text: () => Promise<string>;
}

export function isMarkdownImportFile(fileName: string): boolean {
  const normalized = fileName.toLocaleLowerCase();
  return normalized.endsWith('.md') || normalized.endsWith('.txt');
}

export async function previewFilesSequential<T>(
  files: TextFileLike[],
  preview: (content: string) => Promise<T>,
  onStatus?: (item: MultiFileImportItem<T>) => void,
): Promise<MultiFileImportItem<T>[]> {
  if (files.length > MAX_MULTI_FILE_IMPORTS) {
    throw new Error(`Select no more than ${MAX_MULTI_FILE_IMPORTS} files at once.`);
  }

  const items: MultiFileImportItem<T>[] = files.map((file, index) => ({
    index,
    fileName: file.name,
    status: 'PENDING',
    preview: null,
    error: null,
  }));

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const item = items[index];
    item.status = 'PREVIEWING';
    onStatus?.({ ...item });
    try {
      item.preview = await preview(await file.text());
      item.status = 'PREVIEWED';
      item.error = null;
    } catch (error: unknown) {
      item.status = 'ERROR';
      item.error = error instanceof Error ? error.message : 'Preview failed.';
    }
    onStatus?.({ ...item });
  }

  return items;
}
