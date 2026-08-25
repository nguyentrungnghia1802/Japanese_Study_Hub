export enum QuestionType {
  MULTIPLE_CHOICE_SINGLE = 'MULTIPLE_CHOICE_SINGLE',
  READING_PASSAGE = 'READING_PASSAGE',
  LISTENING_AUDIO = 'LISTENING_AUDIO',
}

export enum ContextType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
}

export enum AttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  EXPIRED = 'EXPIRED',
}

export enum ImportType {
  FLASHCARD_SET = 'FLASHCARD_SET',
  EXAM = 'EXAM',
}

export enum DuplicatePolicy {
  RENAME = 'RENAME',
  OVERWRITE = 'OVERWRITE',
  REJECT = 'REJECT',
  CREATE_NEW = 'CREATE_NEW',
  FAIL = 'FAIL',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}
