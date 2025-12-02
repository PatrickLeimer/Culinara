import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

export interface ExpandedFriend {
  friendship_id: number;
  friend_id: string;
  friend_username: string | null;
  friend_name: string | null;
  friend_email: string | null;
  created_at: string;
}

export default function FriendsListScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const [friends, setFriends] = useState<ExpandedFriend[]>([]);
  const [friendsOfFriends, setFriendsOfFriends] = useState<ExpandedFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  
  // Create animated values for each friend item
  const friendAnimations = useRef<Animated.Value[]>([]).current;
  const fofAnimations = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();

    if (userId) {
      fetchFriends();
    }
  }, [userId]);

  useEffect(() => {
    // Header animation
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(headerTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!loading) {
      // Initialize animations for friend items
      const friendsNeeded = friends.length;
      const fofNeeded = friendsOfFriends.length;
      
      // Ensure we have enough animation values
      while (friendAnimations.length < friendsNeeded) {
        friendAnimations.push(new Animated.Value(0));
      }
      while (fofAnimations.length < fofNeeded) {
        fofAnimations.push(new Animated.Value(0));
      }

      // Animate content
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Staggered animation for friend items
        if (friendsNeeded > 0) {
          friendAnimations.slice(0, friendsNeeded).forEach((anim, index) => {
            Animated.sequence([
              Animated.delay(index * 80),
              Animated.parallel([
                Animated.timing(anim, {
                  toValue: 1,
                  duration: 400,
                  useNativeDriver: true,
                }),
              ]),
            ]).start();
          });
        }

        // Staggered animation for friends of friends
        if (fofNeeded > 0) {
          fofAnimations.slice(0, fofNeeded).forEach((anim, index) => {
            Animated.sequence([
              Animated.delay((friendsNeeded * 80) + (index * 80)),
              Animated.parallel([
                Animated.timing(anim, {
                  toValue: 1,
                  duration: 400,
                  useNativeDriver: true,
                }),
              ]),
            ]).start();
          });
        }
      });
    }
  }, [loading, friends.length, friendsOfFriends.length]);

  const fetchFriends = async () => {
    if (!userId) {
      console.log('[FriendsListScreen] No userId provided, skipping fetch');
      return;
    }

    try {
      setLoading(true);

      // Try RPC function first
      const { data: friendsData, error: friendsError } = await supabase.rpc('get_user_friends_expanded', {
        user_uuid: userId
      });

      if (!friendsError && friendsData && Array.isArray(friendsData)) {
        setFriends(friendsData);

        // Fetch friends of friends if viewing someone else's profile
        if (currentUserId && currentUserId !== userId && friendsData.length > 0) {
          fetchFriendsOfFriends(friendsData);
        }
      } else {
        // Fallback: use direct query
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

        if (!altError && altFriendsData && Array.isArray(altFriendsData) && altFriendsData.length > 0) {
          const mapped: ExpandedFriend[] = altFriendsData.map((f: any) => {
            const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
            const friend = f.requester_id === userId
              ? (Array.isArray(f.addressee) ? f.addressee[0] : f.addressee)
              : (Array.isArray(f.requester) ? f.requester[0] : f.requester);

            return {
              friendship_id: f.id,
              friend_id: friendId,
              friend_username: friend?.username || null,
              friend_name: friend?.name || null,
              friend_email: friend?.email || null,
              created_at: f.created_at || '',
            };
          });
          setFriends(mapped);

          // Fetch friends of friends if viewing someone else's profile
          if (currentUserId && currentUserId !== userId && mapped.length > 0) {
            fetchFriendsOfFriends(mapped);
          }
        } else {
          setFriends([]);
        }
      }
    } catch (error) {
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendsOfFriends = async (directFriends: ExpandedFriend[]) => {
    if (!currentUserId || !userId) return;

    try {
      const friendIds = directFriends.map((f) => f.friend_id);

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

      const allFriendsOfFriends: any[] = [];
      if (asRequesters) allFriendsOfFriends.push(...asRequesters);
      if (asAddressees) allFriendsOfFriends.push(...asAddressees);

      const excludeIds = new Set([currentUserId, userId, ...friendIds]);
      const fofMap = new Map<string, ExpandedFriend>();

      allFriendsOfFriends.forEach((fof: any) => {
        const requesterIsFriend = friendIds.includes(fof.requester_id);
        const addresseeIsFriend = friendIds.includes(fof.addressee_id);

        // Skip if both are direct friends (friendship between direct friends)
        if (requesterIsFriend && addresseeIsFriend) {
          return;
        }

        // Skip if neither is a direct friend
        if (!requesterIsFriend && !addresseeIsFriend) {
          return;
        }

        // Extract the other user (the one who is NOT a direct friend)
        let otherUserId: string;
        let otherUser: any;

        if (requesterIsFriend) {
          otherUserId = fof.addressee_id;
          otherUser = Array.isArray(fof.addressee) ? fof.addressee[0] : fof.addressee;
        } else {
          otherUserId = fof.requester_id;
          otherUser = Array.isArray(fof.requester) ? fof.requester[0] : fof.requester;
        }

        if (!excludeIds.has(otherUserId) && otherUser && !fofMap.has(otherUserId)) {
          fofMap.set(otherUserId, {
            friendship_id: 0,
            friend_id: otherUserId,
            friend_username: otherUser.username,
            friend_name: otherUser.name,
            friend_email: otherUser.email,
            created_at: '',
          });
        }
      });

      setFriendsOfFriends(Array.from(fofMap.values()));
    } catch (error) {
      // Silent error handling
    }
  };

  const sendFriendRequestToUser = async (targetUserId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('friendships')
        .insert({ requester_id: currentUserId, addressee_id: targetUserId });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Info', 'Friend request already sent');
        } else {
          Alert.alert('Error', 'Failed to send friend request');
        }
      } else {
        Alert.alert('Success', 'Friend request sent!');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          title: 'Friends'
        }} 
      />
      <View style={styles.container}>
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <FontAwesome name="arrow-left" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Friends</Text>
          <View style={styles.placeholder} />
        </Animated.View>

        {/* Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#568A60" />
              <Text style={styles.loadingText}>Loading friends...</Text>
            </View>
          ) : friends.length === 0 && friendsOfFriends.length === 0 ? (
            <Animated.View 
              style={[
                styles.emptyState,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <View style={styles.emptyIconContainer}>
                <FontAwesome name="users" size={56} color="#C8D5CC" />
              </View>
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptySubtext}>Start connecting with others!</Text>
            </Animated.View>
          ) : (
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {/* Direct Friends Section */}
              {friends.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      Friends
                    </Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{friends.length}</Text>
                    </View>
                  </View>
                  {friends.map((friend, index) => {
                    // Ensure animation exists, initialize to 1 if not loaded yet (visible by default)
                    if (!friendAnimations[index]) {
                      friendAnimations[index] = new Animated.Value(1);
                    }
                    const itemAnim = friendAnimations[index];
                    return (
                      <Animated.View
                        key={friend.friend_id}
                        style={[
                          styles.friendItem,
                          {
                            opacity: itemAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 1],
                            }),
                            transform: [
                              {
                                translateX: itemAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [-50, 0],
                                }),
                              },
                              {
                                scale: itemAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.9, 1],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                      <TouchableOpacity
                        style={styles.friendItemContent}
                        onPress={() => {
                          router.push(`/user/${friend.friend_id}` as any);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.friendAvatar}>
                          <FontAwesome name="user" size={22} color="#568A60" />
                        </View>
                        <View style={styles.friendInfo}>
                          <Text style={styles.friendName} numberOfLines={1}>
                            {friend.friend_name || friend.friend_username || 'User'}
                          </Text>
                          {friend.friend_username && (
                            <Text style={styles.friendUsername} numberOfLines={1}>
                              @{friend.friend_username}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      {currentUserId && friend.friend_id !== currentUserId && (
                        <TouchableOpacity
                          style={styles.friendRequestButton}
                          onPress={() => sendFriendRequestToUser(friend.friend_id)}
                          activeOpacity={0.7}
                        >
                          <FontAwesome name="user-plus" size={16} color="#568A60" />
                        </TouchableOpacity>
                      )}
                    </Animated.View>
                    );
                  })}
                </>
              )}

              {/* Friends of Friends Section */}
              {friendsOfFriends.length > 0 && currentUserId && currentUserId !== userId && (
                <>
                  <View style={[styles.sectionHeader, { marginTop: 32 }]}>
                    <Text style={styles.sectionTitle}>
                      Friends of Friends
                    </Text>
                    <View style={[styles.countBadge, { backgroundColor: '#E8F5E9' }]}>
                      <Text style={[styles.countText, { color: '#4CAF50' }]}>{friendsOfFriends.length}</Text>
                    </View>
                  </View>
                  {friendsOfFriends.map((fof, index) => {
                    // Ensure animation exists, initialize to 1 if not loaded yet (visible by default)
                    if (!fofAnimations[index]) {
                      fofAnimations[index] = new Animated.Value(1);
                    }
                    const itemAnim = fofAnimations[index];
                    return (
                      <Animated.View
                        key={fof.friend_id}
                        style={[
                          styles.friendItem,
                          {
                            opacity: itemAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 1],
                            }),
                            transform: [
                              {
                                translateX: itemAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [-50, 0],
                                }),
                              },
                              {
                                scale: itemAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.9, 1],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                      <TouchableOpacity
                        style={styles.friendItemContent}
                        onPress={() => {
                          router.push(`/user/${fof.friend_id}` as any);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.friendAvatar, styles.friendOfFriendAvatar]}>
                          <FontAwesome name="user-plus" size={20} color="#4CAF50" />
                        </View>
                        <View style={styles.friendInfo}>
                          <Text style={styles.friendName} numberOfLines={1}>
                            {fof.friend_name || fof.friend_username || 'User'}
                          </Text>
                          {fof.friend_username && (
                            <Text style={styles.friendUsername} numberOfLines={1}>
                              @{fof.friend_username}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      {currentUserId && fof.friend_id !== currentUserId && (
                        <TouchableOpacity
                          style={styles.friendRequestButton}
                          onPress={() => sendFriendRequestToUser(fof.friend_id)}
                          activeOpacity={0.7}
                        >
                          <FontAwesome name="user-plus" size={16} color="#568A60" />
                        </TouchableOpacity>
                      )}
                    </Animated.View>
                    );
                  })}
                </>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(86, 138, 96, 0.08)',
    shadowColor: '#568A60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#f0f4f1',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f4f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4a4a4a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#568A60',
    marginTop: 16,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  countBadge: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#568A60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  countText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#568A60',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#568A60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(86, 138, 96, 0.08)',
  },
  friendItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendRequestButton: {
    padding: 12,
    borderRadius: 26,
    backgroundColor: '#E6F4EA',
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
    minHeight: 48,
    shadowColor: '#568A60',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  friendAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#568A60',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  friendOfFriendAvatar: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#C8E6C9',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  friendUsername: {
    fontSize: 14,
    color: '#568A60',
    fontWeight: '500',
  },
});

