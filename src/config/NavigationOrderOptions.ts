import Bell from 'lucide-react-native/icons/bell';
import FolderHeart from 'lucide-react-native/icons/folder-heart';
import House from 'lucide-react-native/icons/house';
import History from 'lucide-react-native/icons/rotate-ccw-clock';
import Search from 'lucide-react-native/icons/search';
import UserCog from 'lucide-react-native/icons/user-cog';
import { t } from 'i18n/translate';
import {
  ACCOUNT_TAB,
  BOOKMARKS_TAB,
  HOME_TAB,
  NOTIFICATIONS_TAB,
  RECENT_TAB,
  SEARCH_TAB,
} from 'Navigation/navigationRoutes';
import { NavigationOrderItem } from 'Component/NavigationOrderSetting/NavigationOrderSetting.type';

export const getTVNavigationOrderItems = (): NavigationOrderItem[] => [
  {
    value: NOTIFICATIONS_TAB,
    label: t('Notifications'),
    IconComponent: Bell,
  },
  {
    value: HOME_TAB,
    label: t('Home'),
    IconComponent: House,
  },
  {
    value: RECENT_TAB,
    label: t('Recent'),
    IconComponent: History,
  },
  {
    value: SEARCH_TAB,
    label: t('Search'),
    IconComponent: Search,
  },
  {
    value: BOOKMARKS_TAB,
    label: t('Bookmarks'),
    IconComponent: FolderHeart,
  },
];

export const getMobileNavigationOrderItems = (): NavigationOrderItem[] => [
  {
    value: HOME_TAB,
    label: t('Home'),
    IconComponent: House,
  },
  {
    value: SEARCH_TAB,
    label: t('Search'),
    IconComponent: Search,
  },
  {
    value: BOOKMARKS_TAB,
    label: t('Bookmarks'),
    IconComponent: FolderHeart,
  },
  {
    value: RECENT_TAB,
    label: t('Recent'),
    IconComponent: History,
  },
  {
    value: ACCOUNT_TAB,
    label: t('Account'),
    IconComponent: UserCog,
  },
];