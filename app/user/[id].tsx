// ============================================================================
// FRIEND PROFILE SCREEN - View another user's profile
// ============================================================================
// Displays:
// - Friend's profile info
// - Friendship system (follow, unfollow, accept request, cancel request)
// - Friend count
// - Recipe count (public only if not friends)
// - Friend's recipes (with ingredients + tags)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
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
  const [isFriend, setIsFriend] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'accepted'>('none');
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();

    if (id) fetchFriendProfile();
  }, [id]);

  const fetchFriendProfile = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const currentUserId = currentUser?.id;
      setCurrentUserId(currentUserId || null);

      // Check friendship
      let isFriends = false;
      if (currentUserId === id) {
        isFriends = true;
      } else if (currentUserId) {
        const { data: friendship1 } = await supabase
          .from('friendships')
          .select('id')
          .eq('status', 'accepted')
          .eq('requester_id', currentUserId)
          .eq('addressee_id', id)
          .limit(1);

        const { data: friendship2 } = await supabase
          .from('friendships')
          .select('id')
          .eq('status', 'accepted')
          .eq('requester_id', id)
          .eq('addressee_id', currentUserId)
          .limit(1);

        if ((friendship1 && friendship1.length > 0) || (friendship2 && friendship2.length > 0)) {
          isFriends = true;
        }
      }
      setIsFriend(isFriends);

      // Fetch user profile
      const { data: profile } = await supabase
        .from('users')
        .select('id, name, lastname, username, email')
        .eq('id', id)
        .single();
      setUserProfile(profile);

      // Fetch recipes
      const recipesQuery = supabase
        .from('Recipes')
        .select('id, name, description, picture, tags, created_at, public')
        .eq('owner', id);

      if (!isFriends) recipesQuery.eq('public', true);

      const { data: recipesData } = await recipesQuery.order('created_at', { ascending: false });

      const recipeIds = recipesData?.map((r: any) => r.id) || [];
      const ingredientsMap: Record<string, string[]> = {};

      if (recipeIds.length > 0) {
        const { data: recipeIngredients } = await supabase
          .from('Recipe_Ingredients')
          .select(`recipe_id, Ingredients (name)`)
          .in('recipe_id', recipeIds);

        recipeIngredients?.forEach((ri: any) => {
          if (ri.recipe_id && ri.Ingredients?.name) {
            if (!ingredientsMap[ri.recipe_id]) ingredientsMap[ri.recipe_id] = [];
            ingredientsMap[ri.recipe_id].push(ri.Ingredients.name);
          }
        });
      }

      const mappedRecipes =
        recipesData?.map((r: any) => {
          const pic = r.picture || '';
          const image =
            pic && typeof pic === 'string' && pic.startsWith('assets/')
              ? DEFAULT_ASSET_MAP[pic] ?? ''
              : (pic || '');
          return {
            id: r.id,
            name: r.name,
            desc: r.description,
            tags: r.tags || [],
            ingredients: ingredientsMap[r.id] || [],
            image,
            created_at: r.created_at,
            user_id: id,
          };
        }) || [];

      setRecipes(mappedRecipes);
      setRecipeCount(mappedRecipes.length);

      // Friend count - use simpler approach
      const friendshipQuery = supabase
        .from('friendships')
        .select('id', { count: 'exact' })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${id},addressee_id.eq.${id}`);
      
      const { data: friendshipData, count: friendCountResult, error: friendCountError } = await friendshipQuery;
      
      console.log('Friend count query result:', { data: friendshipData, count: friendCountResult, error: friendCountError, userId: id });
      
      if (friendCountError) {
        console.error('Error fetching friend count:', friendCountError);
        setFriendCount(0);
      } else {
        setFriendCount(friendCountResult || 0);
      }

      // Friendship status
      if (currentUserId && currentUserId !== id) {
        const { data: friendship1 } = await supabase
          .from('friendships')
          .select('status, requester_id')
          .eq('requester_id', currentUserId)
          .eq('addressee_id', id)
          .maybeSingle();

        const { data: friendship2 } = await supabase
          .from('friendships')
          .select('status, requester_id')
          .eq('requester_id', id)
          .eq('addressee_id', currentUserId)
          .maybeSingle();

        const friendship = friendship1 || friendship2;
        if (friendship) {
          if (friendship.status === 'accepted') {
            setFriendshipStatus('accepted');
            setIsFollowing(true);
          } else if (friendship.status === 'pending') {
            if (friendship.requester_id === currentUserId) setFriendshipStatus('pending_sent');
            else setFriendshipStatus('pending_received');
          }
        } else {
          setFriendshipStatus('none');
          setIsFollowing(false);
        }
      } else if (currentUserId === id) {
        setFriendshipStatus('accepted');
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Error fetching friend profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUserId || !id || currentUserId === id) return;

    try {
      if (friendshipStatus === 'accepted' || isFollowing) {
        await supabase
          .from('friendships')
          .delete()
          .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${currentUserId})`);
        setFriendshipStatus('none');
        setIsFollowing(false);
        setIsFriend(false);
      } else if (friendshipStatus === 'pending_sent') {
        await supabase
          .from('friendships')
          .delete()
          .eq('requester_id', currentUserId)
          .eq('addressee_id', id)
          .eq('status', 'pending');
        setFriendshipStatus('none');
      } else if (friendshipStatus === 'pending_received') {
        await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('requester_id', id)
          .eq('addressee_id', currentUserId)
          .eq('status', 'pending');
        setFriendshipStatus('accepted');
        setIsFollowing(true);
        setIsFriend(true);
      } else {
        await supabase
          .from('friendships')
          .insert({ requester_id: currentUserId, addressee_id: id });
        setFriendshipStatus('pending_sent');
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const getDisplayName = () => {
    if (!userProfile) return 'User';
    if (userProfile.name && userProfile.lastname) return `${userProfile.name} ${userProfile.lastname}`;
    if (userProfile.name) return userProfile.name;
    if (userProfile.username) return userProfile.username;
    if (userProfile.email) return userProfile.email.split('@')[0];
    return 'User';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#568A60" />
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
            <FontAwesome name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.profileSection}>
            <Text style={styles.profileName}>{getDisplayName()}</Text>
            {userProfile.username && <Text style={styles.profileUsername}>@{userProfile.username}</Text>}
            {userProfile.email && <Text style={styles.profileEmail}>{userProfile.email}</Text>}
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

          {/* Follow/Unfollow */}
          {currentUserId && currentUserId !== id && (
            <View style={styles.followButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  (friendshipStatus === 'accepted' || isFollowing) && styles.followingButton,
                ]}
                onPress={handleFollowToggle}
              >
                <Text
                  style={[
                    styles.followButtonText,
                    (friendshipStatus === 'accepted' || isFollowing) && styles.followingButtonText,
                  ]}
                >
                  {friendshipStatus === 'accepted' || isFollowing
                    ? 'Following'
                    : friendshipStatus === 'pending_sent'
                    ? 'Request Sent'
                    : friendshipStatus === 'pending_received'
                    ? 'Accept Request'
                    : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Recipes */}
          <View style={styles.recipesSection}>
            <Text style={styles.sectionTitle}>
              {isFriend || currentUserId === id ? 'Recipes' : 'Public Recipes'}
            </Text>
            {recipes.length === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome name="book" size={48} color="#999" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>
                  {isFriend || currentUserId === id ? 'No recipes yet' : 'No public recipes yet'}
                </Text>
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
  container: { flex: 1, backgroundColor: '#bfcdb8ff', paddingTop: 50 },
  center: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  backIcon: { padding: 8 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  profileSection: { alignItems: 'center', paddingVertical: 20 },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  profileUsername: { fontSize: 16, color: '#568A60' },
  profileEmail: { fontSize: 14, color: '#666' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statBox: { alignItems: 'center' },
  statLabel: { fontSize: 16, color: '#666' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  followButtonContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  followButton: {
    backgroundColor: '#568A60',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  followingButton: { backgroundColor: '#E6F4EA', borderWidth: 1, borderColor: '#568A60' },
  followButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  followingButtonText: { color: '#568A60' },
  recipesSection: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#000', marginBottom: 15 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#888' },
  recipesGrid: { gap: 15 },
  backButton: {
    backgroundColor: '#568A60',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: { color: '#fff', fontWeight: '600' },
  errorText: { fontSize: 18, color: '#d32f2f', marginBottom: 20 },
});
