import React from 'react';
import { StyleSheet, View, TextInput } from 'react-native';
import { Text } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';

export default function FriendsScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FRIENDS</Text>
      </View>

      {/* No Friends Message */}
      <View style={styles.centerContent}>
        <Text style={styles.noFriendsText}>No friends yet :(</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#999"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#bfcdb8ff',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center', 
    marginTop: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22, 
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#000000ff', 
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noFriendsText: {
    fontSize: 18,
    color: '#555',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    width: '80%',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
});
