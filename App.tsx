import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ToastProvider } from './src/hooks/useToast';
import AuthStack from './src/navigation/AuthStack';
import AppNavigator from './src/navigation/AppNavigator';

const queryClient = new QueryClient();

function Root() {
  const { isAuthenticated } = useAuth();
  const { mode } = useTheme();

  if (isAuthenticated === null) {
    return null;
  }

  return (
    <>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <NavigationContainer>
        {isAuthenticated ? <AppNavigator /> : <AuthStack />}
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <ToastProvider>
              <Root />
            </ToastProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
