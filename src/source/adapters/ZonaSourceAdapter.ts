import { FilmCardInterface } from 'Type/FilmCard.interface';
import { FilmListInterface } from 'Type/FilmList.interface';
import { FilmInterface } from 'Type/Film.interface';
import { FilmType } from 'Type/FilmType.type';

import { ContentSource } from '../types/ContentSource';
import {
  UnifiedExternalId,
  UnifiedExternalIdType,
  UnifiedFilm,
  createUnifiedFilmId,
} from '../types/UnifiedFilm';
import { SourceAdapter } from '../types/SourceAdapter';

const ZONA_BASE_URL = 'https://w1.zona.im';

interface ZonaSeasonData {
  slug: string;
  part: number;
  episode_count: number;
  is_banned: boolean;
}

interface ZonaEpisodeData {
  slug: string;
  title: string;
  title_original?: string | null;
  description?: string;
  cover_url?: string;
  part: number;
  duration?: number;
  release_date?: string;
  is_banned: boolean;
  meta?: {
    id: number;
    media_id: number;
  };
}

interface ZonaFilmData {
  slug: string;
  title: string;
  title_original?: string | null;
  title_eng?: string | null;
  description?: string;
  parts?: number;
  cover_url?: string;
  backdrop_url?: string;
  backdrop_id?: number | null;
  age_limit?: number;
  year?: number;
  rating?: number;
  rating_kp?: number | null;
  rating_imdb?: number | null;
  rating_count?: number;
  duration?: number;
  duration_ms?: number;
  directors?: string;
  writers?: string;
  kp_id?: number;
  statuses?: {
    dmca?: boolean;
    memorandum?: boolean;
  };
  upload_date?: string;
  best_quality?: string;
  release_date?: string;
  release_date_ru?: string;
  release_date_dvd?: string | null;
  release_date_bluray?: string | null;
  end_year?: number;
  series_ended?: number;
  seasons?: ZonaSeasonData[];
  episodes?: ZonaEpisodeData[];
  meta?: {
    id?: number;
    media_id?: number;
    embed_url?: string;
    actors?: Array<{
      name: string;
      cover_url?: string;
      role?: string;
    }>;
    tags?: Array<{
      slug: string;
      title: string;
      title_original?: string | null;
      description?: string | null;
      cover_url?: string;
      type: string;
    }>;
    studios?: unknown[];
    sequels?: unknown[];
    relations?: unknown[];
  };
}

interface ZonaRscEntity {
  data: ZonaFilmData;
  poster?: string;
  entityType: 'movie' | 'series';
  seasonSlug?: string;
  episodeSlug?: string;
  defaultSeasonSlug?: string;
  entityTitle?: string;
}

const getFilmTypeFromUrl = (link: string): FilmType => {
  if (link.includes('/tvseries/')) {
    return FilmType.SERIES;
  }

  return FilmType.FILM;
};

const getEntityTypeFromFilmType = (
  type: FilmType,
): 'movie' | 'series' => (
  type === FilmType.SERIES ? 'series' : 'movie'
);

const getYear = (data: ZonaFilmData): number | undefined => data.year;

const extractZonaRsc6Payload = (html: string): string | null => {
  const match = html.match(
    /self\.__next_f\.push\(\[1,"(6:(?:\\.|[^"\\])*)"\]\)/,
  );

  if (!match) {
    return null;
  }

  return JSON.parse(`"${match[1]}"`) as string;
};

const findZonaFilmData = (payload: string): ZonaRscEntity | null => {
  const dataMarker = '"data":{';
  const dataIndex = payload.indexOf(dataMarker);

  if (dataIndex < 0) {
    return null;
  }

  const objectStart = dataIndex + dataMarker.length - 1;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = objectStart; index < payload.length; index += 1) {
    const character = payload[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === '{') {
      depth += 1;
      continue;
    }

    if (character === '}') {
      depth -= 1;

      if (depth === 0) {
        const dataJson = payload.slice(objectStart, index + 1);

        try {
          return {
            data: JSON.parse(dataJson) as ZonaFilmData,
            entityType: payload.includes('"entityType":"series"')
              ? 'series'
              : 'movie',
            seasonSlug: extractRscValue(payload, 'seasonSlug'),
            episodeSlug: extractRscValue(payload, 'episodeSlug'),
            defaultSeasonSlug: extractRscValue(
              payload,
              'defaultSeasonSlug',
            ),
          };
        } catch {
          return null;
        }
      }
    }
  }

  return null;
};

const extractRscValue = (
  payload: string,
  key: string,
): string | undefined => {
  const match = payload.match(
    new RegExp(`"${key}":"((?:\\\\.|[^"\\\\])*)"`, 'i'),
  );

  if (!match) {
    return undefined;
  }

  return JSON.parse(`"${match[1]}"`) as string;
};

const fetchZonaEntity = async (
  link: string,
): Promise<ZonaRscEntity | null> => {
  const response = await fetch(link);

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const payload = extractZonaRsc6Payload(html);

  if (!payload) {
    return null;
  }

  return findZonaFilmData(payload);
};

