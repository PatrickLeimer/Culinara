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

interface ExpandedFriend {
  friendship_id: number;
  friend_id: string;
  friend_username: string | null;
  friend_name: string | null;
  friend_email: string | null;
  created_at: string;
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
    // Get current user ID
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();

    if (id) {
      fetchFriendProfile();
    }
  }, [id]);

  // Don't auto-fetch friends - only fetch when modal opens for performance

  const fetchFriendProfile = async () => {
    if (!id) return;

    try {
      setLoading(true);
      
      // Get current user to check friendship
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const currentUserId = currentUser?.id;
      setCurrentUserId(currentUserId || null);
      
      // Check if current user is friends with this profile user
      let isFriends = false;
      if (currentUserId === id) {
        // Viewing own profile
        isFriends = true;
      } else if (currentUserId) {
        // Check if there's an accepted friendship between current user and profile user
        // Try both directions: current user as requester or addressee
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
      
      // Fetch friend's profile information
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

      // Fetch recipes - all if friends, only public if not
      const recipesQuery = supabase
        .from('Recipes')
        .select('id, name, description, picture, tags, created_at, public')
        .eq('owner', id);
      
      if (!isFriends) {
        recipesQuery.eq('public', true);
      }
      
      const { data: recipesData, error: recipesError } = await recipesQuery
        .order('created_at', { ascending: false });

      if (recipesError) {
        console.error('Error fetching recipes:', recipesError);
        setRecipes([]);
      } else if (recipesData) {
        // Fetch ingredients for all recipes
        const recipeIds = recipesData.map((r: any) => r.id);
        const ingredientsMap: Record<string, string[]> = {};
        
        if (recipeIds.length > 0) {
          const { data: recipeIngredients, error: riError } = await supabase
            .from('Recipe_Ingredients')
            .select(`
              recipe_id,
              Ingredients!Recipe_Ingredients_ingredient_id_fkey (
                name
              )
            `)
            .in('recipe_id', recipeIds);

          if (!riError && recipeIngredients) {
            recipeIngredients.forEach((ri: any) => {
              if (ri.recipe_id && ri.Ingredients?.name) {
                if (!ingredientsMap[ri.recipe_id]) {
                  ingredientsMap[ri.recipe_id] = [];
                }
                ingredientsMap[ri.recipe_id].push(ri.Ingredients.name);
              }
            });
          }
        }

        const mapped: Recipe[] = recipesData.map((r: any) => {
          const pic = r.picture || '';
          const image = pic && typeof pic === 'string' && pic.startsWith('assets/') 
            ? DEFAULT_ASSET_MAP[pic] ?? '' 
            : (pic || '');

          return {
            id: r.id,
            name: r.name,
            desc: r.description,
            tags: r.tags || [],
            ingredients: ingredientsMap[r.id] || [],
            image: image,
            created_at: r.created_at,
            user_id: id,
          };
        });
        setRecipes(mapped);
      }

      // Count friend's friends using RPC function
      try {
        const { data: friendsData, error: friendsError } = await supabase.rpc('get_user_friends_expanded', {
          user_uuid: id
        });
        
        if (friendsError) {
          console.error('Error counting friends:', friendsError);
          // Fallback: count manually
          const { count: friendCountResult, error: countError } = await supabase
            .from('friendships')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'accepted')
            .neq('requester_id', 'addressee_id')
            .or(`requester_id.eq.${id},addressee_id.eq.${id}`);
          
          if (countError) {
            console.error('Error counting friends (fallback):', countError);
          } else {
            setFriendCount(friendCountResult || 0);
          }
        } else {
          setFriendCount(friendsData?.length || 0);
        }
      } catch (error) {
        console.error('Error counting friends:', error);
      }

      // Check friendship status with current user
      if (currentUserId && currentUserId !== id) {
        const { data: friendship1, error: err1 } = await supabase
          .from('friendships')
          .select('status, requester_id')
          .eq('requester_id', currentUserId)
          .eq('addressee_id', id)
          .maybeSingle();
        
        const { data: friendship2, error: err2 } = await supabase
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
            if (friendship.requester_id === currentUserId) {
              setFriendshipStatus('pending_sent');
            } else {
              setFriendshipStatus('pending_received');
            }
          }
        } else {
          setFriendshipStatus('none');
          setIsFollowing(false);
        }
      } else if (currentUserId === id) {
        setFriendshipStatus('accepted'); // Own profile
        setIsFollowing(true);
      }

      // Don't fetch friends list here - fetch when modal opens for performance
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle friends list navigation
  const handleFriendsModalOpen = () => {
    console.log('[UserProfile] Navigating to friends list for user:', id);
    router.push(`/friends/${id}` as any);
  };

  // Handle follow/unfollow toggle
  const handleFollowToggle = async () => {
    if (!currentUserId || !id || currentUserId === id) return;

    try {
      if (friendshipStatus === 'accepted' || isFollowing) {
        // Unfollow: Delete the friendship
        const { error: deleteError } = await supabase
          .from('friendships')
          .delete()
          .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${currentUserId})`);
        
        if (deleteError) {
          console.error('Error unfollowing:', deleteError);
          Alert.alert('Error', 'Failed to unfollow user');
        } else {
          setFriendshipStatus('none');
          setIsFollowing(false);
          setIsFriend(false);
        }
      } else if (friendshipStatus === 'pending_sent') {
        // Cancel friend request
        const { error: deleteError } = await supabase
          .from('friendships')
          .delete()
          .eq('requester_id', currentUserId)
          .eq('addressee_id', id)
          .eq('status', 'pending');
        
        if (deleteError) {
          console.error('Error canceling request:', deleteError);
          Alert.alert('Error', 'Failed to cancel request');
        } else {
          setFriendshipStatus('none');
        }
      } else if (friendshipStatus === 'pending_received') {
        // Accept friend request
        const { error: updateError } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('requester_id', id)
          .eq('addressee_id', currentUserId)
          .eq('status', 'pending');
        
        if (updateError) {
          console.error('Error accepting request:', updateError);
          Alert.alert('Error', 'Failed to accept request');
        } else {
          setFriendshipStatus('accepted');
          setIsFollowing(true);
          setIsFriend(true);
        }
      } else {
        // Send friend request
        const { error: insertError } = await supabase
          .from('friendships')
          .insert({ requester_id: currentUserId, addressee_id: id });
        
        if (insertError) {
          if (insertError.code === '23505') {
            Alert.alert('Error', 'Friend request already exists');
          } else {
            console.error('Error sending request:', insertError);
            Alert.alert('Error', 'Failed to send friend request');
          }
        } else {
          setFriendshipStatus('pending_sent');
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'An unexpected error occurred');
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

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {/* Profile Info */}
          <View style={styles.profileSection}>
            <Text style={styles.profileName}>{getDisplayName()}</Text>
            {userProfile.username && (
              <Text style={styles.profileUsername}>@{userProfile.username}</Text>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <TouchableOpacity 
              style={styles.statBox}
              onPress={handleFriendsModalOpen}
              activeOpacity={0.7}
            >
              <Text style={styles.statLabel}>Friends</Text>
              <Text style={styles.statNumber}>{friendCount}</Text>
            </TouchableOpacity>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Recipes</Text>
              <Text style={styles.statNumber}>{recipeCount}</Text>
            </View>
          </View>

          {/* Follow/Unfollow Button - Only show if not own profile */}
          {currentUserId && currentUserId !== id && (
            <View style={styles.followButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  (friendshipStatus === 'accepted' || isFollowing) && styles.followingButton
                ]}
                onPress={handleFollowToggle}
              >
                <Text style={[
                  styles.followButtonText,
                  (friendshipStatus === 'accepted' || isFollowing) && styles.followingButtonText
                ]}>
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

          {/* Recipes Section */}
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
  friendsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  friendsOfFriendsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  friendsOfFriendsList: {
    marginTop: 12,
  },
  friendOfFriendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  friendOfFriendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  friendOfFriendInfo: {
    flex: 1,
  },
  friendOfFriendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  friendOfFriendUsername: {
    fontSize: 14,
    color: '#568A60',
  },
  friendsList: {
    marginTop: 10,
  },
  friendCard: {
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 12,
    color: '#568A60',
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    maxHeight: '75%',
    width: '100%',
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    padding: 8,
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalFriendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalFriendItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendRequestButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E6F4EA',
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  modalFriendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalFriendInfo: {
    flex: 1,
  },
  modalFriendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  modalFriendUsername: {
    fontSize: 14,
    color: '#568A60',
  },
  emptyFriendsState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyFriendsText: {
    fontSize: 16,
    color: '#888',
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    marginTop: 8,
  },
  followButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  followButton: {
    backgroundColor: '#568A60',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#568A60',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#568A60',
  },
});
