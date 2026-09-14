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
import { useConfigContext } from 'Context/ConfigContext';
import { t } from 'i18n/translate';
import { ACCOUNT_TAB, DOWNLOADS_SCREEN, SETTINGS_SCREEN } from 'Navigation/navigationRoutes';
import PanelLeft from 'lucide-react-native/icons/panel-left';
import PanelRight from 'lucide-react-native/icons/panel-right';
import { ComponentType, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useAppTheme } from 'Theme/context';
import { ThemedStyles } from 'Theme/types';
import { ProfileInterface } from 'Type/Profile.interface';
import { setTimeoutSafe } from 'Util/Misc';

import { componentStyles, NAVIGATION_BAR_ANIMATION_DURATION_MS } from './NavigationBar.style.atv';
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
        color: isActiveTab ? '#FFFFFF' : theme.colors.textSecondary,
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
            color={ isActiveTab ? '#FFFFFF' : theme.colors.textSecondary }
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
          style={ [
            styles.tabText,
            isActiveTab && styles.tabContentFocused,
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
        { isMenuOpened && (
          <View style={ styles.profile }>
            <ThemedText
              style={ [
                styles.tabText,
                styles.profileNameText,
                isActiveTab && styles.tabContentFocused,
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
        ) }
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
            isActiveTab && styles.tabSelected,
            isFocused && styles.tabFocused,
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
  const { isLowMode } = useConfigContext();
  const styles = useThemedStyles(componentStyles);
  const { ref, focusKey } = useFocusable({
    focusKey: SIDEBAR_FOCUS_KEY,
    trackChildren: true,
    isFocusBoundary: true,
    focusBoundaryDirections: ['left'],
    saveLastFocusedChild: true,
    forceFocus: true,
  });

  const onTabSelect = useCallback((name: string) => {
    onPress(name);
  }, [onPress]);

  const onTabFocus = useCallback((_name: string) => {
    // Focus only moves between sidebar items. It must never change the route.
  }, []);

  const { topTabs, middleTabs, bottomTabs } = useMemo(() => {
    const tt = [] as { route: NavigationRoute<ParamListBase, string>, index: number }[];
    const mt = [] as { route: NavigationRoute<ParamListBase, string>, index: number }[];
    const bt = [] as { route: NavigationRoute<ParamListBase, string>, index: number }[];

    state.routes.forEach((route, index) => {
      switch (route.name) {
        case ACCOUNT_TAB:
          bt.push({ route, index });
          break;
        case SETTINGS_SCREEN:
          bt.push({ route, index });
          break;
        case DOWNLOADS_SCREEN:
          tt.push({ route, index });
          break;
        default:
          mt.push({ route, index });
          break;
      }
    });

    return { topTabs: tt, middleTabs: mt, bottomTabs: bt };
  }, [state.routes]);

  const renderTab = (
    route: NavigationRoute<ParamListBase, string>,
    index: number
  ) => {
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
            transitionDuration: isLowMode
              ? '0ms'
              : `${NAVIGATION_BAR_ANIMATION_DURATION_MS}ms`,
          },
          isMenuOpen && styles.barOpened,
        ] }
      >
        <ThemedPressable
          focusKey={ SIDEBAR_TOGGLE_FOCUS_KEY }
          onPress={ handleToggleMenu }
          style={ styles.toggleButton }
          contentStyle={ [styles.toggleButtonContent, isMenuOpen && styles.toggleButtonContentOpened] }
        >
          { ({ isFocused }) => {
            const ToggleIcon = isMenuOpen ? PanelRight : PanelLeft;

            return (
              <ToggleIcon
                size={ styles.toggleIcon.width }
                color={ isFocused ? styles.toggleIconFocused.color : styles.toggleIcon.color }
              />
            );
          } }
        </ThemedPressable>

        <ThemedScrollView
          style={ styles.tabs }
          contentContainerStyle={ styles.tabsContent }
        >
          <View>
            { topTabs.map(({ route, index }) => renderTab(route, index)) }
          </View>

          <View style={ styles.middleTabs }>
            { middleTabs.map(({ route, index }) => renderTab(route, index)) }
          </View>

          <View>
            { bottomTabs.map(({ route, index }) => renderTab(route, index)) }
          </View>
        </ThemedScrollView>
      </Animated.View>
    </FocusContext.Provider>
  );
}

export default NavigationBarComponent;
