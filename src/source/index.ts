import ZonaSourceAdapter from './adapters/ZonaSourceAdapter';
import RezkaSourceAdapter from './adapters/RezkaSourceAdapter';
import { SourceResolver } from './resolver/SourceResolver';

export const sourceAdapters = [
  ZonaSourceAdapter,
  RezkaSourceAdapter,
];

export const sourceResolver = new SourceResolver(sourceAdapters);

export * from './types/ContentSource';
export * from './types/SourceAdapter';
export * from './types/UnifiedFilm';
export { SourceResolver } from './resolver/SourceResolver';
