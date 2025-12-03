import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
  Modal,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

// Grocery item type
interface GroceryItem {
  id?: string;
  name: string;
  amount: string;
  inPantry: boolean;
}

// Main component
export default function GroceryList() {
  const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
  const [newGroceryItem, setNewGroceryItem] = useState({ name: '', amount: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Animations
  const itemAnimations = useRef<Animated.Value[]>([]).current;
  const addSectionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchGroceryList();
  }, []);

  const fetchGroceryList = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setGroceryList([]);
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const { data, error } = await supabase
        .from('groceries')
        .select('id, name, amount, in_pantry')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGroceryList(
        (data ?? []).map((r: any) => ({
          id: r.id,
          name: r.name,
          amount: r.amount || '',
          inPantry: !!r.in_pantry,
        }))
      );
    } catch (err) {
      console.warn('Error fetching groceries', err);
    } finally {
      setLoading(false);
      Animated.timing(addSectionAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  };

  const addGroceryItem = async () => {
    const trimmedName = newGroceryItem.name.trim();
    if (!trimmedName) return;
    setSaving(true);
    try {
      if (userId) {
        const { data, error } = await supabase
          .from('groceries')
          .insert([{ user_id: userId, name: trimmedName, amount: newGroceryItem.amount || '', in_pantry: false }])
          .select('id, name, amount, in_pantry')
          .single();
        if (error) throw error;
        setGroceryList([{ id: data.id, name: data.name, amount: data.amount, inPantry: !!data.in_pantry }, ...groceryList]);
      } else {
        setGroceryList([{ name: trimmedName, amount: newGroceryItem.amount, inPantry: false }, ...groceryList]);
      }
      setNewGroceryItem({ name: '', amount: '' });
    } catch (err) {
      console.warn('Error adding grocery item', err);
    } finally {
      setSaving(false);
    }
  };

  const togglePantry = async (item: GroceryItem, index: number) => {
    const updated = [...groceryList];
    updated[index].inPantry = !updated[index].inPantry;
    setGroceryList(updated);
    try {
      if (item.id) {
        await supabase
          .from('groceries')
          .update({ in_pantry: updated[index].inPantry })
          .eq('id', item.id);
      }
    } catch (err) {
      console.warn('Error updating pantry state', err);
    }
  };

  const updateGroceryItem = async (item: GroceryItem, index: number, field: 'name' | 'amount', value: string) => {
    const updated = [...groceryList];
    updated[index][field] = value;
    setGroceryList(updated);
    try {
      if (item.id) {
        await supabase.from('groceries').update({ [field]: value }).eq('id', item.id);
      }
    } catch (err) {
      console.warn(`Could not update grocery ${field}`, err);
    }
  };

  const deleteGroceryItem = async (item: GroceryItem, index: number) => {
    Alert.alert('Delete Item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = [...groceryList];
          updated.splice(index, 1);
          setGroceryList(updated);
          try {
            if (item.id) await supabase.from('groceries').delete().eq('id', item.id);
          } catch (err) {
            console.warn('Error deleting grocery item', err);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#568A60" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Add Section */}
      <Animated.View
        style={[
          styles.addContainer,
          {
            opacity: addSectionAnim,
            transform: [
              {
                scale: addSectionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder="Item Name"
          value={newGroceryItem.name}
          onChangeText={(text) => setNewGroceryItem({ ...newGroceryItem, name: text })}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Amount"
          value={newGroceryItem.amount}
          onChangeText={(text) => setNewGroceryItem({ ...newGroceryItem, amount: text })}
        />
        <TouchableOpacity
          style={[styles.addButton, saving && styles.addButtonDisabled]}
          onPress={addGroceryItem}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff' }}>Add</Text>}
        </TouchableOpacity>
      </Animated.View>

      {/* Grocery List */}
      <ScrollView style={styles.listContent} contentContainerStyle={{ paddingBottom: 100 }}>
        {groceryList.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="shopping-basket" size={48} color="#999" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No items in your grocery list</Text>
            <Text style={styles.emptySubtext}>Add items to get started!</Text>
          </View>
        ) : (
          groceryList.map((item, index) => (
            <Animated.View key={item.id || index} style={[styles.listItem]}>
              <View style={styles.gridRow}>
                <View style={styles.gridCell}>
                  <Switch
                    value={item.inPantry}
                    onValueChange={() => togglePantry(item, index)}
                    trackColor={{ false: '#ccc', true: '#568A60' }}
                  />
                </View>
                <View style={[styles.gridCell, styles.gridCell2x]}>
                  <TextInput
                    style={styles.itemTextInput}
                    value={item.name}
                    onChangeText={(text) => updateGroceryItem(item, index, 'name', text)}
                    placeholder="Item name"
                  />
                </View>
                <View style={styles.gridCell}>
                  <TextInput
                    style={styles.amountInput}
                    value={item.amount}
                    onChangeText={(text) => updateGroceryItem(item, index, 'amount', text)}
                    placeholder="Qty"
                  />
                </View>
                <TouchableOpacity onPress={() => deleteGroceryItem(item, index)} style={styles.deleteButton}>
                  <FontAwesome name="trash" size={18} color="#d32f2f" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// --- STYLES (kept from first file, simplified slightly) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  addButton: {
    backgroundColor: '#568A60',
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  addButtonDisabled: { opacity: 0.6 },
  listContent: { flex: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#888', marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: '#aaa' },
  listItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#568A60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  gridCell2x: { flex: 2, alignItems: 'flex-start', paddingLeft: 12 },
  itemTextInput: {
    fontSize: 16,
    color: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: '100%',
  },
  amountInput: {
    fontSize: 16,
    color: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    textAlign: 'center',
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
});
