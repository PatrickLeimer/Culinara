// ============================================================================
// FRIENDS SCREEN - Component for managing friends and friend requests
// ============================================================================
// This screen allows users to:
// - Search for other users by username, email, or name
// - Send friend requests
// - View their list of accepted friends
// - Accept or reject incoming friend requests
// - View sent friend requests that are still pending
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, TextInput, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

// User interface - represents a user in the system
interface User {
  id: string;                    // Unique user ID
  name: string | null;           // User's first name (optional)
  lastname: string | null;       // User's last name (optional)
  username: string | null;       // User's username (optional)
  email: string | null;          // User's email address (optional)
}

// Friendship interface - represents a friendship relationship between two users
interface Friendship {
  id: number;                    // Unique friendship record ID
  requester_id?: string;         // ID of the user who sent the friend request
  addressee_id?: string;         // ID of the user who received the friend request
  status?: 'pending' | 'accepted' | 'declined';  // Current status of the friendship
  created_at: string;            // When the friendship request was created
  responded_at?: string | null;  // When the request was accepted/declined (if applicable)
  requester?: User | User[];     // The requester user object(s) - can be array or single object from Supabase
  addressee?: User | User[];     // The addressee user object(s) - can be array or single object from Supabase
}

// ExpandedFriend interface - represents a friend with expanded information from the database function
interface ExpandedFriend {
  friendship_id: number;         // The ID of the friendship record
  friend_id: string;             // The ID of the friend user
  friend_username: string | null; // The friend's username
  friend_name: string | null;    // The friend's name
  friend_email: string | null;   // The friend's email
  created_at: string;            // When the friendship was created
}

