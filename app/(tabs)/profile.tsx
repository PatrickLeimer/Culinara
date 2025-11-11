// ============================================================================
// PROFILE SCREEN - Component for displaying user profile information
// ============================================================================
// This screen shows:
// - User's profile information (name, username, email)
// - Statistics (friend count, recipe count)
// - Tabs for viewing user's recipes, meal plans, and liked recipes
// - Logout functionality
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import MyRecipes from '../profile_tabs/myRecipes';
import MealPlan from '../profile_tabs/mealPlan';
import GroceryList from '../profile_tabs/groceryList';
import LikedRecipes from '../profile_tabs/likedRecipes';

// UserProfile interface - represents the current user's profile data
interface UserProfile {
  name: string | null;        // User's first name (optional)
  lastname: string | null;    // User's last name (optional)
  username: string | null;    // User's username (optional)
  email: string | null;       // User's email address (optional)
}

const Profile: React.FC = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  // Use internal tab ids (short) and render labels/icons separately so display text and logic are decoupled
  const [activeTab, setActiveTab] = useState<'myRecipes' | 'liked' | 'mealPlan' | 'groceries'>('myRecipes');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);  // Current user's profile data
  const [recipeCount, setRecipeCount] = useState<number>(0);                 // Count of user's recipes
  // Lifted recipes state so it persists across tab switches
  interface LocalRecipe {
    name: string;
    desc: string;
    ingredients: string[];
    tags: string[];
  }
  const [recipes, setRecipes] = useState<LocalRecipe[]>([
    { name: 'Recipe 1', desc: 'Short description', ingredients: ['Ingredient 1'], tags: ['Tag 1'] },
    { name: 'Recipe 2', desc: 'Short description', ingredients: ['Ingredient 2'], tags: ['Tag 2'] },
  ]);
  const [friendCount, setFriendCount] = useState<number>(0);                  // Count of user's friends
  const [loading, setLoading] = useState(true);                               // Loading state for initial data fetch
  const [loggingOut, setLoggingOut] = useState(false);                        // Loading state for logout process
  const router = useRouter();  // Router for navigation

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================
  
  // On component mount, fetch all user profile data
  useEffect(() => {
    fetchUserProfile();
  }, []);

  // ============================================================================
  // DATA FETCHING FUNCTIONS
  // ============================================================================
  
  // Fetch all user profile data including profile info, recipe count, and friend count
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Step 1: Get current authenticated user from Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Error fetching auth user:', authError);
        setLoading(false);
        return;
      }

      // Step 2: Fetch user profile details from the users table
      // This gets additional info like name, username that's stored in the database
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('name, lastname, username, email')
        .eq('id', user.id)  // Match the authenticated user's ID
        .single();          // Expect only one result

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      } else {
        setUserProfile(profile);
      }

      // Step 3: Count how many recipes the user has created
      // Uses count: 'exact' to get the total count without fetching all records
      // head: true means we only want the count, not the actual data
      const { count, error: recipeError } = await supabase
        .from('Recipes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);  // Only count recipes owned by this user

      if (recipeError) {
        console.error('Error counting recipes:', recipeError);
      } else {
        setRecipeCount(count || 0);
      }

      // Step 4: Count how many accepted friendships the user has
      // A friendship can be where the user is either the requester OR the addressee
      // We count both cases where status is 'accepted'
      const { count: friendCountResult, error: friendError } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')  // Only count accepted friendships
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);  // User is either requester or addressee

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

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  // Get a display name for the current user
  // Priority: Full name > First name > Username > Email prefix > "User"
  const getDisplayName = () => {
    if (!userProfile) return 'User';
    if (userProfile.name && userProfile.lastname) {
      return `${userProfile.name} ${userProfile.lastname}`;
    }
    if (userProfile.name) return userProfile.name;
    if (userProfile.username) return userProfile.username;
    if (userProfile.email) return userProfile.email.split('@')[0];  // Get part before @
    return 'User';
  };

  // ============================================================================
  // USER INTERACTION FUNCTIONS
  // ============================================================================
  
  // Handle logout with confirmation dialog
  // Uses optimistic navigation - navigates immediately even if network call fails
  // because Supabase clears the local session synchronously
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
            
            // Sign out - this clears local session even if network fails
            // We don't await this because we want to navigate immediately
            supabase.auth.signOut().catch((error) => {
              // Log error but don't block - local session is still cleared
              console.warn('Logout network error (local session cleared):', error);
            });
            
            // Navigate immediately - don't wait for network response
            // The local session is cleared synchronously by Supabase
            router.replace('/login');
          },
        },
      ]
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  // Show loading spinner while fetching initial data
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#568A60" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header - Shows user's name, username, email, and logout button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getDisplayName()}</Text>
        {/* Show username if available */}
        {userProfile?.username && (
          <Text style={styles.headerSubtitle}>@{userProfile.username}</Text>
        )}
        {/* Show email if available */}
        {userProfile?.email && (
          <Text style={styles.headerEmail}>{userProfile.email}</Text>
        )}
        {/* Logout button - shows spinner while logging out */}
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

      {/* Stats - Display friend count and recipe count */}
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


      {/* Tabs - Switch between MyRecipes, Liked, and MealPlan views */}
      <View style={styles.tabsContainer}>
        {/* map internal ids to label or icon */}
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

      {/* Content - Render the appropriate tab content based on activeTab state */}
      <View style={styles.contentContainer}>
  {activeTab === 'myRecipes' && <MyRecipes recipes={recipes} setRecipes={setRecipes} />}
  {activeTab === 'mealPlan' && <MealPlan />}
  {activeTab === 'groceries' && <GroceryList />}
  {activeTab === 'liked' && <LikedRecipes />}
      </View>
    </View>
  );
};

export default Profile;

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 50, 
    backgroundColor: '#bfcdb8ff' 
  },
  
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  header: { 
    alignItems: 'center', 
    marginTop: 20,
    marginBottom: 20 
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
    marginBottom: 20 
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
    flexWrap: 'nowrap', // keep all tabs on a single line
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
  },

  placeholder: { 
    alignItems: 'center', justifyContent: 'center', flex: 1 
  },

  placeholderText: { 
    color: '#888' 
  },
});
