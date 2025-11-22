import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLikes } from '@/components/LikesContext';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import RecipeCard, { Recipe, DEFAULT_ASSET_MAP } from './recipeCard';

export default function LikedRecipes() {
  const { likes, unlike, isLiked } = useLikes();
  const [likedRecipes, setLikedRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLikedRecipes();
  }, [likes]);

  const fetchLikedRecipes = async () => {
    if (!likes.length) {
      setLikedRecipes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const recipeIds = likes.map((like) => like.recipe_id);

      const { data, error } = await supabase
        .from('Recipes')
        .select('id, name, description, picture, tags, ingredients, created_at, owner')
        .in('id', recipeIds);

      if (error) {
        console.error('Error fetching liked recipes:', error);
        setLikedRecipes([]);
        return;
      }

      if (data) {
        const mapped: Recipe[] = data.map((d: any) => {
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
        setLikedRecipes(mapped);
      }
    } catch (err) {
      console.error('Unexpected error fetching liked recipes:', err);
      setLikedRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlike = async (recipe: Recipe) => {
    const id = String(recipe?.id ?? '');
    if (!id) return;
    
    try {
      await unlike(id);
    } catch (e) {
      console.error('Failed to unlike recipe:', e);
    }
  };

  if (loading) {
    return (
      <View style={styles.empty}>
        <FontAwesome name="heart-o" size={48} color="#999" style={{ marginBottom: 16 }} />
        <Text style={styles.emptyText}>Loading liked recipes...</Text>
      </View>
    );
  }

  if (!likedRecipes.length) {
    return (
      <View style={styles.empty}>
        <FontAwesome name="heart-o" size={48} color="#999" style={{ marginBottom: 16 }} />
        <Text style={styles.emptyTitle}>No Liked Recipes Yet</Text>
        <Text style={styles.emptyText}>
          Recipes you like will appear here. Start exploring!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {likedRecipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onHeartPress={() => handleUnlike(recipe)}
          isLiked={true}
          showLikeButtonInModal={true}
          assetMap={DEFAULT_ASSET_MAP}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 12,
    paddingBottom: 30,
  },
  empty: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: { 
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});