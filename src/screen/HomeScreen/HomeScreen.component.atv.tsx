import { FilmPager } from 'Component/FilmPager';
import { Page } from 'Component/Page';

import { HomeScreenComponentProps } from './HomeScreen.type';

export function HomeScreenComponent({
  ...pagerHandlers
}: HomeScreenComponentProps) {
  return (
    <Page>
      <FilmPager
        { ...pagerHandlers }
        menuDefaultFocus
        tabPosition={ tabPosition }
      />
    </Page>
  );
}

export default HomeScreenComponent;
