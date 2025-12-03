import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  DeviceEventEmitter,
  RefreshControl,
  Animated,
  ActivityIndicator,
} from 'react-native';
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
  const [loading, setLoading] = useState(true);

  // Animations
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

  // --- Fetch recipes ---
  const fetchPublicRecipes = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('Recipes')
        .select('id, name, description, picture, tags, created_at, owner')
        .eq('public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let mapped: Recipe[] = [];
      if (data?.length) {
        mapped = data.map((d: any) => {
          const pic = d.picture || '';
          const image =
            pic && typeof pic === 'string' && pic.startsWith('assets/')
              ? DEFAULT_ASSET_MAP[pic] ?? ''
              : pic;
          const parsedTags = Array.isArray(d.tags)
            ? d.tags
            : typeof d.tags === 'string'
            ? JSON.parse(d.tags)
            : [];
          return {
            id: d.id,
            name: d.name,
            desc: d.description,
            tags: parsedTags,
            ingredients: [],
            image,
            created_at: d.created_at,
            user_id: d.owner,
          };
        });
      }

      const recipesToUse = mapped.length ? mapped : MOCK_RECIPES;
      setAllRecipes(recipesToUse);
      setRecipes(recipesToUse);
    } catch (err) {
      console.error('Error fetching public recipes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPublicRecipes();
    const sub = DeviceEventEmitter.addListener('recipesUpdated', fetchPublicRecipes);
    return () => {
      try {
        sub.remove();
      } catch {}
    };
  }, []);

  // --- Filters ---
  useEffect(() => {
    let filtered = [...allRecipes];
    const query = searchQuery.trim().toLowerCase();

    if (query) {
      filtered = filtered.filter((recipe) => {
        const nameMatch = recipe.name?.toLowerCase().includes(query);
        const descMatch = recipe.desc?.toLowerCase().includes(query);
        const tagsMatch = recipe.tags?.some((t) => t.toLowerCase().includes(query));
        const ingredientsMatch = recipe.ingredients?.some((i) =>
          i.toLowerCase().includes(query)
        );
        return nameMatch || descMatch || tagsMatch || ingredientsMatch;
      });
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((recipe) =>
        selectedCategories.every((c) => recipe.tags?.includes(c))
      );
    }

    setRecipes(filtered);
  }, [searchQuery, selectedCategories, allRecipes]);

  // --- Animations on mount ---
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerTranslateY, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(searchOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
      Animated.spring(searchScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();

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

  // Animate recipe cards on filter
  useEffect(() => {
    recipes.forEach((_, i) => {
      if (!recipeAnimations[i]) recipeAnimations[i] = new Animated.Value(0);
      Animated.timing(recipeAnimations[i], {
        toValue: 1,
        duration: 400,
        delay: i * 60,
        useNativeDriver: true,
      }).start();
    });
  }, [recipes]);

  // --- Handlers ---
  const onRefresh = () => fetchPublicRecipes(true);

  const toggleCategory = (category: string, index: number) => {
    const anim = categoryAnimations[index];
    Animated.sequence([
      Animated.spring(anim.scale, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(anim.scale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleHeartPress = async (recipe: Recipe) => {
    const id = String(recipe?.id ?? '');
    if (!id) return;
    try {
      if (isLiked(id)) await unlike(id);
      else await like({ recipe_id: id });
    } catch (e) {
      console.error('Failed to toggle like for', id, e);
    }
  };

  const handlePlusPress = (recipe: Recipe) => {
    console.log('Add to meal plan:', recipe.name);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#568A60" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] },
        ]}
      >
        <Text style={styles.headerTitle}>Explore</Text>
        <Text style={styles.headerSubtitle}>Discover amazing recipes</Text>
      </Animated.View>

      {/* Search */}
      <Animated.View
        style={[
          styles.searchContainer,
          { opacity: searchOpacity, transform: [{ scale: searchScale }] },
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
          <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery('')}>
            <FontAwesome name="times-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Scroll */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#568A60"
            colors={['#568A60']}
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
          {categories.map((cat, i) => {
            const isSelected = selectedCategories.includes(cat);
            const anim = categoryAnimations[i];
            const shade = ['#568A60', '#4A7C52', '#5B9A6B'][i % 3];
            return (
              <Animated.View
                key={cat}
                style={{
                  opacity: anim.opacity,
                  transform: [{ scale: anim.scale }, { translateX: anim.translateX }],
                }}
              >
                <TouchableOpacity onPress={() => toggleCategory(cat, i)} style={styles.categoryBox}>
                  <View
                    style={[
                      styles.categorySquare,
                      isSelected && [styles.categorySquareSelected, { backgroundColor: shade }],
                    ]}
                  >
                    {isSelected && <FontAwesome name="check" size={20} color="#fff" />}
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      isSelected && [styles.categoryLabelSelected, { color: shade }],
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
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
              <FontAwesome name="search" size={48} color="#999" />
              <Text style={styles.noResultsTitle}>No recipes found</Text>
              <Text style={styles.noResultsText}>Try adjusting your filters</Text>
            </View>
          ) : (
            recipes.map((r, i) => {
              const animValue = recipeAnimations[i] || new Animated.Value(0);
              return (
                <Animated.View
                  key={r.id ?? i}
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
                    showOverlayButtons
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
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginVertical: 24 },
  headerTitle: { fontSize: 32, fontWeight: '700', color: '#000', marginBottom: 6 },
  headerSubtitle: { fontSize: 15, color: '#666' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderColor: '#568A60',
    borderWidth: 1.5,
    borderRadius: 12,
    marginBottom: 24,
    height: 52,
  },
  searchIconContainer: { paddingLeft: 16, paddingRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#000' },
  clearButton: { paddingRight: 16, paddingLeft: 8 },
  scrollContent: { paddingBottom: 100 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#000' },
  clearFiltersText: { fontSize: 14, color: '#568A60', fontWeight: '600' },
  categoriesScroll: { marginBottom: 28 },
  categoriesScrollContent: { paddingRight: 20 },
  categoryBox: { alignItems: 'center', marginRight: 18 },
  categorySquare: {
    width: 72,
    height: 72,
    backgroundColor: '#fff',
    borderColor: '#e0e0e0',
    borderWidth: 2,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categorySquareSelected: {
    borderColor: '#568A60',
    shadowColor: '#568A60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryLabel: { marginTop: 10, fontSize: 12, color: '#888', fontWeight: '600' },
  categoryLabelSelected: { color: '#568A60', fontWeight: '700' },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultCount: { fontSize: 14, color: '#568A60', fontWeight: '600' },
  recipesContainer: { marginTop: 8 },
  noResultsContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  noResultsTitle: { fontSize: 22, fontWeight: '600', color: '#000', marginVertical: 8 },
  noResultsText: { fontSize: 15, color: '#888', textAlign: 'center' },
});
