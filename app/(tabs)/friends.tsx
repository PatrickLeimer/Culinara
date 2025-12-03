import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

// ======================== INTERFACES ========================
interface User {
  id: string;
  name: string | null;
  lastname: string | null;
  username: string | null;
  email: string | null;
}

interface Friendship {
  id: number;
  requester_id?: string;
  addressee_id?: string;
  status?: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at?: string | null;
  requester?: User | User[];
  addressee?: User | User[];
}

interface ExpandedFriend {
  friendship_id: number;
  friend_id: string;
  friend_username: string | null;
  friend_name: string | null;
  friend_email: string | null;
  created_at: string;
}

// ======================== COMPONENT ========================
export default function FriendsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [friends, setFriends] = useState<ExpandedFriend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<Friendship[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  // ======================== LIFECYCLE ========================
  useEffect(() => {
    getCurrentUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const refreshUserData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (currentUserId !== user.id) {
            setFriends([]);
            setPendingRequests([]);
            setSentRequests([]);
            setSearchResults([]);
            setSearchQuery('');
            setCurrentUserId(user.id);
          } else {
            await refreshAll(user.id);
          }
        } else {
          setCurrentUserId(null);
          setFriends([]);
          setPendingRequests([]);
          setSentRequests([]);
          setSearchResults([]);
          setSearchQuery('');
        }
      };
      refreshUserData();
    }, [currentUserId])
  );

  useEffect(() => {
    if (currentUserId) refreshAll(currentUserId);
  }, [currentUserId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  // ======================== FETCH FUNCTIONS ========================
  const refreshAll = async (userId: string) => {
    setLoading(true);
    await Promise.all([fetchFriends(), fetchPendingRequests(), fetchSentRequests()]);
    setLoading(false);
  };

  const fetchFriends = async () => {
    const { data, error } = await supabase.rpc('my_friends_expanded');
    if (!error && data) setFriends(data);
  };

  const fetchPendingRequests = async () => {
    if (!currentUserId) return;
    const { data, error } = await supabase
      .from('friendships')
      .select('id, created_at, requester:requester_id(id, username, name, email)')
      .eq('addressee_id', currentUserId)
      .eq('status', 'pending');
    if (!error && data) setPendingRequests(data as any);
  };

  const fetchSentRequests = async () => {
    if (!currentUserId) return;
    const { data, error } = await supabase
      .from('friendships')
      .select('id, created_at, addressee:addressee_id(id, username, name, email)')
      .eq('requester_id', currentUserId)
      .eq('status', 'pending');
    if (!error && data) setSentRequests(data as any);
  };

  // ======================== USER INTERACTION ========================
  const searchUsers = async () => {
    if (!searchQuery.trim() || !currentUserId) return;
    setSearching(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, name, lastname, username, email')
      .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
      .neq('id', currentUserId)
      .limit(10);
    if (!error && data) setSearchResults(data);
    setSearching(false);
  };

  const sendFriendRequest = async (userId: string) => {
    if (!currentUserId) return;
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({ requester_id: currentUserId, addressee_id: userId });
      if (error) throw error;
      Alert.alert('Success', 'Friend request sent!');
      fetchSentRequests();
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      if (error.code === '23505') Alert.alert('Error', 'Friend request already exists');
      else Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const acceptFriendRequest = async (id: number) => {
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id);
    if (!error) {
      Alert.alert('Success', 'Friend request accepted!');
      fetchFriends();
      fetchPendingRequests();
    }
  };

  const rejectFriendRequest = async (id: number) => {
    const { error } = await supabase.from('friendships').update({ status: 'declined' }).eq('id', id);
    if (!error) fetchPendingRequests();
  };

  // ======================== HELPERS ========================
  const getUserDisplayName = (user: User) => {
    if (user.name && user.lastname) return `${user.name} ${user.lastname}`;
    if (user.name) return user.name;
    if (user.username) return user.username;
    if (user.email) return user.email.split('@')[0];
    return 'Unknown User';
  };

  const getFriendDisplayName = (friend: ExpandedFriend) => {
    if (friend.friend_name) return friend.friend_name;
    if (friend.friend_username) return friend.friend_username;
    if (friend.friend_email) return friend.friend_email.split('@')[0];
    return `User ${friend.friend_id.substring(0, 8)}`;
  };

  // ======================== RENDER ========================
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username, email, or name..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchUsers}
          returnKeyType="search"
        />
        {searching && <ActivityIndicator size="small" color="#568A60" style={styles.searchLoader} />}
      </View>

      {/* SEARCH RESULTS */}
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
                <TouchableOpacity style={styles.addButton} onPress={() => sendFriendRequest(user.id)}>
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* TABS */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({pendingRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#568A60" />
          </View>
        ) : activeTab === 'friends' ? (
          friends.length === 0 ? (
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>No friends yet :(</Text>
              <Text style={styles.emptySubtext}>Search for users to add as friends</Text>
            </View>
          ) : (
            friends.map((friend) => (
              <TouchableOpacity
                key={friend.friendship_id}
                style={styles.friendItem}
                onPress={() => router.push(`/user/${friend.friend_id}` as any)}
              >
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{getFriendDisplayName(friend)}</Text>
                  {friend.friend_username && (
                    <Text style={styles.userUsername}>@{friend.friend_username}</Text>
                  )}
                </View>
                <FontAwesome name="chevron-right" size={16} color="#999" />
              </TouchableOpacity>
            ))
          )
        ) : (
          <>
            {/* PENDING */}
            {pendingRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Requests</Text>
                {pendingRequests.map((fr: any) => {
                  const requester = Array.isArray(fr.requester) ? fr.requester[0] : fr.requester;
                  if (!requester) return null;
                  return (
                    <View key={fr.id} style={styles.requestItem}>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{getUserDisplayName(requester)}</Text>
                        {requester.username && <Text style={styles.userUsername}>@{requester.username}</Text>}
                      </View>
                      <View style={styles.requestButtons}>
                        <TouchableOpacity
                          style={[styles.requestButton, styles.acceptButton]}
                          onPress={() => acceptFriendRequest(fr.id)}
                        >
                          <Text style={styles.requestButtonText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.requestButton, styles.rejectButton]}
                          onPress={() => rejectFriendRequest(fr.id)}
                        >
                          <Text style={styles.requestButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* SENT */}
            {sentRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sent Requests</Text>
                {sentRequests.map((fr: any) => {
                  const addressee = Array.isArray(fr.addressee) ? fr.addressee[0] : fr.addressee;
                  if (!addressee) return null;
                  return (
                    <View key={fr.id} style={styles.requestItem}>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{getUserDisplayName(addressee)}</Text>
                        {addressee.username && <Text style={styles.userUsername}>@{addressee.username}</Text>}
                      </View>
                      <Text style={styles.pendingText}>Pending</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {pendingRequests.length === 0 && sentRequests.length === 0 && (
              <View style={styles.centerContent}>
                <Text style={styles.emptyText}>No friend requests</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ======================== STYLES ========================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#d6ddd6ff', paddingTop: 50, paddingHorizontal: 20 },
  header: { alignItems: 'center', marginVertical: 24 },
  headerTitle: { fontSize: 32, fontWeight: '700', color: '#000', letterSpacing: -0.5 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 15,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#000' },
  searchLoader: { marginLeft: 8 },
  searchResultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    maxHeight: 200,
  },
  searchResultsList: {
    maxHeight: 180,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 4,
    marginBottom: 10,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  activeTab: { backgroundColor: '#568A60' },
  tabText: { color: '#666', fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#fff' },
  centerContent: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 18, color: '#555', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#888' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 10 },
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
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#000' },
  userUsername: { fontSize: 14, color: '#568A60' },
  addButton: {
    backgroundColor: '#568A60',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600' },
  requestButtons: { flexDirection: 'row', gap: 8 },
  requestButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  acceptButton: { backgroundColor: '#568A60' },
  rejectButton: { backgroundColor: '#ccc' },
  requestButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  pendingText: { color: '#888', fontSize: 14, fontStyle: 'italic' },
});
