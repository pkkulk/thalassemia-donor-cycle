import "react-native-reanimated"; // 👈 must be first import

import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";

import { I18nProvider } from "@/lib/i18n";
import { ThemeModeProvider, useThemeMode } from "@/lib/theme";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// 👇 Your first screen
export const unstable_settings = {
  initialRouteName: "index",
};

// Keep splash visible while loading fonts
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
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

  if (!loaded) return null;

  return (
    <I18nProvider>
      <ThemeModeProvider>
        <RootLayoutNav />
      </ThemeModeProvider>
    </I18nProvider>
  );
}
function RootLayoutNav() {
  const { isDark } = useThemeMode();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="choose-role" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="patient-home" options={{ headerShown: false }} />
        <Stack.Screen
          name="book-appointment"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DonorDashboardScreen"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </ThemeProvider>
  );
}
