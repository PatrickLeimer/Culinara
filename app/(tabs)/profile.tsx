// ============================================================================
// PROFILE SCREEN - Component for displaying user profile information
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, DeviceEventEmitter, ScrollView, Animated } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import MyRecipes from '../profile_tabs/myRecipes';
import MealPlan from '../profile_tabs/mealPlan';
import GroceryList from '../profile_tabs/groceryList';
import LikedRecipes from '../profile_tabs/likedRecipes';
import { Recipe } from '../profile_tabs/recipeCard';

interface ExpandedFriend {
  friendship_id: number;
  friend_id: string;
  friend_username: string | null;
  friend_name: string | null;
  friend_email: string | null;
  created_at: string;
}

interface UserProfile {
  name: string | null;
  lastname: string | null;
  username: string | null;
  email: string | null;
}

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'myRecipes' | 'liked' | 'mealPlan' | 'groceries'>('myRecipes');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [recipeCount, setRecipeCount] = useState<number>(0);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [friendCount, setFriendCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-30)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const statsScale = useRef(new Animated.Value(0.9)).current;
  const tabsOpacity = useRef(new Animated.Value(0)).current;
  const tabsTranslateY = useRef(new Animated.Value(20)).current;
  const statIconAnimations = useRef([
    { scale: new Animated.Value(0), rotate: new Animated.Value(0) },
    { scale: new Animated.Value(0), rotate: new Animated.Value(0) },
  ]).current;

  // Animate on mount
  useEffect(() => {
    // Header animation
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(headerTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Stats animation
    Animated.parallel([
      Animated.timing(statsOpacity, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.spring(statsScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animate stat icons
      statIconAnimations.forEach((anim, index) => {
        Animated.parallel([
          Animated.spring(anim.scale, {
            toValue: 1,
            tension: 50,
            friction: 6,
            delay: 400 + index * 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: 1,
            duration: 400,
            delay: 400 + index * 100,
            useNativeDriver: true,
          }),
        ]).start();
      });
    });

    // Tabs animation
    Animated.parallel([
      Animated.timing(tabsOpacity, {
        toValue: 1,
        duration: 500,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.spring(tabsTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 7,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    fetchUserProfile();

    const sub = DeviceEventEmitter.addListener('recipesUpdated', () => {
      console.log('Profile: recipes updated event received, re-fetching...');
      fetchUserProfile();
    });

    return () => {
      try { sub.remove(); } catch (e) { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkAndRefetch = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (mounted && user && userProfile === null) {
        console.log('Auth state changed, refetching profile...');
        fetchUserProfile();
      } else if (mounted && !user) {
        console.log('User logged out, clearing state...');
        setRecipes([]);
        setUserProfile(null);
        setRecipeCount(0);
        setFriendCount(0);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      if (mounted) {
        checkAndRefetch();
      }
    });

    return () => {
      mounted = false;
      try { authListener?.subscription.unsubscribe(); } catch (e) { /* ignore */ }
    };
  }, [userProfile]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Error fetching auth user:', authError);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('name, lastname, username, email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      } else {
        setUserProfile(profile);
      }

      const { count, error: recipeError } = await supabase
        .from('Recipes')
        .select('*', { count: 'exact', head: true })
        .eq('owner', user.id);

      if (recipeError) {
        console.error('Error counting recipes:', recipeError);
      } else {
        setRecipeCount(count || 0);
      }

      const { data: userRecipes, error: userRecipesError } = await supabase
        .from('Recipes')
        .select('id, name, description, picture, tags, public, created_at')
        .eq('owner', user.id)
        .order('created_at', { ascending: false });

      if (userRecipesError) {
        console.error('Error fetching user recipes:', userRecipesError);
        setRecipes([]);
      } else if (userRecipes) {
        // Fetch ingredients for all recipes
        const recipeIds = userRecipes.map((r: any) => r.id);
        const ingredientsMap: Record<string, string[]> = {};
        
        if (recipeIds.length > 0) {
          const { data: recipeIngredients, error: riError } = await supabase
            .from('Recipe_Ingredients')
            .select(`
              recipe_id,
              Ingredients (
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

        const mapped: Recipe[] = userRecipes.map((r: any) => ({
          id: r.id,
          name: r.name,
          desc: r.description || '',
          description: r.description || '',
          ingredients: ingredientsMap[r.id] || [],
          tags: r.tags || [],
          public: !!r.public,
          Public: !!r.public,
          picture: r.picture ?? null,
          Picture: r.picture ?? null,
          created_at: r.created_at,
        }));
        setRecipes(mapped);
        setRecipeCount(mapped.length);
      }

      const { count: friendCountResult, error: friendError } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (friendError) {
        console.error('Error counting friends:', friendError);
      } else {
        setFriendCount(friendCountResult || 0);
      }

      // Don't fetch friends list here - fetch when modal opens for performance
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendsModalOpen = () => {
    console.log('[Profile] Navigating to friends list for current user');
    if (currentUserId) {
      router.push(`/friends/${currentUserId}` as any);
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

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            
            supabase.auth.signOut().catch((error) => {
              console.warn('Logout network error (local session cleared):', error);
            });
            
            router.replace('/login');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#568A60" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
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
        <View style={styles.headerTop}>
          <View style={styles.placeholder} />
          <Text style={styles.headerTitle}>{getDisplayName()}</Text>
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.7}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="#568A60" />
            ) : (
              <FontAwesome name="sign-out" size={20} color="#568A60" />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.headerContent}>
          {userProfile?.username && (
            <Text style={styles.headerSubtitle}>@{userProfile.username}</Text>
          )}
          {userProfile?.email && (
            <Text style={styles.headerEmail}>{userProfile.email}</Text>
          )}
        </View>
      </Animated.View>

      {/* Stats */}
      <Animated.View 
        style={[
          styles.statsContainer,
          {
            opacity: statsOpacity,
            transform: [{ scale: statsScale }],
          }
        ]}
      >
            <TouchableOpacity 
              style={styles.statBox}
              onPress={() => friendCount > 0 && handleFriendsModalOpen()}
              activeOpacity={friendCount > 0 ? 0.7 : 1}
            >
          <Animated.View 
            style={[
              styles.statIconContainer,
              {
                transform: [
                  { scale: statIconAnimations[0].scale },
                  {
                    rotate: statIconAnimations[0].rotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-180deg', '0deg'],
                    }),
                  },
                ],
              }
            ]}
          >
            <FontAwesome name="users" size={20} color="#568A60" />
          </Animated.View>
          <Text style={styles.statNumber}>{friendCount}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Animated.View 
            style={[
              styles.statIconContainer,
              {
                transform: [
                  { scale: statIconAnimations[1].scale },
                  {
                    rotate: statIconAnimations[1].rotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-180deg', '0deg'],
                    }),
                  },
                ],
              }
            ]}
          >
            <FontAwesome name="book" size={20} color="#568A60" />
          </Animated.View>
          <Text style={styles.statNumber}>{recipeCount}</Text>
          <Text style={styles.statLabel}>Recipes</Text>
        </View>
      </Animated.View>

      {/* Tabs */}
      <Animated.View 
        style={[
          styles.tabsContainer,
          {
            opacity: tabsOpacity,
            transform: [{ translateY: tabsTranslateY }],
          }
        ]}
      >
        {[
          { id: 'myRecipes', label: 'Recipes', icon: 'book', showLabel: true },
          { id: 'mealPlan', label: '', icon: 'calendar', showLabel: true },
          { id: 'liked', label: '', icon: 'heart', showLabel: false },
          { id: 'groceries', label: '', icon: 'shopping-basket', showLabel: false },
        ].map((tab) => {
          const isActive = activeTab === (tab.id as any);
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                isActive && styles.activeTab,
              ]}
              onPress={() => {
                setActiveTab(tab.id as any);
              }}
              activeOpacity={0.7}
            >
              <FontAwesome 
                name={tab.icon as any} 
                size={16} 
                color={isActive ? '#fff' : '#666'} 
                style={tab.showLabel ? { marginRight: 6 } : {}}
              />
              {tab.showLabel && (
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'myRecipes' && <MyRecipes recipes={recipes} setRecipes={setRecipes} />}
        {activeTab === 'mealPlan' && <MealPlan />}
        {activeTab === 'groceries' && <GroceryList />}
        {activeTab === 'liked' && <LikedRecipes />}
      </View>

    </ScrollView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  
  scrollContent: {
    paddingTop: 50,
    paddingBottom: 110, // Account for tab bar height (90px) + extra space
  },
  
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  header: { 
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  placeholder: {
    width: 40,
  },

  headerContent: {
    alignItems: 'center',
    marginBottom: 20,
  },

  headerTitle: { 
    fontSize: 32, 
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
    flex: 1,
    textAlign: 'center',
  },

  signOutButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#f0f4f1',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#568A60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  headerSubtitle: {
    fontSize: 17,
    color: '#568A60',
    marginBottom: 6,
    fontWeight: '600',
  },

  headerEmail: {
    fontSize: 14,
    color: '#888',
    marginBottom: 0,
  },


  statsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: 32,
    paddingHorizontal: 32,
    paddingVertical: 32,
    backgroundColor: '#f9f9f9',
    marginHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  statBox: { 
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#568A60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  statNumber: { 
    fontSize: 32, 
    fontWeight: '700',
    color: '#568A60',
    letterSpacing: -0.8,
    marginBottom: 4,
  },

  statLabel: { 
    fontSize: 13, 
    color: '#888',
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },

  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 20,
    flexWrap: 'nowrap',
    gap: 8,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 44,
    maxHeight: 44,
  },

  activeTab: {
    backgroundColor: '#568A60',
    borderColor: '#568A60',
    shadowColor: '#568A60',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },

  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.2,
  },

  tabTextActive: {
    color: '#fff',
  },

  contentContainer: { 
    flex: 1,
    backgroundColor: 'transparent',
    minHeight: 400,
    paddingHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 20,
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
});