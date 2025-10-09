import React from 'react';
import { StyleSheet, View, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';

export default function ExploreScreen() {
  const categories = ['Healthy', 'Quick', 'Low-Budget', 'Lunch', 'Dinner', 'Vegan', 'Dessert'];
  const recipes = Array(6).fill(0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <FontAwesome name="bars" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EXPLORE</Text>
        <TouchableOpacity>
          <FontAwesome name="user-circle" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={18} color="#999" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor="#999"
        />
      </View>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Categories */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {categories.map((category, index) => (
            <View key={index} style={styles.categoryBox}>
              <View style={styles.categorySquare} />
              <Text style={styles.categoryLabel}>{category}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Recipes */}
        <Text style={styles.sectionTitle}>Recipes</Text>
        <View style={styles.recipesContainer}>
          {recipes.map((_, index) => (
            <View key={index} style={styles.recipeBox}>
              <View style={styles.recipeInfo}>
                <View style={styles.recipeImage} />
                <View style={styles.recipeText}>
                  <Text style={styles.recipeTitle}>Recipe {index + 1}</Text>
                  <Text style={styles.recipeDesc}>Short description here</Text>
                </View>
              </View>
              <View style={styles.recipeActions}>
                <TouchableOpacity style={styles.iconButton}>
                  <FontAwesome name="plus" size={20} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                  <FontAwesome name="heart-o" size={20} color="#FF4D4D" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
  },
  categoriesScroll: {
    marginBottom: 20,
  },
  categoryBox: {
    alignItems: 'center',
    marginRight: 15,
  },
  categorySquare: {
    width: 80,
    height: 80,
    backgroundColor: '#E8E8E8',
    borderRadius: 15,
  },
  categoryLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#333',
  },
  recipesContainer: {
    marginTop: 10,
  },
  recipeBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  recipeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recipeImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  recipeText: {
    flex: 1,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  recipeDesc: {
    fontSize: 13,
    color: '#666',
  },
  recipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 12,
  },
});
