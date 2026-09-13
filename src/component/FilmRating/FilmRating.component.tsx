import { ThemedText } from 'Component/ThemedText';
import { useThemedStyles } from 'Hooks/useThemedStyles';
import { useAppTheme } from 'Theme/context';
import { useFilmRatings } from 'Hooks/useFilmRatings';
import { View } from 'react-native';

import { componentStyles } from './FilmRating.style';

interface FilmRatingProps {
  filmId: string;
}

const getRatingColor = (rating: number) => {
  if (rating <= 5) {
    return 'rgba(220, 38, 38, 0.9)';
  }

  if (rating < 7.5) {
    return 'rgba(234, 139, 0, 0.9)';
  }

  return 'rgba(22, 163, 74, 0.9)';
};

export function FilmRating({ filmId }: FilmRatingProps) {
  const styles = useThemedStyles(componentStyles);
  const { theme } = useAppTheme();
  const { rating } = useFilmRatings(filmId);

  if (typeof rating !== 'number' || !Number.isFinite(rating)) {
    return null;
  }

  return (
    <View
      style={ [
        styles.container,
        { backgroundColor: getRatingColor(rating) },
      ] }
    >
      <ThemedText
        style={ [
          styles.text,
          { color: theme.colors.textOnContrast },
        ] }
      >
        {rating.toFixed(1)}
      </ThemedText>
    </View>
  );
}

export default FilmRating;
