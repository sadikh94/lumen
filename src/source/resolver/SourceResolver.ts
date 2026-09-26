import { FilmType } from 'Type/FilmType.type';

import {
  ContentSource,
  CONTENT_SOURCE_PRIORITY,
} from '../types/ContentSource';
import { SourceAdapter } from '../types/SourceAdapter';
import {
  UnifiedExternalId,
  UnifiedExternalIdType,
  UnifiedFilm,
  createUnifiedFilmId,
} from '../types/UnifiedFilm';

const EXTERNAL_ID_PRIORITY: UnifiedExternalIdType[] = [
  UnifiedExternalIdType.IMDB,
  UnifiedExternalIdType.TMDB,
  UnifiedExternalIdType.ANILIST,
  UnifiedExternalIdType.MAL,
  UnifiedExternalIdType.KINOPOISK,
  UnifiedExternalIdType.OTHER,
];

const normalizeExternalId = (value: string): string => (
  value.trim().toLowerCase()
);

const normalizeTitle = (value: string): string => (
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\u0451/g, '\u0435')
    .replace(/[^a-z\u0430-\u044f0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const getContentIdentity = (film: UnifiedFilm): string | null => {
  if (!film.year) {
    return null;
  }

  const title = normalizeTitle(film.originalTitle ?? film.title);

  if (!title) {
    return null;
  }

  return [
    title,
    film.year,
    film.type,
  ].join('|');
};

const getFilmExternalIds = (
  film: UnifiedFilm,
): UnifiedExternalId[] => film.sources.flatMap(
  (source) => source.externalIds
);

const getExternalIdsByType = (
  film: UnifiedFilm,
  type: UnifiedExternalIdType,
): Set<string> => new Set(
  getFilmExternalIds(film)
    .filter((externalId) => externalId.type === type)
    .map((externalId) => normalizeExternalId(externalId.value))
    .filter(Boolean)
);

const hasMatchingExternalId = (
  first: UnifiedFilm,
  second: UnifiedFilm,
): boolean => {
  for (const type of EXTERNAL_ID_PRIORITY) {
    const firstIds = getExternalIdsByType(first, type);
    const secondIds = getExternalIdsByType(second, type);

    if (!firstIds.size || !secondIds.size) {
      continue;
    }

    for (const id of firstIds) {
      if (secondIds.has(id)) {
        return true;
      }
    }

    return false;
  }

  return false;
};

const hasConflictingExternalId = (
  first: UnifiedFilm,
  second: UnifiedFilm,
): boolean => {
  for (const type of EXTERNAL_ID_PRIORITY) {
    const firstIds = getExternalIdsByType(first, type);
    const secondIds = getExternalIdsByType(second, type);

    if (!firstIds.size || !secondIds.size) {
      continue;
    }

    const hasSharedId = Array.from(firstIds).some(
      (id) => secondIds.has(id),
    );

    if (!hasSharedId) {
      return true;
    }
  }

  return false;
};
const hasSameSourceIdentity = (
  first: UnifiedFilm,
  second: UnifiedFilm,
): boolean => {
  for (const firstSource of first.sources) {
    for (const secondSource of second.sources) {
      if (firstSource.source !== secondSource.source) {
        continue;
      }

      if (firstSource.link === secondSource.link) {
        return true;
      }
    }
  }

  return false;
};

const hasSameIdentity = (
  first: UnifiedFilm,
  second: UnifiedFilm,
): boolean => {
  if (hasSameSourceIdentity(first, second)) {
    return true;
  }

  if (hasConflictingExternalId(first, second)) {
    return false;
  }

  if (hasMatchingExternalId(first, second)) {
    return true;
  }

  const firstIdentity = getContentIdentity(first);
  const secondIdentity = getContentIdentity(second);

  if (!firstIdentity || !secondIdentity) {
    return false;
  }

  return firstIdentity === secondIdentity;
};

const cloneSource = (
  source: UnifiedFilm['sources'][number],
): UnifiedFilm['sources'][number] => ({
  ...source,
  externalIds: source.externalIds.map((externalId) => ({ ...externalId })),
});

const mergeSources = (
  target: UnifiedFilm,
  incoming: UnifiedFilm,
): void => {
  incoming.sources.forEach((source) => {
    const existingSource = target.sources.find(
      (item) => item.source === source.source,
    );

    if (!existingSource) {
      target.sources.push(cloneSource(source));

      return;
    }

    source.externalIds.forEach((externalId) => {
      const normalizedValue = normalizeExternalId(externalId.value);
      const alreadyExists = existingSource.externalIds.some(
        (item) => (
          item.type === externalId.type
          && normalizeExternalId(item.value) === normalizedValue
        ),
      );

      if (!alreadyExists) {
        existingSource.externalIds.push({ ...externalId });
      }
    });
  });
};

export class SourceResolver {
  private readonly adapters: Map<ContentSource, SourceAdapter>;

  constructor(adapters: SourceAdapter[]) {
    this.adapters = new Map(
      adapters.map((adapter) => [adapter.source, adapter]),
    );
  }

  getAdapter(source: ContentSource): SourceAdapter | undefined {
    return this.adapters.get(source);
  }

  getAvailableSources(
    film: UnifiedFilm,
  ): ContentSource[] {
    const priority = film.type === FilmType.ANIME
      ? CONTENT_SOURCE_PRIORITY.ANIME
      : CONTENT_SOURCE_PRIORITY.DEFAULT;

    return priority.filter((source) => (
      film.sources.some((item) => item.source === source)
    ));
  }

  getPreferredSource(
    film: UnifiedFilm,
  ): ContentSource | null {
    return this.getAvailableSources(film)[0] ?? null;
  }

  deduplicate(
    films: UnifiedFilm[],
  ): UnifiedFilm[] {
    const result: UnifiedFilm[] = [];

    films.forEach((film) => {
      const existing = result.find((item) => hasSameIdentity(item, film));

      if (!existing) {
        result.push({
          ...film,
          sources: film.sources.map(cloneSource),
        });

        return;
      }

      mergeSources(existing, film);

      const externalIds = getFilmExternalIds(existing);

      existing.id = createUnifiedFilmId(
        externalIds,
        existing.originalTitle,
        existing.title,
        existing.year,
        existing.type,
        existing.id,
      );
    });

    return result;
  }
}