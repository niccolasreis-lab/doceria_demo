import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { ComandaProvider } from './src/context/ComandaContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ComandaProvider>
          <StatusBar barStyle="light-content" />
          <AppNavigator />
        </ComandaProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
