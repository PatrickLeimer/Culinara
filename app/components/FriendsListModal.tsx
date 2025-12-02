import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export interface ExpandedFriend {
  friendship_id: number;
  friend_id: string;
  friend_username: string | null;
  friend_name: string | null;
  friend_email: string | null;
  created_at: string;
}

interface FriendsListModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  currentUserId: string | null;
  showFriendRequests?: boolean;
}

export default function FriendsListModal({
  visible,
  onClose,
  userId,
  currentUserId,
  showFriendRequests = false,
}: FriendsListModalProps) {
  const router = useRouter();
  const [friends, setFriends] = useState<ExpandedFriend[]>([]);
  const [friendsOfFriends, setFriendsOfFriends] = useState<ExpandedFriend[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      console.log('[FriendsListModal] Modal opened, fetching friends for userId:', userId);
      fetchFriends();
    } else {
      console.log('[FriendsListModal] Modal closed or no userId');
    }
  }, [visible, userId]);

  const fetchFriends = async () => {
    if (!userId) {
      console.log('[FriendsListModal] No userId provided, skipping fetch');
      return;
    }

    try {
      setLoading(true);
      console.log('[FriendsListModal] Starting to fetch friends for user:', userId);

      // Try RPC function first
      console.log('[FriendsListModal] Attempting RPC call: get_user_friends_expanded');
      const { data: friendsData, error: friendsError } = await supabase.rpc('get_user_friends_expanded', {
        user_uuid: userId
      });

      console.log('[FriendsListModal] RPC response:', {
        hasData: !!friendsData,
        dataLength: friendsData?.length || 0,
        error: friendsError,
        data: friendsData,
      });

      if (!friendsError && friendsData && Array.isArray(friendsData)) {
        console.log('[FriendsListModal] RPC succeeded, got', friendsData.length, 'friends');
        setFriends(friendsData);

        // Fetch friends of friends if viewing someone else's profile
        if (currentUserId && currentUserId !== userId && friendsData.length > 0) {
          console.log('[FriendsListModal] Fetching friends of friends...');
          fetchFriendsOfFriends(friendsData);
        }
      } else {
        // Fallback: use direct query
        console.log('[FriendsListModal] RPC failed, using fallback query. Error:', friendsError);
        const { data: altFriendsData, error: altError } = await supabase
          .from('friendships')
          .select(`
            id,
            requester_id,
            addressee_id,
            requester:requester_id(id, username, name, email),
            addressee:addressee_id(id, username, name, email)
          `)
          .eq('status', 'accepted')
          .neq('requester_id', 'addressee_id')
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
          .order('created_at', { ascending: false });

        console.log('[FriendsListModal] Fallback query response:', {
          hasData: !!altFriendsData,
          dataLength: altFriendsData?.length || 0,
          error: altError,
        });

        if (!altError && altFriendsData && Array.isArray(altFriendsData) && altFriendsData.length > 0) {
          console.log('[FriendsListModal] Fallback query succeeded, mapping', altFriendsData.length, 'friendships');
          const mapped: ExpandedFriend[] = altFriendsData.map((f: any) => {
            const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
            const friend = f.requester_id === userId
              ? (Array.isArray(f.addressee) ? f.addressee[0] : f.addressee)
              : (Array.isArray(f.requester) ? f.requester[0] : f.requester);

            const mappedFriend = {
              friendship_id: f.id,
              friend_id: friendId,
              friend_username: friend?.username || null,
              friend_name: friend?.name || null,
              friend_email: friend?.email || null,
              created_at: f.created_at || '',
            };
            console.log('[FriendsListModal] Mapped friend:', mappedFriend);
            return mappedFriend;
          });
          console.log('[FriendsListModal] Setting', mapped.length, 'friends');
          setFriends(mapped);

          // Fetch friends of friends if viewing someone else's profile
          if (currentUserId && currentUserId !== userId && mapped.length > 0) {
            console.log('[FriendsListModal] Fetching friends of friends from fallback data...');
            fetchFriendsOfFriends(mapped);
          }
        } else {
          console.log('[FriendsListModal] Fallback query also failed or returned no data. Error:', altError);
          setFriends([]);
        }
      }
    } catch (error) {
      console.error('[FriendsListModal] Unexpected error fetching friends:', error);
      setFriends([]);
    } finally {
      setLoading(false);
      console.log('[FriendsListModal] Fetch complete, loading set to false');
    }
  };

  const fetchFriendsOfFriends = async (directFriends: ExpandedFriend[]) => {
    if (!currentUserId || !userId) return;

    try {
      console.log('[FriendsListModal] Fetching friends of friends for', directFriends.length, 'direct friends');
      const friendIds = directFriends.map((f) => f.friend_id);
      console.log('[FriendsListModal] Friend IDs:', friendIds);

      const { data: asRequesters } = await supabase
        .from('friendships')
        .select(`
          requester_id,
          addressee_id,
          requester:requester_id(id, username, name, email),
          addressee:addressee_id(id, username, name, email)
        `)
        .eq('status', 'accepted')
        .in('requester_id', friendIds);

      const { data: asAddressees } = await supabase
        .from('friendships')
        .select(`
          requester_id,
          addressee_id,
          requester:requester_id(id, username, name, email),
          addressee:addressee_id(id, username, name, email)
        `)
        .eq('status', 'accepted')
        .in('addressee_id', friendIds);

      console.log('[FriendsListModal] Friends of friends data:', {
        asRequesters: asRequesters?.length || 0,
        asAddressees: asAddressees?.length || 0,
      });

      const allFriendsOfFriends: any[] = [];
      if (asRequesters) allFriendsOfFriends.push(...asRequesters);
      if (asAddressees) allFriendsOfFriends.push(...asAddressees);

      console.log('[FriendsListModal] Total friendships found:', allFriendsOfFriends.length);
      console.log('[FriendsListModal] Exclude IDs (currentUserId, userId, friendIds):', {
        currentUserId,
        userId,
        friendIds,
      });

      const excludeIds = new Set([currentUserId, userId, ...friendIds]);
      const fofMap = new Map<string, ExpandedFriend>();

      allFriendsOfFriends.forEach((fof: any, index: number) => {
        const requesterIsFriend = friendIds.includes(fof.requester_id);
        const addresseeIsFriend = friendIds.includes(fof.addressee_id);
        
        console.log(`[FriendsListModal] Processing friendship ${index + 1}:`, {
          requester_id: fof.requester_id,
          addressee_id: fof.addressee_id,
          requesterIsFriend,
          addresseeIsFriend,
        });

        // Skip if both are direct friends (friendship between direct friends)
        if (requesterIsFriend && addresseeIsFriend) {
          console.log(`[FriendsListModal] Skipping - both are direct friends (friendship between direct friends)`);
          return;
        }

        // Skip if neither is a direct friend (shouldn't happen, but safety check)
        if (!requesterIsFriend && !addresseeIsFriend) {
          console.log(`[FriendsListModal] Skipping - neither is a direct friend`);
          return;
        }

        // Extract the other user (the one who is NOT a direct friend)
        let otherUserId: string;
        let otherUser: any;

        if (requesterIsFriend) {
          // Requester is a direct friend, so addressee is the friend of friend
          otherUserId = fof.addressee_id;
          otherUser = Array.isArray(fof.addressee) ? fof.addressee[0] : fof.addressee;
        } else {
          // Addressee is a direct friend, so requester is the friend of friend
          otherUserId = fof.requester_id;
          otherUser = Array.isArray(fof.requester) ? fof.requester[0] : fof.requester;
        }

        console.log(`[FriendsListModal] Extracted otherUserId: ${otherUserId}`, {
          isExcluded: excludeIds.has(otherUserId),
          hasUser: !!otherUser,
          alreadyInMap: fofMap.has(otherUserId),
          otherUser: otherUser ? { id: otherUser.id, username: otherUser.username, name: otherUser.name } : null,
        });

        if (!excludeIds.has(otherUserId) && otherUser && !fofMap.has(otherUserId)) {
          console.log(`[FriendsListModal] Adding friend of friend: ${otherUserId} (${otherUser.username || otherUser.name})`);
          fofMap.set(otherUserId, {
            friendship_id: 0,
            friend_id: otherUserId,
            friend_username: otherUser.username,
            friend_name: otherUser.name,
            friend_email: otherUser.email,
            created_at: '',
          });
        } else {
          console.log(`[FriendsListModal] Skipping ${otherUserId} - excluded: ${excludeIds.has(otherUserId)}, hasUser: ${!!otherUser}, inMap: ${fofMap.has(otherUserId)}`);
        }
      });

      const fofArray = Array.from(fofMap.values());
      console.log('[FriendsListModal] Setting', fofArray.length, 'friends of friends');
      setFriendsOfFriends(fofArray);
    } catch (error) {
      console.error('[FriendsListModal] Error fetching friends of friends:', error);
    }
  };

  const sendFriendRequestToUser = async (userId: string) => {
    if (!currentUserId) return;

    try {
      console.log('[FriendsListModal] Sending friend request to:', userId);
      const { error } = await supabase
        .from('friendships')
        .insert({ requester_id: currentUserId, addressee_id: userId });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Info', 'Friend request already sent');
        } else {
          console.error('[FriendsListModal] Error sending friend request:', error);
          Alert.alert('Error', 'Failed to send friend request');
        }
      } else {
        console.log('[FriendsListModal] Friend request sent successfully');
        Alert.alert('Success', 'Friend request sent!');
      }
    } catch (error) {
      console.error('[FriendsListModal] Unexpected error sending friend request:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  console.log('[FriendsListModal] Render - visible:', visible, 'friends:', friends.length, 'loading:', loading, 'friendsOfFriends:', friendsOfFriends.length);
  console.log('[FriendsListModal] Friends data:', friends.map(f => ({ id: f.friend_id, name: f.friend_name, username: f.friend_username })));

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Friends</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView}>
            {loading ? (
              <View style={styles.emptyFriendsState}>
                <ActivityIndicator size="large" color="#568A60" />
                <Text style={styles.loadingText}>Loading friends...</Text>
              </View>
            ) : friends.length === 0 && friendsOfFriends.length === 0 ? (
              <View style={styles.emptyFriendsState}>
                <FontAwesome name="users" size={48} color="#999" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyFriendsText}>No friends yet</Text>
              </View>
            ) : (
              <>
                {/* Direct Friends Section */}
                {friends.length > 0 && (
                  <>
                    <Text style={styles.modalSectionTitle}>
                      Friends ({friends.length})
                    </Text>
                    {friends.map((friend) => (
                      <View key={friend.friend_id} style={styles.modalFriendItem}>
                        <TouchableOpacity
                          style={styles.modalFriendItemContent}
                          onPress={() => {
                            onClose();
                            router.push(`/user/${friend.friend_id}` as any);
                          }}
                        >
                          <View style={styles.modalFriendAvatar}>
                            <FontAwesome name="user" size={20} color="#568A60" />
                          </View>
                          <View style={styles.modalFriendInfo}>
                            <Text style={styles.modalFriendName}>
                              {friend.friend_name || friend.friend_username || 'User'}
                            </Text>
                            {friend.friend_username && (
                              <Text style={styles.modalFriendUsername}>@{friend.friend_username}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                        {currentUserId && friend.friend_id !== currentUserId && (
                          <TouchableOpacity
                            style={styles.friendRequestButton}
                            onPress={() => sendFriendRequestToUser(friend.friend_id)}
                          >
                            <FontAwesome name="user-plus" size={14} color="#568A60" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </>
                )}

                {/* Friends of Friends Section */}
                {friendsOfFriends.length > 0 && currentUserId && currentUserId !== userId && (
                  <>
                    <Text style={[styles.modalSectionTitle, { marginTop: 24 }]}>
                      Friends of Friends ({friendsOfFriends.length})
                    </Text>
                    {friendsOfFriends.map((fof) => (
                      <View key={fof.friend_id} style={styles.modalFriendItem}>
                        <TouchableOpacity
                          style={styles.modalFriendItemContent}
                          onPress={() => {
                            onClose();
                            router.push(`/user/${fof.friend_id}` as any);
                          }}
                        >
                          <View style={[styles.modalFriendAvatar, { backgroundColor: '#E8F5E9' }]}>
                            <FontAwesome name="user-plus" size={18} color="#4CAF50" />
                          </View>
                          <View style={styles.modalFriendInfo}>
                            <Text style={styles.modalFriendName}>
                              {fof.friend_name || fof.friend_username || 'User'}
                            </Text>
                            {fof.friend_username && (
                              <Text style={styles.modalFriendUsername}>@{fof.friend_username}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                        {currentUserId && fof.friend_id !== currentUserId && (
                          <TouchableOpacity
                            style={styles.friendRequestButton}
                            onPress={() => sendFriendRequestToUser(fof.friend_id)}
                          >
                            <FontAwesome name="user-plus" size={14} color="#568A60" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  loadingText: {
    fontSize: 14,
    color: '#888',
    marginTop: 12,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    marginTop: 8,
  },
});

