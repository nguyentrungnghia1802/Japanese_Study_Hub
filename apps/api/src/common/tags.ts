import { TagDto } from '@japanese-learning/contracts';

export type TagRelation = {
  tag: {
    id: string;
    slug: string;
    name: string;
  };
};

export function mapTagRelations(relations?: TagRelation[]): TagDto[] {
  return (relations ?? []).map(({ tag }) => ({
    id: tag.id,
    slug: tag.slug,
    name: tag.name,
  }));
}
