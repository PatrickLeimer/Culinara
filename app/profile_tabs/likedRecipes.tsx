import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLikes } from '@/components/LikesContext';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import RecipeCard, { Recipe, DEFAULT_ASSET_MAP, MOCK_RECIPES } from './recipeCard';

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

      // Separate valid UUIDs from demo/non-UUID ids to avoid Postgres 22P02 errors
      const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      const validIds = recipeIds.filter((id) => isUuid(String(id)));
      const invalidIds = recipeIds.filter((id) => !isUuid(String(id)));

      let mapped: Recipe[] = [];

      if (validIds.length > 0) {
        const { data, error } = await supabase
          .from('Recipes')
          .select('id, name, description, picture, tags, created_at, owner')
          .in('id', validIds);

        if (error) {
          console.error('Error fetching liked recipes:', error);
        } else if (data) {
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
              ingredients: [],
              image: image,
              created_at: d.created_at,
              user_id: d.owner,
            };
          });
        }
      }

      // Include any local/mock recipes liked during demo (non-UUID ids)
      if (invalidIds.length > 0) {
        const mockMatches = MOCK_RECIPES.filter((r) => invalidIds.includes(String(r.id)));
        if (mockMatches.length) mapped = [...mapped, ...mockMatches];
      }

      setLikedRecipes(mapped);
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
    paddingBottom: 110, // Account for tab bar height (90px) + extra space
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