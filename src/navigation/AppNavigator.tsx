import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { iconSize } from '../theme/tokens';
import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import GoalsScreen from '../screens/GoalsScreen';
import GoalDetailScreen from '../screens/GoalDetailScreen';
import DebtDetailScreen from '../screens/DebtDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CategoriesScreen from '../screens/CategoriesScreen';

export type MainTabParamList = {
  Dashboard: undefined;
  Movimientos: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Goals: undefined;
  GoalDetail: { goalId: string };
  DebtDetail: { debtId: string };
  Profile: undefined;
  Categories: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function HeaderIcons() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();

  return (
    <View style={styles.headerIcons}>
      <TouchableOpacity onPress={() => navigation.navigate('Goals')} style={styles.headerBtn}>
        <Icon name="target" size={iconSize.md} color={colors.green} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.headerBtn}>
        <Icon name="account-circle-outline" size={iconSize.md} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

function HomeIcon({ color }: { color: string }) {
  return <Icon name="home-variant" size={iconSize.md} color={color} />;
}

function CardsIcon({ color }: { color: string }) {
  return <Icon name="credit-card-outline" size={iconSize.md} color={color} />;
}

function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bgCard, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Inicio',
          tabBarIcon: HomeIcon,
        }}
      />
      <Tab.Screen
        name="Movimientos"
        component={TransactionsScreen}
        options={{
          title: 'Movimientos',
          tabBarIcon: CardsIcon,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgCard },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{
          title: 'Varo',
          headerRight: HeaderIcons,
        }}
      />
      <Stack.Screen name="Goals" component={GoalsScreen} options={{ title: 'Metas' }} />
      <Stack.Screen name="GoalDetail" component={GoalDetailScreen} options={{ title: 'Detalle de Meta' }} />
      <Stack.Screen name="DebtDetail" component={DebtDetailScreen} options={{ title: 'Detalle de Deuda' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
      <Stack.Screen name="Categories" component={CategoriesScreen} options={{ title: 'Categorías' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    marginLeft: 16,
    padding: 4,
  },
});
