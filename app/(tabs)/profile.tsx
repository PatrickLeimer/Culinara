// ============================================================================
// PROFILE SCREEN - Component for displaying user profile information
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, DeviceEventEmitter, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import MyRecipes from '../profile_tabs/myRecipes';
import MealPlan from '../profile_tabs/mealPlan';
import GroceryList from '../profile_tabs/groceryList';
import LikedRecipes from '../profile_tabs/likedRecipes';
import { Recipe } from '../profile_tabs/recipeCard';

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
  const router = useRouter();

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
        .select('id, name, description, picture, tags, ingredients, public, created_at')
        .eq('owner', user.id)
        .order('created_at', { ascending: false });

      if (userRecipesError) {
        console.error('Error fetching user recipes:', userRecipesError);
        setRecipes([]);
      } else if (userRecipes) {
        const mapped: Recipe[] = userRecipes.map((r: any) => ({
          id: r.id,
          name: r.name,
          desc: r.description || '',
          description: r.description || '',
          ingredients: r.ingredients || [],
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getDisplayName()}</Text>
        {userProfile?.username && (
          <Text style={styles.headerSubtitle}>@{userProfile.username}</Text>
        )}
        {userProfile?.email && (
          <Text style={styles.headerEmail}>{userProfile.email}</Text>
        )}
        <TouchableOpacity 
          style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]} 
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.logoutButtonText}>Log Out</Text>
          )}
        </TouchableOpacity>
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

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { id: 'myRecipes', label: 'My Recipes' },
          { id: 'mealPlan', label: 'Meal Plan' },
          { id: 'liked', icon: <FontAwesome name="heart-o" size={18} color="#FF4D4D" /> },
          { id: 'groceries', icon: <FontAwesome name="shopping-basket" size={18} color="#5b8049ff" /> },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === (tab.id as any) && styles.activeTab,
            ]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            {tab.icon ?? <Text style={styles.tabText}>{tab.label}</Text>}
          </TouchableOpacity>
        ))}
      </View>

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
    backgroundColor: '#bfcdb8ff' 
  },
  
  scrollContent: {
    paddingTop: 50,
    paddingBottom: 30,
  },
  
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  header: { 
    alignItems: 'center', 
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },

  headerTitle: { 
    fontSize: 22, 
    letterSpacing: 1,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: 16,
    color: '#568A60',
    marginBottom: 4,
  },

  headerEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },

  logoutButton: {
    backgroundColor: '#5b8049ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },

  logoutButtonDisabled: {
    opacity: 0.7,
  },

  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  statsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: 20,
    paddingHorizontal: 10,
  },

  statBox: { 
    alignItems: 'center' 
  },

  statLabel: { 
    fontSize: 16, color: '#666' 
  },

  statNumber: { 
    fontSize: 20, fontWeight: 'bold' 
  },

  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#bfcdb8ff',
    flexWrap: 'nowrap',
    paddingHorizontal: 10,
  },

  tab: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginHorizontal: 4,
  },

  activeTab: {
    backgroundColor: '#ececec',
  },

  tabText: {
    fontSize: 15,
  },

  contentContainer: { 
    flex: 1,
    backgroundColor: 'transparent',
    minHeight: 400,
  },
});