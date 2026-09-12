import { FilmPager } from 'Component/FilmPager';
import { Page } from 'Component/Page';

import { HomeScreenComponentProps } from './HomeScreen.type';

export function HomeScreenComponent({
  tabPosition,
  ...pagerHandlers
}: HomeScreenComponentProps) {
  return (
    <Page>
      <FilmPager
        { ...pagerHandlers }
        tabPosition={ tabPosition }
      />
    </Page>
  );
}

export default HomeScreenComponent;
