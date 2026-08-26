export interface TagDto {
  id: string;
  slug: string;
  name: string;
  usageCount?: number;
}

export interface CreateTagDto {
  name: string;
}

export interface UpdateTagDto {
  name: string;
}

export interface SetEntityTagsDto {
  tags: string[];
}

export type TagResponseDto = TagDto;