export default function FriendsScreen() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  const [searchQuery, setSearchQuery] = useState('');              // Current search input text
  const [searchResults, setSearchResults] = useState<User[]>([]);   // Users found from search
  const [friends, setFriends] = useState<ExpandedFriend[]>([]);    // List of accepted friends
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);  // Incoming friend requests waiting for response
  const [sentRequests, setSentRequests] = useState<Friendship[]>([]);       // Friend requests I sent that are still pending
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');  // Which tab is currently active
  const [loading, setLoading] = useState(false);                   // Loading state for fetching friends
  const [searching, setSearching] = useState(false);              // Loading state for searching users
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);  // ID of the currently logged-in user
  const router = useRouter();  // Router for navigation

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================
  
  // On component mount, get the current authenticated user
  useEffect(() => {
    getCurrentUser();
  }, []);

  // Refetch data when screen comes into focus (e.g., after logout/login)
  // This ensures data is fresh when user navigates back to this screen
  useFocusEffect(
    useCallback(() => {
      // Check if user has changed by getting current user
      const checkAndRefreshUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // If user ID changed or is null, update it and reset state
          if (currentUserId !== user.id) {
            // Reset all state when user changes
            setFriends([]);
            setPendingRequests([]);
            setSentRequests([]);
            setSearchResults([]);
            setSearchQuery('');
            setCurrentUserId(user.id);
            // Fetch data will be triggered by the useEffect when currentUserId updates
          } else if (currentUserId) {
            // Same user, just refresh the data
            // Use the user.id directly to avoid stale closure issues
            try {
              setLoading(true);
              // Fetch friends
              const { data: friendsData, error: friendsError } = await supabase.rpc('my_friends_expanded');
              if (!friendsError && friendsData) setFriends(friendsData);
              
              // Fetch pending requests
              const { data: pendingData, error: pendingError } = await supabase
                .from('friendships')
                .select('id, created_at, requester:requester_id(id, username, name, email)')
                .eq('addressee_id', user.id)
                .eq('status', 'pending');
              if (!pendingError && pendingData) setPendingRequests(pendingData as any);
              
              // Fetch sent requests
              const { data: sentData, error: sentError } = await supabase
                .from('friendships')
                .select('id, created_at, addressee:addressee_id(id, username, name, email)')
                .eq('requester_id', user.id)
                .eq('status', 'pending');
              if (!sentError && sentData) setSentRequests(sentData as any);
            } catch (error) {
              console.error('Error refreshing friends data:', error);
            } finally {
              setLoading(false);
            }
          }
        } else {
          // No user logged in, clear everything
          setCurrentUserId(null);
          setFriends([]);
          setPendingRequests([]);
          setSentRequests([]);
          setSearchResults([]);
          setSearchQuery('');
        }
      };
      
      checkAndRefreshUser();
    }, [currentUserId])
  );

  // Once we have the current user ID, fetch all friend-related data
  useEffect(() => {
    if (currentUserId) {
      fetchFriends();           // Get list of accepted friends
      fetchPendingRequests();   // Get incoming friend requests
      fetchSentRequests();      // Get outgoing friend requests
    } else {
      // Clear data when user logs out
      setFriends([]);
      setPendingRequests([]);
      setSentRequests([]);
      setSearchResults([]);
      setSearchQuery('');
    }
  }, [currentUserId]);

  // ============================================================================
  // DATA FETCHING FUNCTIONS
  // ============================================================================
  
  // Get the currently authenticated user's ID from Supabase
  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  // Fetch all accepted friends using a database function (RPC)
  // This function returns friends with expanded information (name, username, email)
  const fetchFriends = async () => {
    if (!currentUserId) return;
    
    try {
      setLoading(true);
      // Call a Supabase database function that returns friends with expanded info
      const { data, error } = await supabase.rpc('my_friends_expanded');

      if (error) {
        console.error('Error fetching friends:', error);
        throw error;
      }
      
      setFriends(data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch incoming friend requests (requests sent TO me that are still pending)
  // These are requests where I am the addressee and status is 'pending'
  const fetchPendingRequests = async () => {
    if (!currentUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, created_at, requester:requester_id(id, username, name, email)')  // Join to get requester info
        .eq('addressee_id', currentUserId)  // I am the one receiving the request
        .eq('status', 'pending');           // Only get pending requests

      if (error) throw error;
      setPendingRequests((data as any) || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  // Fetch outgoing friend requests (requests I sent that are still pending)
  // These are requests where I am the requester and status is 'pending'
  const fetchSentRequests = async () => {
    if (!currentUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, created_at, addressee:addressee_id(id, username, name, email)')  // Join to get addressee info
        .eq('requester_id', currentUserId)  // I am the one who sent the request
        .eq('status', 'pending');           // Only get pending requests

      if (error) throw error;
      setSentRequests((data as any) || []);
    } catch (error) {
      console.error('Error fetching sent requests:', error);
    }
  };

  // ============================================================================
  // USER INTERACTION FUNCTIONS
  // ============================================================================
  
  // Search for users by username, email, or name
  // Uses case-insensitive pattern matching (ilike) to find partial matches
  const searchUsers = async () => {
    if (!searchQuery.trim() || !currentUserId) return;
    
    try {
      setSearching(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, lastname, username, email')
        // Search in username, email, or name fields (case-insensitive, partial match)
        .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
        .neq('id', currentUserId)  // Don't show myself in search results
        .limit(10);                 // Limit to 10 results

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  // Send a friend request to another user
  // Creates a new friendship record with status 'pending' (default)
  const sendFriendRequest = async (userId: string) => {
    if (!currentUserId) return;
    
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({ requester_id: currentUserId, addressee_id: userId });  // I am requester, they are addressee

      if (error) throw error;
      Alert.alert('Success', 'Friend request sent!');
      fetchSentRequests();      // Refresh sent requests list
      setSearchQuery('');      // Clear search
      setSearchResults([]);     // Clear search results
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      // Error code 23505 is a unique constraint violation (request already exists)
      if (error.code === '23505') {
        Alert.alert('Error', 'Friend request already exists');
      } else {
        Alert.alert('Error', 'Failed to send friend request');
      }
    }
  };

  // Accept an incoming friend request
  // Updates the friendship status from 'pending' to 'accepted'
  const acceptFriendRequest = async (friendshipId: number) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;
      Alert.alert('Success', 'Friend request accepted!');
      fetchFriends();           // Refresh friends list (new friend added)
      fetchPendingRequests();   // Refresh pending requests (this one is gone)
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  // Reject an incoming friend request
  // Updates the friendship status from 'pending' to 'declined'
  const rejectFriendRequest = async (friendshipId: number) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'declined' })
        .eq('id', friendshipId);

      if (error) throw error;
      fetchPendingRequests();   // Refresh pending requests (this one is gone)
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      Alert.alert('Error', 'Failed to reject friend request');
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  // Get a display name for a User object
  // Priority: Full name > First name > Username > Email prefix > "Unknown User"
  const getUserDisplayName = (user: User) => {
    if (user.name && user.lastname) return `${user.name} ${user.lastname}`;
    if (user.name) return user.name;
    if (user.username) return user.username;
    if (user.email) return user.email.split('@')[0];  // Get part before @
    return 'Unknown User';
  };

  // Get a display name for an ExpandedFriend object
  // Priority: Full name (name + lastname) > Name > Username > Email prefix > "Unknown User"
  const getFriendDisplayName = (friend: ExpandedFriend) => {
    // Check if we have both name and lastname (the database might return them separately)
    // Try to construct full name if we have the data
    const fullName = friend.friend_name || '';
    // If friend_name contains both, use it; otherwise try to combine if we have lastname
    if (fullName && fullName.trim()) return fullName;
    if (friend.friend_username && friend.friend_username.trim()) return friend.friend_username;
    if (friend.friend_email && friend.friend_email.trim()) return friend.friend_email.split('@')[0];  // Get part before @
    // Fallback: use friend_id as last resort
    return `User ${friend.friend_id.substring(0, 8)}`;
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <View style={styles.container}>
      {/* Header - Shows "FRIENDS" title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FRIENDS</Text>
      </View>

      {/* Search Bar - Allows user to search for other users */}
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username, email, or name..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}      // Update search query as user types
          onSubmitEditing={searchUsers}       // Trigger search when user presses enter
          returnKeyType="search"
        />
        {/* Show loading spinner while searching */}
        {searching && <ActivityIndicator size="small" color="#568A60" style={styles.searchLoader} />}
      </View>

      {/* Search Results - Display users found from search */}
      {searchResults.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <Text style={styles.sectionTitle}>Search Results</Text>
          <ScrollView style={styles.searchResultsList}>
            {searchResults.map((user) => (
              <View key={user.id} style={styles.userItem}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{getUserDisplayName(user)}</Text>
                  {user.username && <Text style={styles.userUsername}>@{user.username}</Text>}
                </View>
                {/* Button to send friend request to this user */}
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => sendFriendRequest(user.id)}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tabs - Switch between Friends view and Requests view */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({friends.length})  {/* Show count of friends */}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({pendingRequests.length})  {/* Show count of pending requests */}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content - Shows either friends list or requests list based on active tab */}
      <ScrollView style={styles.contentContainer}>
        {loading ? (
          // Show loading spinner while fetching friends
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#568A60" />
          </View>
        ) : activeTab === 'friends' ? (
          // FRIENDS TAB: Show list of accepted friends
          friends.length === 0 ? (
            // Empty state - no friends yet
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>No friends yet :(</Text>
              <Text style={styles.emptySubtext}>Search for users to add as friends</Text>
            </View>
          ) : (
            // Display list of friends - make them clickable to view profile
            friends.map((friend) => (
              <TouchableOpacity
                key={friend.friendship_id}
                style={styles.friendItem}
                onPress={() => router.push(`/user/${friend.friend_id}` as any)}
              >
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{getFriendDisplayName(friend)}</Text>
                  {friend.friend_username && <Text style={styles.userUsername}>@{friend.friend_username}</Text>}
                </View>
                <FontAwesome name="chevron-right" size={16} color="#999" />
              </TouchableOpacity>
            ))
          )
        ) : (
          // REQUESTS TAB: Show incoming and outgoing friend requests
          <View>
            {/* Pending Requests - Incoming requests waiting for my response */}
            {pendingRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Requests</Text>
                {pendingRequests.map((friendship: any) => {
                  // Supabase sometimes returns joined data as array, sometimes as single object
                  // Handle both cases to avoid errors
                  const requester = Array.isArray(friendship.requester) 
                    ? friendship.requester[0] 
                    : friendship.requester;
                  if (!requester) return null;
                  return (
                    <View key={friendship.id} style={styles.requestItem}>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{getUserDisplayName(requester)}</Text>
                        {requester.username && <Text style={styles.userUsername}>@{requester.username}</Text>}
                      </View>
                      {/* Accept/Reject buttons for incoming requests */}
                      <View style={styles.requestButtons}>
                        <TouchableOpacity
                          style={[styles.requestButton, styles.acceptButton]}
                          onPress={() => acceptFriendRequest(friendship.id)}
                        >
                          <Text style={styles.requestButtonText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.requestButton, styles.rejectButton]}
                          onPress={() => rejectFriendRequest(friendship.id)}
                        >
                          <Text style={styles.requestButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Sent Requests - Requests I sent that are still waiting for response */}
            {sentRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sent Requests</Text>
                {sentRequests.map((friendship: any) => {
                  // Supabase sometimes returns joined data as array, sometimes as single object
                  // Handle both cases to avoid errors
                  const addressee = Array.isArray(friendship.addressee) 
                    ? friendship.addressee[0] 
                    : friendship.addressee;
                  if (!addressee) return null;
                  return (
                    <View key={friendship.id} style={styles.requestItem}>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{getUserDisplayName(addressee)}</Text>
                        {addressee.username && <Text style={styles.userUsername}>@{addressee.username}</Text>}
                      </View>
                      {/* Just show "Pending" - can't cancel from here */}
                      <Text style={styles.pendingText}>Pending</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Empty state - no requests at all */}
            {pendingRequests.length === 0 && sentRequests.length === 0 && (
              <View style={styles.centerContent}>
                <Text style={styles.emptyText}>No friend requests</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#bfcdb8ff',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  searchLoader: {
    marginLeft: 8,
  },
  searchResultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    maxHeight: 200,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#568A60',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  contentContainer: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#555',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  friendItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userItem: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#568A60',
  },
  addButton: {
    backgroundColor: '#568A60',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButton: {
    backgroundColor: '#568A60',
  },
  rejectButton: {
    backgroundColor: '#ccc',
  },
  requestButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  pendingText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  searchResultsList: {
    maxHeight: 150,
  },
});
