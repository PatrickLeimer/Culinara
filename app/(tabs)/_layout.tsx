import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

// Tab bar icon helper
function TabBarIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={28} style={{ marginBottom: -15 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: useClientOnlyValue(false, true), // no top header for tabs

        // Make tab bar span full width, flush to bottom, light gray background
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? 'rgba(20,20,20,0.95)' : '#fcfcfd',
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 64,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          borderTopWidth: 0,
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: colorScheme === 'dark' ? 0.35 : 0.08,
          shadowRadius: 8,
        },

        // Add these two lines to adjust spacing
        tabBarLabelStyle: {
          marginTop: 10, // increase to add more space between icon and label
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          headerShown: false,
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon name="compass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon name="user" color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          headerShown: false,
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon name="users" color={color} />,
        }}
      />
    </Tabs>
  );
}
