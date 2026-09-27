import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from './types';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { MesasScreen } from '../screens/MesasScreen';
import { CatalogoScreen } from '../screens/CatalogoScreen';
import { ComandaDetalhesScreen } from '../screens/ComandaDetalhesScreen';
import { PerfilScreen } from '../screens/PerfilScreen';
import { COLORS } from '../constants/theme';
import { LayoutGrid, Coffee, User } from 'lucide-react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.bgCard,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="MesasTab"
        component={MesasScreen}
        options={{
          tabBarLabel: 'Mapa de Mesas',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <LayoutGrid size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="CatalogoTab"
        component={CatalogoScreen}
        options={{
          tabBarLabel: 'Catálogo',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Coffee size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={PerfilScreen}
        options={{
          tabBarLabel: 'Meu Turno',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export const AppNavigator: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="ComandaDetalhes" component={ComandaDetalhesScreen} />
            <Stack.Screen name="Catalogo" component={CatalogoScreen} />
            <Stack.Screen name="Perfil" component={PerfilScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
