import React, { useState } from 'react';
import { StyleSheet, View, TextInput, ScrollView, TouchableOpacity, Modal, Image } from 'react-native';
import { Text } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';

export default function ExploreScreen() {
  const categories = ['Healthy', 'Quick', 'Low-Budget', 'Lunch', 'Dinner', 'Vegan', 'Dessert'];
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openRecipe = (r: any) => {
    setSelectedRecipe(r);
    setModalVisible(true);
  };

  const closeRecipe = () => {
    setModalVisible(false);
    setSelectedRecipe(null);
  };

  const recipes = [
    {
      name: 'Green Goddess Smoothie',
      desc: 'A refreshing blender smoothie packed with spinach and banana.',
      ingredients: ['Spinach', 'Banana', 'Almond milk', 'Chia seeds', 'Honey'],
      tags: ['Healthy', 'Quick', 'Breakfast'],
      image: require('../../assets/images/green_smoothie.png'),
    },
    {
      name: '15-min Chickpea Curry',
      desc: 'A spicy, budget-friendly vegan curry served with rice.',
      ingredients: ['Chickpeas', 'Tomato', 'Onion', 'Curry powder', 'Garlic'],
      tags: ['Vegan', 'Low-Budget', 'Quick', 'Dinner'],
      image: require('../../assets/images/chickpea_curry.png'),
    },
    {
      name: 'Avocado Toast Deluxe',
      desc: 'Creamy avocado on toasted sourdough with chili flakes.',
      ingredients: ['Sourdough', 'Avocado', 'Lemon', 'Chili flakes', 'Olive oil'],
      tags: ['Quick', 'Breakfast', 'Healthy'],
      image: require('../../assets/images/avocado_toast.png'),
    },
    {
      name: 'One-Pan Lemon Chicken',
      desc: 'Simple roasted chicken with lemon and herbs, easy cleanup.',
      ingredients: ['Chicken thighs', 'Lemon', 'Rosemary', 'Potatoes', 'Olive oil'],
      tags: ['Dinner', 'Low-Budget'],
      image: require('../../assets/images/lemon_chicken.png'),
    },
    {
      name: 'Chocolate Mug Cake',
      desc: 'Single-serving dessert ready in 2 minutes in the microwave.',
      ingredients: ['Flour', 'Cocoa powder', 'Sugar', 'Egg', 'Milk'],
      tags: ['Dessert', 'Quick'],
      image: require('../../assets/images/mug_cake.png'),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EXPLORE</Text>
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
          {recipes.map((r, index) => (
            <View key={index} style={styles.recipeBox}>
              <TouchableOpacity style={styles.cardBody} activeOpacity={0.9} onPress={() => openRecipe(r)}>
                {/* Image first */}
                <View style={styles.recipeImageWrapper}>
                  {r.image ? (
                    <Image source={r.image} style={styles.recipeImageWide} />
                  ) : (
                    <View style={styles.recipeImageWide} />
                  )}

                  {/* overlay buttons on image */}
                  <View style={styles.imageOverlayButtons} pointerEvents="box-none">
                    <TouchableOpacity style={styles.overlayCircle}>
                      <FontAwesome name="plus" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.overlayOutline}>
                      <FontAwesome name="heart" size={16} color="#FF4D4D" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.recipeTitle}>{r.name}</Text>
                <Text style={styles.recipeDesc} numberOfLines={3} ellipsizeMode="tail">{r.desc}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        {/* Detail modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedRecipe && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {selectedRecipe.image ? (
                    <Image source={{ uri: selectedRecipe.image }} style={styles.modalImage} />
                  ) : (
                    <View style={[styles.modalImage, { backgroundColor: '#eee' }]} />
                  )}
                  <Text style={styles.modalTitle}>{selectedRecipe.name}</Text>
                  <Text style={styles.modalDesc}>{selectedRecipe.desc}</Text>

                  <View style={styles.tagRow}>
                    {selectedRecipe.tags.map((tag: string) => (
                      <View key={tag} style={styles.tagChip}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.ingredientsLabel}>Ingredients</Text>
                  {selectedRecipe.ingredients.map((ing: string, i: number) => (
                    <Text key={i} style={styles.ingredientItem}>• {ing}</Text>
                  ))}

                  <TouchableOpacity style={styles.closeButton} onPress={closeRecipe}>
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#bfcdb8ff',
    paddingHorizontal: 16,
    paddingTop: 50,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
    borderRadius: 10,
    marginTop: 10,
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
    color: '#568A60',
  },
  recipesContainer: {
    marginTop: 10,
  },
  recipeBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
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
  cardBody: {
    flex: 1,
    paddingBottom: 8,
  },
  recipeImageWide: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  recipeImageWrapper: {
    position: 'relative',
    width: '100%',
  },
  imageOverlayButtons: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayCircle: {
    backgroundColor: 'rgba(91,128,73,0.95)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  overlayOutline: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#FF4D4D',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  actionButtonsInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallButton: {
    backgroundColor: '#5b8049ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  smallOutlineButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF4D4D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
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
  tagRow: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginTop: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#2f5d3a',
  },
  ingredientsLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },
  ingredientsText: {
    fontSize: 13,
    color: '#666',
    maxWidth: 200,
  },
  circleButton: {
    backgroundColor: '#5b8049ff',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  heartButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF4D4D',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 16,
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: '#444',
    marginBottom: 10,
  },
  ingredientItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  closeButton: {
    marginTop: 12,
    backgroundColor: '#5b8049ff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