const parseZonaFilmData = (
  data: ZonaFilmData,
  entityType: 'movie' | 'series',
): FilmInterface => {
  const link = `${ZONA_BASE_URL}/${entityType === 'movie' ? 'movies' : 'tvseries'}/${data.slug}`;
  const type = entityType === 'movie'
    ? FilmType.FILM
    : FilmType.SERIES;

  const externalIds: FilmInterface['externalIds'] = {};

  if (data.kp_id) {
    externalIds.kinopoisk = String(data.kp_id);
  }

  return {
    id: data.slug,
    link,
    type,
    title: data.title,
    originalTitle: data.title_original ?? undefined,
    poster: data.cover_url ?? '',
    largePoster: data.backdrop_url,
    description: data.description,
    releaseDate: data.release_date ?? data.release_date_ru,
    externalIds,
    voices: [],
    hasVoices: false,
    hasSeasons: type === FilmType.SERIES,
  };
};


const extractZonaSearchCards = (html: string): FilmCardInterface[] => {
  const figures = html.match(
    /<figure class="relative flex select-none flex-col[^>]*>.*?<\/figure>/gs,
  ) ?? [];

  return figures.flatMap((figure): FilmCardInterface[] => {
    const linkMatch = figure.match(
      /<a[^>]+href="(\/(?:movies|tvseries)\/[^"]+)"[^>]*>/,
    );

    if (!linkMatch) {
      return [];
    }

    const link = `${ZONA_BASE_URL}${linkMatch[1]}`;
    const type = getFilmTypeFromUrl(link);

    const titleMatch = figure.match(
      /<a[^>]+title="([^"]*)"[^>]*href="\/(?:movies|tvseries)\/[^"]+"/,
    );

    const imgMatch = figure.match(
      /<img[^>]+src="([^"]+)"[^>]*>/,
    );

    const yearMatch = figure.match(
      /<img[^>]+alt="(?:Фильм|Сериал)[^"]*\((\d{4})\)"/,
    );

    const ratingMatch = figure.match(
      /<div class="absolute z-10[^"]*">\s*<svg[^>]*>.*?<\/svg>\s*<span[^>]*>([^<]+)<\/span>/s,
    );

    const titleSpanMatch = figure.match(
      /<span class="line-clamp-2[^"]*">([^<]+)<\/span>/,
    );

    const title = titleMatch?.[1]
      || titleSpanMatch?.[1]
      || linkMatch[1].split('/').pop()
      || '';

    if (!title) {
      return [];
    }

    const year = yearMatch?.[1];

    return [{
      id: linkMatch[1].split('/').pop() ?? link,
      link,
      type,
      poster: imgMatch?.[1] ?? '',
      title,
      subtitle: year ?? '',
      info: ratingMatch?.[1]?.replace(',', '.'),
    }];
  });
};

const fetchZonaSearch = async (
  query: string,
): Promise<FilmListInterface> => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return {
      films: [],
      totalPages: 1,
    };
  }

  const url = `${ZONA_BASE_URL}/search/${encodeURIComponent(normalizedQuery)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Zona search failed with status ${response.status}`);
  }

  const html = await response.text();

  return {
    films: extractZonaSearchCards(html),
    totalPages: 1,
  };
};

const ZonaSourceAdapter: SourceAdapter = {
  source: ContentSource.ZONA,
  name: 'Zona',

  async getFilm(link: string): Promise<FilmInterface | null> {
    const entity = await fetchZonaEntity(link);

    if (!entity) {
      return null;
    }

    return parseZonaFilmData(
      entity.data,
      entity.entityType,
    );
  },

  async search(
    query: string,
    _page: number,
  ): Promise<FilmListInterface> {
    return fetchZonaSearch(query);
  },

  normalizeFilmCard(film: FilmCardInterface): UnifiedFilm {
    const yearMatch = `${film.subtitle} ${film.info ?? ''}`.match(
      /\b(19|20)\d{2}\b/,
    );

    const year = yearMatch ? Number(yearMatch[0]) : undefined;

    return {
      id: createUnifiedFilmId(
        [],
        undefined,
        film.title,
        year,
        film.type,
        `ZONA:${film.id}`,
      ),
      title: film.title,
      year,
      type: film.type,
      poster: film.poster,
      sources: [
        {
          source: ContentSource.ZONA,
          externalIds: [],
          link: film.link,
        },
      ],
    };
  },

  normalizeFilm(film: FilmInterface): UnifiedFilm {
    const externalIds = this.getExternalIds(film);
    const year = film.releaseDate
      ? Number(film.releaseDate.slice(0, 4))
      : undefined;

    return {
      id: createUnifiedFilmId(
        externalIds,
        film.originalTitle,
        film.title,
        year,
        film.type,
        `ZONA:${film.id}`,
      ),
      title: film.title,
      originalTitle: film.originalTitle,
      year,
      type: film.type,
      poster: film.poster,
      largePoster: film.largePoster,
      description: film.description,
      releaseDate: film.releaseDate,
      sources: [
        {
          source: ContentSource.ZONA,
          externalIds,
          link: film.link,
        },
      ],
    };
  },

  getExternalIds(film: FilmInterface): UnifiedExternalId[] {
    const externalIds: UnifiedExternalId[] = [];

    if (film.externalIds?.imdb) {
      externalIds.push({
        type: UnifiedExternalIdType.IMDB,
        value: film.externalIds.imdb,
      });
    }

    if (film.externalIds?.tmdb) {
      externalIds.push({
        type: UnifiedExternalIdType.TMDB,
        value: film.externalIds.tmdb,
      });
    }

    if (film.externalIds?.kinopoisk) {
      externalIds.push({
        type: UnifiedExternalIdType.KINOPOISK,
        value: film.externalIds.kinopoisk,
      });
    }

    return externalIds;
  },
};

export default ZonaSourceAdapter;


