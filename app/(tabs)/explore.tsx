import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, ScrollView, DeviceEventEmitter, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Text } from '@/components/Themed';
import { useLikes } from '@/components/LikesContext';
import { FontAwesome } from '@expo/vector-icons';
import RecipeCard, { Recipe, MOCK_RECIPES, DEFAULT_ASSET_MAP } from '../profile_tabs/recipeCard';

export default function ExploreScreen() {
  const { like, unlike, isLiked } = useLikes();
  const categories = ['Healthy', 'Quick', 'Low-Budget', 'Lunch', 'Dinner', 'Vegan', 'Dessert'];
  const [recipes, setRecipes] = useState<Recipe[]>(MOCK_RECIPES);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>(MOCK_RECIPES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    
    const fetchPublicRecipes = async () => {
      try {
        const { data, error } = await supabase
          .from('Recipes')
          .select('id, name, description, picture, tags, ingredients, created_at, owner')
          .eq('public', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching public recipes:', error);
          return;
        }

        let mapped: Recipe[] = [];
        if (data && data.length) {
          mapped = data.map((d: any) => {
            const pic = d.picture || '';
            const image = pic && typeof pic === 'string' && pic.startsWith('assets/') 
              ? DEFAULT_ASSET_MAP[pic] ?? '' 
              : (pic || '');
            
            return {
              id: d.id,
              name: d.name,
              desc: d.description,
              tags: d.tags || [],
              ingredients: d.ingredients || [],
              image: image,
              created_at: d.created_at,
              user_id: d.owner,
            };
          });
        }

        if (mounted) {
          const recipesToUse = mapped.length ? mapped : MOCK_RECIPES;
          setAllRecipes(recipesToUse);
          setRecipes(recipesToUse);
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

  // Filter recipes based on search query and selected categories
  useEffect(() => {
    let filtered = [...allRecipes];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((recipe) => {
        const nameMatch = recipe.name?.toLowerCase().includes(query);
        const descMatch = recipe.desc?.toLowerCase().includes(query);
        const ingredientsMatch = recipe.ingredients?.some((ing) =>
          ing.toLowerCase().includes(query)
        );
        const tagsMatch = recipe.tags?.some((tag) =>
          tag.toLowerCase().includes(query)
        );
        return nameMatch || descMatch || ingredientsMatch || tagsMatch;
      });
    }

    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((recipe) =>
        selectedCategories.every((category) =>
          recipe.tags?.includes(category)
        )
      );
    }

    setRecipes(filtered);
  }, [searchQuery, selectedCategories, allRecipes]);

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handlePlusPress = (recipe: Recipe) => {
    console.log('Add to meal plan:', recipe.name);
    // TODO: Implement add to meal plan functionality
  };

  const handleHeartPress = async (recipe: Recipe) => {
    const id = String(recipe?.id ?? '');
    if (!id) return;

    try {
      if (isLiked(id)) {
        await unlike(id);
      } else {
        await like({ recipe_id: id });
      }
    } catch (e) {
      console.error('Failed to toggle like for', id, e);
    }
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
          placeholder="Search recipes..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <FontAwesome name="times-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
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
          {categories.map((category, index) => {
            const isSelected = selectedCategories.includes(category);
            return (
              <TouchableOpacity
                key={index}
                onPress={() => toggleCategory(category)}
                style={styles.categoryBox}
              >
                <View style={[
                  styles.categorySquare,
                  isSelected && styles.categorySquareSelected
                ]}>
                  {isSelected && (
                    <FontAwesome name="check" size={24} color="#fff" />
                  )}
                </View>
                <Text style={[
                  styles.categoryLabel,
                  isSelected && styles.categoryLabelSelected
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Recipes */}
        <View style={styles.recipeHeader}>
          <Text style={styles.sectionTitle}>Recipes</Text>
          {(searchQuery || selectedCategories.length > 0) && (
            <Text style={styles.resultCount}>
              {recipes.length} {recipes.length === 1 ? 'result' : 'results'}
            </Text>
          )}
        </View>
        <View style={styles.recipesContainer}>
          {recipes.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <FontAwesome name="search" size={48} color="#999" style={{ marginBottom: 16 }} />
              <Text style={styles.noResultsTitle}>No recipes found</Text>
              <Text style={styles.noResultsText}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : (
            recipes.map((r, index) => (
              <RecipeCard
                key={r.id ?? index}
                recipe={r}
                showOverlayButtons={true}
                onPlusPress={() => handlePlusPress(r)}
                onHeartPress={() => handleHeartPress(r)}
                isLiked={isLiked(String(r.id ?? ''))}
                showLikeButtonInModal={false}
                assetMap={DEFAULT_ASSET_MAP}
              />
            ))
          )}
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  categorySquareSelected: {
    backgroundColor: '#568A60',
  },
  categoryLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#568A60',
    fontWeight: '600',
  },
  categoryLabelSelected: {
    color: '#2f5d3a',
    fontWeight: '700',
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  recipesContainer: {
    marginTop: 10,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});