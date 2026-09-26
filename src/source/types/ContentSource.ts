export enum ContentSource {
  ZONA = 'ZONA',
  ANIXART = 'ANIXART',
  REZKA = 'REZKA',
}

export const CONTENT_SOURCE_PRIORITY = {
  DEFAULT: [
    ContentSource.ZONA,
    ContentSource.REZKA,
  ],
  ANIME: [
    ContentSource.ANIXART,
    ContentSource.ZONA,
    ContentSource.REZKA,
  ],
} as const;

export const CONTENT_SOURCE_URLS: Record<ContentSource, string> = {
  [ContentSource.ZONA]: 'https://w1.zona.im',
  [ContentSource.ANIXART]: 'https://anixart.tv',
  [ContentSource.REZKA]: '',
};
