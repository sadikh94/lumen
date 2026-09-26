import { FilmCardInterface } from 'Type/FilmCard.interface';
import { FilmListInterface } from 'Type/FilmList.interface';
import { FilmInterface } from 'Type/Film.interface';

import { ContentSource } from './ContentSource';
import { UnifiedExternalId, UnifiedFilm } from './UnifiedFilm';

export interface SourceAdapter {
  readonly source: ContentSource;
  readonly name: string;

  /**
   * Returns the source-specific film page.
   *
   * Playback data belongs exclusively to the selected source.
   */
  getFilm(link: string): Promise<FilmInterface | null>;

  /**
   * Search within this source.
   */
  search(query: string, page: number): Promise<FilmListInterface>;

  /**
   * Convert a source-specific film into the common catalog representation.
   */
  normalizeFilm(film: FilmInterface): UnifiedFilm;

  /**
   * Convert a source-specific catalog card into the common catalog representation.
   */
  normalizeFilmCard(film: FilmCardInterface): UnifiedFilm;

  /**
   * Extract external identifiers known by this source.
   */
  getExternalIds(film: FilmInterface): UnifiedExternalId[];
}