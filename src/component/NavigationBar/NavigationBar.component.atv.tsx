import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation-react-native-tvos';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { NavigationRoute, ParamListBase } from '@react-navigation/native';
import { ThemedImage } from 'Component/ThemedImage';
import { ThemedPressable } from 'Component/ThemedPressable';
import { ThemedScrollView } from 'Component/ThemedScrollView';
import { ThemedText } from 'Component/ThemedText';
import { useNavigationContext } from 'Context/NavigationContext';
import { useServiceContext } from 'Context/ServiceContext';
import { useThemedStyles } from 'Hooks/useThemedStyles';
import { t } from 'i18n/translate';
import { ACCOUNT_TAB, DOWNLOADS_SCREEN, SETTINGS_SCREEN } from 'Navigation/navigationRoutes';
import PanelLeft from 'lucide-react-native/icons/panel-left';
import PanelRight from 'lucide-react-native/icons/panel-right';
import { ComponentType, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { useAppTheme } from 'Theme/context';
import { ThemedStyles } from 'Theme/types';
import { ProfileInterface } from 'Type/Profile.interface';
import { setTimeoutSafe } from 'Util/Misc';

import {
  componentStyles,
  NAVIGATION_BAR_ANIMATION_DURATION_MS,
  NAVIGATION_BAR_TV_WIDTH_PADDING,
} from './NavigationBar.style.atv';
import { NavigationBarComponentProps } from './NavigationBar.type';

export const SIDEBAR_FOCUS_KEY = 'SIDEBAR';
const SIDEBAR_TOGGLE_FOCUS_KEY = 'SIDEBAR_TOGGLE';
const TAB_SELECT_DEBOUNCE_MS = 400;

const getTabFocusKey = (name: string) => `sidebar-tab-${name}`;

type TabBarLabel = BottomTabNavigationOptions['tabBarLabel'];

type NavigationTabProps = {
  styles: ThemedStyles<typeof componentStyles>,
  name: string,
  label?: TabBarLabel,
  IconComponent?: ComponentType<any>,
  badgeCount: number,
  profile?: ProfileInterface | null,
  isActiveTab: boolean,
  isMenuOpened: boolean,
  onTabSelect: (name: string) => void,
  onTabFocus: (name: string) => void,
  onReload: () => void,
};

const NavigationTab = ({
  styles,
  name,
  label,
  IconComponent,
  badgeCount,
  profile,
  isActiveTab,
  isMenuOpened,
  onTabSelect,
  onTabFocus,
  onReload,
}: NavigationTabProps) => {
  const { theme } = useAppTheme();
  const { isSignedIn } = useServiceContext();

  const renderLabel = (isFocused: boolean) => {
    if (typeof label === 'function') {
      return label({
        focused: isActiveTab,
        color: isActiveTab ? theme.colors.textSecondary : '#8F9190',
        position: 'below-icon',
        children: '',
      });
    }

    return label;
  };

  const renderDefaultTab = (isFocused: boolean) => (
    <>
      <View>
        { IconComponent && (
          <IconComponent
            style={ styles.tabIcon }
            size={ styles.tabIcon.width }
            color={ isActiveTab ? theme.colors.textSecondary : '#8F9190' }
          />
        ) }
        { badgeCount > 0 && (
          <ThemedText style={ styles.badge }>
            { badgeCount }
          </ThemedText>
        ) }
      </View>
      { isMenuOpened && (
        <ThemedText
          numberOfLines={ 1 }
          style={ [
            styles.tabText,
            {
              color: isActiveTab ? theme.colors.textSecondary : '#8F9190',
            },
          ] }
        >
          { renderLabel(isFocused) }
        </ThemedText>
      ) }
    </>
  );

  const renderAccountTab = (isFocused: boolean) => {
    const { avatar } = profile ?? {};

    return (
      <>
        <View style={ styles.profileAvatarContainer }>
          { avatar ? (
            <ThemedImage
              src={ avatar }
              style={ styles.profileAvatar }
            />
          ) : (
            <Image
              source={ require('../../../assets/images/no_avatar.png') }
              style={ styles.profileAvatar }
            />
          ) }
        </View>
        <View style={ styles.profile }>
          <ThemedText
            style={ [
              styles.tabText,
              styles.profileNameText,
              {
                color: isActiveTab ? theme.colors.textSecondary : '#8F9190',
              },
            ] }
          >
            { renderLabel(isFocused) }
          </ThemedText>
          <ThemedText
            style={ [
              styles.tabText,
              styles.profileSwitchText,
            ] }
          >
            { isSignedIn ? t('You') : t('Sign in') }
          </ThemedText>
        </View>
      </>
    );
  };

  return (
    <ThemedPressable
      focusKey={ getTabFocusKey(name) }
      onFocus={ () => onTabFocus(name) }
      onPress={ () => onTabSelect(name) }
      onEnterPress={ () => onTabSelect(name) }
      style={ styles.tabButton }
      contentStyle={ styles.tabButtonContent }
    >
      { ({ isFocused }) => (
        <View
          style={ [
            styles.tab,

          ] }
        >
          { name === ACCOUNT_TAB ? renderAccountTab(isFocused) : renderDefaultTab(isFocused) }
        </View>
      ) }
    </ThemedPressable>
  );
};

const MemoizedNavigationTab = memo(NavigationTab);

export function NavigationBarComponent({
  state,
  descriptors,
  profile,
  onPress,
  onReload,
}: NavigationBarComponentProps) {
  const { badgeData } = useServiceContext();
  const { isMenuOpen, toggleMenu } = useNavigationContext();
  const styles = useThemedStyles(componentStyles);
  const { scale, theme } = useAppTheme();
  const { top, bottom, left } = useSafeAreaInsets();

  const { ref, focusKey } = useFocusable({
    focusKey: SIDEBAR_FOCUS_KEY,
    trackChildren: true,
    isFocusBoundary: true,
    focusBoundaryDirections: ['left'],
    saveLastFocusedChild: false,
    preferredChildFocusKey: state.routes[state.index]?.name
      ? getTabFocusKey(state.routes[state.index].name)
      : undefined,
    forceFocus: true,
  });

  const onTabSelect = useCallback((name: string) => {
    onPress(name);
  }, [onPress]);

  const onTabFocus = useCallback((_name: string) => {
    // Focus only moves between sidebar items. It must never change the route.
  }, []);

  const { topTabs, middleTabs, bottomTabs } = useMemo(() => {
    const tt = [] as NavigationRoute<ParamListBase, string>[];
    const mt = [] as NavigationRoute<ParamListBase, string>[];
    const bt = [] as NavigationRoute<ParamListBase, string>[];

    state.routes.forEach((route) => {
      switch (route.name) {
        case ACCOUNT_TAB:
          bt.push(route);
          break;
        case SETTINGS_SCREEN:
          bt.push(route);
          break;
        case DOWNLOADS_SCREEN:
          tt.push(route);
          break;
        default:
          mt.push(route);
          break;
      }
    });

    return { topTabs: tt, middleTabs: mt, bottomTabs: bt };
  }, [state.routes]);

  const renderTab = (
    route: NavigationRoute<ParamListBase, string>,
  ) => {
    const index = state.routes.findIndex((item) => item.key === route.key);
    const { options } = descriptors[route.key] ?? {};

    return (
      <MemoizedNavigationTab
        key={ route.name }
        styles={ styles }
        name={ route.name }
        label={ options?.tabBarLabel }
        IconComponent={ options?.tabBarIcon }
        badgeCount={ badgeData[route.name] || 0 }
        profile={ route.name === ACCOUNT_TAB ? profile : undefined }
        isActiveTab={ state.index === index }
        isMenuOpened={ isMenuOpen }
        onTabSelect={ onTabSelect }
        onTabFocus={ onTabFocus }
        onReload={ onReload }
      />
    );
  };

  const handleToggleMenu = () => {
    toggleMenu(!isMenuOpen);
  };

  return (
    <FocusContext.Provider value={ focusKey }>
      <Animated.View
        ref={ ref }
        style={ [
          styles.bar,
          {
            paddingTop: top,
            paddingBottom: bottom,
            paddingLeft: scale(NAVIGATION_BAR_TV_WIDTH_PADDING) + left,
            transitionDuration: `${NAVIGATION_BAR_ANIMATION_DURATION_MS}ms`,
          },
          isMenuOpen && styles.barOpened,
        ] }
      >
        <ThemedPressable
          focusKey={ SIDEBAR_TOGGLE_FOCUS_KEY }
          onPress={ handleToggleMenu }
          style={ styles.toggleButton }
          contentStyle={ styles.toggleButtonContent }
        >
          { ({ isFocused }) => {
            const ToggleIcon = isMenuOpen ? PanelRight : PanelLeft;

            return (
              <View
                style={[
                  styles.toggleButtonInner,
                  !isMenuOpen && styles.toggleButtonInnerCollapsed,
                ]}
              >
                <ToggleIcon
                  size={ styles.toggleIcon.width }
                  color='#8F9190'
                />
                { isMenuOpen && (
                  <ThemedText
                    style={ [
                      styles.toggleText,
                      isFocused && styles.toggleTextFocused,
                    ] }
                  >
                    Свернуть
                  </ThemedText>
                ) }
              </View>
            );
          } }
        </ThemedPressable>

        <ThemedScrollView
          style={ styles.tabs }
          contentContainerStyle={ styles.tabsContent }
        >
          { topTabs.map((route) => renderTab(route)) }

          <View style={ styles.middleTabs }>
            { middleTabs.map((route) => renderTab(route)) }
          </View>

          { bottomTabs.map((route) => renderTab(route)) }
        </ThemedScrollView>
      </Animated.View>
    </FocusContext.Provider>
  );
}

export default NavigationBarComponent;
