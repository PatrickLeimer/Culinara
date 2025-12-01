// ============================================================================
// FRIEND PROFILE SCREEN - View another user's profile
// ============================================================================
// Displays:
// - Friend's profile info
// - Friend count
// - Recipe count (public only)
// - Friend's public recipes
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import RecipeCard, { Recipe, DEFAULT_ASSET_MAP } from '../profile_tabs/recipeCard';

interface UserProfile {
  id: string;
  name: string | null;
  lastname: string | null;
  username: string | null;
  email: string | null;
}

const FriendProfileScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeCount, setRecipeCount] = useState<number>(0);
  const [friendCount, setFriendCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchFriendProfile();
    }
  }, [id]);

  const fetchFriendProfile = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // =====================================================
      // 1. Fetch friend's profile info
      // =====================================================
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, name, lastname, username, email')
        .eq('id', id)
        .single();

      if (profileError) {
        console.error('Error fetching friend profile:', profileError);
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      // =====================================================
      // 2. Count friend's PUBLIC recipes (same logic as Profile)
      // =====================================================
      const { count: recipeCountResult, error: recipeCountError } = await supabase
        .from('Recipes')
        .select('*', { count: 'exact', head: true })
        .eq('owner', id)
        .eq('public', true);

      if (recipeCountError) {
        console.error('Error counting recipes:', recipeCountError);
      } else {
        setRecipeCount(recipeCountResult || 0);
      }

      // =====================================================
      // 3. Fetch friend's PUBLIC recipes
      // =====================================================
      const { data: recipesData, error: recipesError } = await supabase
        .from('Recipes')
        .select('id, name, description, picture, tags, public, created_at')
        .eq('owner', id)
        .eq('public', true)
        .order('created_at', { ascending: false });

      if (recipesError) {
        console.error('Error fetching recipes:', recipesError);
        setRecipes([]);
      } else if (recipesData) {
        const mapped: Recipe[] = recipesData.map((r: any) => ({
          id: r.id,
          name: r.name,
          desc: r.description || '',
          description: r.description || '',
          ingredients: Array.isArray(r.ingredients) ? r.ingredients : (typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : []),
          tags: r.tags || [],
          public: !!r.public,
          Public: !!r.public,
          picture: r.picture ?? null,
          Picture: r.picture ?? null,
          created_at: r.created_at,
          user_id: id,
        }));
        setRecipes(mapped);
      }

      // =====================================================
      // 4. Count friend's accepted friendships (same logic as Profile)
      // =====================================================
      const { count: friendCountResult, error: friendError } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${id},addressee_id.eq.${id}`);

      if (friendError) {
        console.error('Error counting friends:', friendError);
      } else {
        setFriendCount(friendCountResult || 0);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    if (!userProfile) return 'User';
    if (userProfile.name && userProfile.lastname) {
      return `${userProfile.name} ${userProfile.lastname}`;
    }
    if (userProfile.name) return userProfile.name;
    if (userProfile.username) return userProfile.username;
    if (userProfile.email) return userProfile.email.split('@')[0];
    return 'User';
  };

  // =====================================================
  // Loading & Error States
  // =====================================================
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#568A60" />
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // =====================================================
  // Main UI
  // =====================================================
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <View style={styles.container}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
            <FontAwesome name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Friend's Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Info */}
          <View style={styles.profileSection}>
            <Text style={styles.profileName}>{getDisplayName()}</Text>
            {userProfile.username && (
              <Text style={styles.profileUsername}>@{userProfile.username}</Text>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Friends</Text>
              <Text style={styles.statNumber}>{friendCount}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Recipes</Text>
              <Text style={styles.statNumber}>{recipeCount}</Text>
            </View>
          </View>

          {/* Recipes Section */}
          <View style={styles.recipesSection}>
            <Text style={styles.sectionTitle}>Recipes</Text>
            {recipes.length === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome name="book" size={48} color="#999" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No public recipes yet</Text>
              </View>
            ) : (
              <View style={styles.recipesGrid}>
                {recipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    showLikeButtonInModal={false}
                    assetMap={DEFAULT_ASSET_MAP}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
};

export default FriendProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#bfcdb8ff',
    paddingTop: 50,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#bfcdb8ff',
  },
  backIcon: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#000',
  },
  profileUsername: {
    fontSize: 16,
    color: '#568A60',
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  recipesSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
  recipesGrid: {
    gap: 15,
  },
  backButton: {
    backgroundColor: '#568A60',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    marginBottom: 20,
  },
});
