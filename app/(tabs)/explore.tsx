import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TextInput, ScrollView, DeviceEventEmitter, TouchableOpacity, RefreshControl, Animated } from 'react-native';
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
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const searchScale = useRef(new Animated.Value(0.95)).current;
  const categoryAnimations = useRef(categories.map(() => ({
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0.8),
    translateX: new Animated.Value(20),
  }))).current;
  const recipeAnimations = useRef<Animated.Value[]>([]).current;

  // Helper function to shuffle array randomly
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Helper: clean ingredient display names by stripping " by ..."
  const cleanIngredientName = (name: string) => {
    if (!name) return name;
    const idx = name.toLowerCase().indexOf(' by ');
    return idx >= 0 ? name.slice(0, idx).trim() : name.trim();
  };

  // Helper function to fetch ingredient names per recipe using two-step queries
  const fetchRecipeIngredients = async (recipeIds: string[]): Promise<Record<string, string[]>> => {
    if (recipeIds.length === 0) return {};

    try {
      // Step 1: fetch join rows without embedding to avoid ambiguity (PGRST201)
      const { data: joinRows, error: joinError } = await supabase
        .from('Recipe_Ingredients')
        .select('recipe_id, ingredient_id')
        .in('recipe_id', recipeIds);

      if (joinError) {
        console.error('Error fetching recipe ingredient joins:', joinError);
        return {};
      }

      const ingredientIds = Array.from(
        new Set((joinRows ?? []).map((r: any) => r.ingredient_id).filter(Boolean))
      );

      if (ingredientIds.length === 0) {
        return {};
      }

      // Step 2: fetch ingredient names by IDs
      const { data: ingredients, error: ingError } = await supabase
        .from('Ingredients')
        .select('id, name')
        .in('id', ingredientIds as number[]);

      if (ingError) {
        console.error('Error fetching ingredient names:', ingError);
        return {};
      }

      const nameById = new Map<number, string>();
      (ingredients ?? []).forEach((ing: any) => {
        nameById.set(ing.id, cleanIngredientName(String(ing.name ?? '')));
      });

      const ingredientsMap: Record<string, string[]> = {};
      (joinRows ?? []).forEach((r: any) => {
        const rid = String(r.recipe_id ?? '');
        const name = nameById.get(Number(r.ingredient_id));
        if (!rid || !name) return;
        if (!ingredientsMap[rid]) ingredientsMap[rid] = [];
        ingredientsMap[rid].push(name);
      });

      return ingredientsMap;
    } catch (err) {
      console.error('Unexpected error fetching recipe ingredients:', err);
      return {};
    }
  };

  const fetchPublicRecipes = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    }
    
    try {
      const { data, error } = await supabase
        .from('Recipes')
        .select('id, name, description, picture, tags, created_at, owner')
        .eq('public', true);

      if (error) {
        console.error('Error fetching public recipes:', error);
        return;
      }

      let mapped: Recipe[] = [];
      if (data && data.length) {
        // Fetch ingredients for all recipes
        const recipeIds = data.map((r: any) => r.id);
        const ingredientsMap = await fetchRecipeIngredients(recipeIds);

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
            ingredients: ingredientsMap[d.id] || [],
            image: image,
            created_at: d.created_at,
            user_id: d.owner,
          };
        });
        
        // Randomize the order of recipes
        mapped = shuffleArray(mapped);
      }

      const recipesToUse = mapped.length ? mapped : MOCK_RECIPES;
      setAllRecipes(recipesToUse);
      setRecipes(recipesToUse);
    } catch (err) {
      console.error('Unexpected error fetching public recipes:', err);
    } finally {
      if (isRefreshing) {
        setRefreshing(false);
      }
    }
  };

  // Animate header on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate search bar
    Animated.parallel([
      Animated.timing(searchOpacity, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.spring(searchScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate categories with stagger
    categoryAnimations.forEach((anim, index) => {
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 400,
          delay: 300 + index * 50,
          useNativeDriver: true,
        }),
        Animated.spring(anim.scale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          delay: 300 + index * 50,
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateX, {
          toValue: 0,
          duration: 400,
          delay: 300 + index * 50,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  // Animate recipes when they change
  useEffect(() => {
    // Reset and animate all recipes
    recipes.forEach((_, index) => {
      if (!recipeAnimations[index]) {
        recipeAnimations[index] = new Animated.Value(0);
      } else {
        recipeAnimations[index].setValue(0);
      }
      Animated.timing(recipeAnimations[index], {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    });
  }, [recipes.length]);

  useEffect(() => {
    let mounted = true;
    
    if (mounted) {
      fetchPublicRecipes();
    }

    const sub = DeviceEventEmitter.addListener('recipesUpdated', () => fetchPublicRecipes());

    return () => {
      mounted = false;
      try { sub.remove(); } catch (e) { /* ignore */ }
    };
  }, []);

  const onRefresh = () => {
    fetchPublicRecipes(true);
  };

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

  const toggleCategory = (category: string, index: number) => {
    const anim = categoryAnimations[index];
    const isSelected = selectedCategories.includes(category);
    
    // Animate category selection
    Animated.sequence([
      Animated.spring(anim.scale, {
        toValue: 0.9,
        useNativeDriver: true,
      }),
      Animated.spring(anim.scale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    if (isSelected) {
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
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          }
        ]}
      >
        <Text style={styles.headerTitle}>Explore</Text>
        <Text style={styles.headerSubtitle}>Discover amazing recipes</Text>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            opacity: searchOpacity,
            transform: [{ scale: searchScale }],
          }
        ]}
      >
        <View style={styles.searchIconContainer}>
          <FontAwesome name="search" size={18} color="#568A60" />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search recipes, ingredients, tags..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
            activeOpacity={0.7}
          >
            <FontAwesome name="times-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#568A60"
            colors={["#568A60"]}
          />
        }
      >
        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          {selectedCategories.length > 0 && (
            <TouchableOpacity onPress={() => setSelectedCategories([])}>
              <Text style={styles.clearFiltersText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesScrollContent}
        >
          {categories.map((category, index) => {
            const isSelected = selectedCategories.includes(category);
            const anim = categoryAnimations[index];
            const greenShades = ['#568A60', '#4A7C52', '#5B9A6B', '#4D8B5A', '#6BA87A', '#5C9A6C', '#4F8B5F'];
            const shade = greenShades[index % greenShades.length];
            
            return (
              <Animated.View
                key={index}
                style={{
                  opacity: anim.opacity,
                  transform: [
                    { scale: anim.scale },
                    { translateX: anim.translateX }
                  ],
                }}
              >
                <TouchableOpacity
                  onPress={() => toggleCategory(category, index)}
                  style={styles.categoryBox}
                  activeOpacity={0.7}
                >
                  <Animated.View 
                    style={[
                      styles.categorySquare,
                      isSelected && [styles.categorySquareSelected, { backgroundColor: shade }]
                    ]}
                  >
                    {isSelected && (
                      <Animated.View
                        style={{
                          transform: [{ scale: anim.scale }],
                        }}
                      >
                        <FontAwesome name="check" size={20} color="#fff" />
                      </Animated.View>
                    )}
                  </Animated.View>
                  <Text style={[
                    styles.categoryLabel,
                    isSelected && [styles.categoryLabelSelected, { color: shade }]
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>

        {/* Recipes */}
        <View style={styles.recipeHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recipes</Text>
            {!searchQuery && selectedCategories.length === 0 && (
              <Text style={styles.sectionSubtitle}>Discover new flavors</Text>
            )}
          </View>
          {(searchQuery || selectedCategories.length > 0) && (
            <View style={styles.resultCountContainer}>
              <Text style={styles.resultCount}>
                {recipes.length} {recipes.length === 1 ? 'result' : 'results'}
              </Text>
            </View>
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
            recipes.map((r, index) => {
              const animValue = recipeAnimations[index] || new Animated.Value(0);
              return (
                <Animated.View
                  key={r.id ?? index}
                  style={{
                    opacity: animValue,
                    transform: [
                      {
                        translateY: animValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <RecipeCard
                    recipe={r}
                    showOverlayButtons={true}
                    onPlusPress={() => handlePlusPress(r)}
                    onHeartPress={() => handleHeartPress(r)}
                    isLiked={isLiked(String(r.id ?? ''))}
                    showLikeButtonInModal={false}
                    assetMap={DEFAULT_ASSET_MAP}
                  />
                </Animated.View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '400',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderColor: '#568A60',
    borderWidth: 1.5,
    borderRadius: 12,
    marginBottom: 24,
    paddingHorizontal: 0,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIconContainer: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 0,
  },
  clearButton: {
    paddingRight: 16,
    paddingLeft: 8,
  },
  scrollContent: {
    paddingBottom: 110, // Account for tab bar height (90px) + extra space
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    fontWeight: '400',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#568A60',
    fontWeight: '600',
  },
  categoriesScroll: {
    marginBottom: 28,
  },
  categoriesScrollContent: {
    paddingRight: 20,
  },
  categoryBox: {
    alignItems: 'center',
    marginRight: 18,
  },
  categorySquare: {
    width: 72,
    height: 72,
    backgroundColor: '#fff',
    borderColor: '#e0e0e0',
    borderWidth: 2,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  categorySquareSelected: {
    borderColor: '#568A60',
    shadowColor: '#568A60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryLabel: {
    marginTop: 10,
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  categoryLabelSelected: {
    color: '#568A60',
    fontWeight: '700',
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 28,
    marginBottom: 16,
  },
  resultCountContainer: {
    backgroundColor: '#f0f7f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
  },
  resultCount: {
    fontSize: 13,
    color: '#568A60',
    fontWeight: '600',
  },
  recipesContainer: {
    marginTop: 8,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 20,
  },
  noResultsTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
    marginTop: 8,
  },
  noResultsText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
});