import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, ScrollView, TouchableOpacity, Modal, Image, DeviceEventEmitter } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Text } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import RecipeCard from '../profile_tabs/recipeCard';

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

  // Local mock recipes (used as fallback / demo)
  const initialMock = [
    {
      id: 'mock-1',
      name: 'Green Goddess Smoothie',
      desc: 'A refreshing blender smoothie packed with spinach and banana.',
      ingredients: ['Spinach', 'Banana', 'Almond milk', 'Chia seeds', 'Honey'],
      tags: ['Healthy', 'Quick', 'Breakfast'],
      image: require('../../assets/images/green_smoothie.png'),
    },
    {
      id: 'mock-2',
      name: '15-min Chickpea Curry',
      desc: 'A spicy, budget-friendly vegan curry served with rice.',
      ingredients: ['Chickpeas', 'Tomato', 'Onion', 'Curry powder', 'Garlic'],
      tags: ['Vegan', 'Low-Budget', 'Quick', 'Dinner'],
      image: require('../../assets/images/chickpea_curry.png'),
    },
    {
      id: 'mock-3',
      name: 'Avocado Toast Deluxe',
      desc: 'Creamy avocado on toasted sourdough with chili flakes.',
      ingredients: ['Sourdough', 'Avocado', 'Lemon', 'Chili flakes', 'Olive oil'],
      tags: ['Quick', 'Breakfast', 'Healthy'],
      image: require('../../assets/images/avocado_toast.png'),
    },
    {
      id: 'mock-4',
      name: 'One-Pan Lemon Chicken',
      desc: 'Simple roasted chicken with lemon and herbs, easy cleanup.',
      ingredients: ['Chicken thighs', 'Lemon', 'Rosemary', 'Potatoes', 'Olive oil'],
      tags: ['Dinner', 'Low-Budget'],
      image: require('../../assets/images/lemon_chicken.png'),
    },
    {
      id: 'mock-5',
      name: 'Chocolate Mug Cake',
      desc: 'Single-serving dessert ready in 2 minutes in the microwave.',
      ingredients: ['Flour', 'Cocoa powder', 'Sugar', 'Egg', 'Milk'],
      tags: ['Dessert', 'Quick'],
      image: require('../../assets/images/mug_cake.png'),
    },
  ];

  const [recipes, setRecipes] = useState<any[]>(initialMock);

  // Map of local asset paths to require() so we can render images saved as DB paths
  const assetMap: Record<string, any> = {
    'assets/images/green_smoothie.png': require('../../assets/images/green_smoothie.png'),
    'assets/images/chickpea_curry.png': require('../../assets/images/chickpea_curry.png'),
    'assets/images/avocado_toast.png': require('../../assets/images/avocado_toast.png'),
    'assets/images/lemon_chicken.png': require('../../assets/images/lemon_chicken.png'),
    'assets/images/mug_cake.png': require('../../assets/images/mug_cake.png'),
  };

  useEffect(() => {
    let mounted = true;
    const fetchPublicRecipes = async () => {
      try {
        const { data, error } = await supabase
          .from('Recipes')
          .select('id, Name, Description, Picture, Tags, created_at, user_id')
          .eq('Public', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching public recipes:', error);
          return;
        }

        let mapped: any[] = [];
        if (data && data.length) {
          mapped = data.map((d: any) => {
            const pic = d.Picture || '';
            const image = pic && typeof pic === 'string' && pic.startsWith('assets/') ? assetMap[pic] ?? '' : (pic || '');
            return {
              id: d.id,
              name: d.Name,
              desc: d.Description,
              tags: d.Tags || [],
              ingredients: d.Ingredients || [],
              image: image,
              created_at: d.created_at,
              user_id: d.user_id,
            };
          });
        }

        if (mounted) {
          if (mapped.length) setRecipes(mapped);
          else setRecipes(initialMock);
        }
      } catch (err) {
        console.error('Unexpected error fetching public recipes:', err);
      }
    };

    fetchPublicRecipes();

    const sub = DeviceEventEmitter.addListener('recipesUpdated', fetchPublicRecipes);

    return () => {
      mounted = false;
      try { sub.remove(); } catch (e) { /* ignore */ }
    };
  }, []);

  const handlePlusPress = (recipe: any) => {
    console.log('Add to meal plan:', recipe.name);
    // TODO: Implement add to meal plan functionality
  };

  const handleHeartPress = (recipe: any) => {
    console.log('Like recipe:', recipe.name);
    // TODO: Implement like functionality
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
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
            <RecipeCard
              key={r.id ?? index}
              recipe={r}
              onPress={() => openRecipe(r)}
              showOverlayButtons={true}
              onPlusPress={() => handlePlusPress(r)}
              onHeartPress={() => handleHeartPress(r)}
            />
          ))}
        </View>

        {/* Detail Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedRecipe && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {selectedRecipe.image ? (
                    typeof selectedRecipe.image === 'string' ? (
                      <Image source={{ uri: selectedRecipe.image }} style={styles.modalImage} />
                    ) : (
                      <Image source={selectedRecipe.image} style={styles.modalImage} />
                    )
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
    fontWeight: '600',
  },
  recipesContainer: {
    marginTop: 10,
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