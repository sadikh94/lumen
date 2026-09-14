import { useConfigContext } from 'Context/ConfigContext';
import { useNetworkContext } from 'Context/NetworkContext';
import { useServiceContext } from 'Context/ServiceContext';
import { useQuery } from '@tanstack/react-query';
import { FilmRatingsInterface } from 'Type/FilmRatings.interface';
import { enqueueRatingRequest } from 'Util/RatingRequestQueue';
import {
  getCachedFilmRatings,
  saveCachedFilmRatings,
} from 'Util/RatingStore';
import { queryKeys } from 'Util/Query';

const RATING_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export const useFilmRatings = (filmId?: string, isVisible = true) => {
  const { ratingSource } = useConfigContext();
  const { isInternetAvailable } = useNetworkContext();
  const { currentService } = useServiceContext();

  const serviceType = currentService.type;

  const cached = filmId
    ? getCachedFilmRatings(serviceType, filmId)
    : null;

  const enabled = (
    Boolean(filmId)
    && ratingSource !== 'off'
    && isInternetAvailable
    && isVisible
  );

  const query = useQuery<FilmRatingsInterface>({
    queryKey: queryKeys.filmRatings(serviceType, filmId ?? ''),
    queryFn: () => enqueueRatingRequest(
      `${serviceType}:${filmId ?? ''}`,
      async () => {
        const ratings = await currentService.getFilmRatings(filmId ?? '');

        if (Object.keys(ratings).length > 0) {
          saveCachedFilmRatings(serviceType, filmId ?? '', ratings);
        }

        return ratings;
      },
    ),
    enabled,
    initialData: cached?.ratings,
    initialDataUpdatedAt: cached?.checked
      ? cached.updatedAt
      : 0,
    staleTime: RATING_CACHE_TTL,
    gcTime: RATING_CACHE_TTL,
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const rating = ratingSource === 'imdb'
    ? query.data?.imdb
    : ratingSource === 'kinopoisk'
      ? query.data?.kinopoisk
      : undefined;

  return {
    ...query,
    rating,
  };
};

export default useFilmRatings;
