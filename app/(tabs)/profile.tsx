import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hello, User</Text>
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Friends</Text>
          <Text style={styles.statNumber}>12</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Recipes</Text>
          <Text style={styles.statNumber}>8</Text>
        </View>
      </View>

      {/* Horizontal Tabs (Titles) */}
      <View style={styles.tabsContainer}>
        <Text style={[styles.tab, styles.activeTab]}>MyRecipes</Text>
        <Text style={styles.tab}>Liked</Text>
        <Text style={styles.tab}>MealPlan</Text>
      </View>

      {/* Placeholder for content */}
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Your content will appear here</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center', // Center the text horizontally
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '700',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 16,
    color: '#444',
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 8,
  },
  tab: {
    fontSize: 16,
    color: '#666',
  },
  activeTab: {
    color: '#007AFF',
    fontWeight: '600',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
});
