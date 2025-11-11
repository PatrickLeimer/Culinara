import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { LikesProvider } from '@/components/LikesContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'login', // start with login screen
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LikesProvider>
        <Stack>
        {/* Login screen outside the tabs */}
        <Stack.Screen name="login" options={{ headerShown: false }} />
        
        {/* Signup screen outside the tabs */}
        <Stack.Screen name="signup" options={{ headerShown: false }} />

        {/* Bottom tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* User profile screen - hide tabs, show header */}
        <Stack.Screen 
          name="user/[id]" 
          options={{ 
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right'
          }} 
        />

        </Stack>
      </LikesProvider>
    </ThemeProvider>
  );
}
