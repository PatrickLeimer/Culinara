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
  FlatList,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

// --- Types ---
interface GroceryItem {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  price?: number;
  inPantry: boolean;
  ingredient_id?: number;
}

interface Ingredient {
  id: number;
  name: string;
  alternate_names?: string;
}

const UNITS = [
  { label: 'piece', value: 'piece' },
  { label: 'dozen', value: 'dozen' },
  { label: 'cup', value: 'cup' },
  { label: 'tsp', value: 'tsp' },
  { label: 'tbsp', value: 'tbsp' },
  { label: 'oz', value: 'oz' },
  { label: 'g', value: 'g' },
  { label: 'kg', value: 'kg' },
  { label: 'L', value: 'L' },
  { label: 'ml', value: 'ml' },
];

export default function GroceryList() {
  const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: '',
    unit: 'piece',
    price: '',
    ingredient_id: undefined as number | undefined,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Ingredient search
  const [showIngredientSearch, setShowIngredientSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ingredientResults, setIngredientResults] = useState<Ingredient[]>([]);
  const [allowCustomIngredient, setAllowCustomIngredient] = useState(false);
  const [searching, setSearching] = useState(false);

  // Unit picker
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Animations
  const addAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef<Animated.Value[]>([]).current;

  // --- Load groceries ---
  useEffect(() => {
    fetchGroceries();
  }, []);

  const fetchGroceries = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserId(null);
        setGroceryList([]);
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const { data, error } = await supabase
        .from('groceries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const mapped = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        quantity: r.quantity || 1,
        unit: r.unit || 'piece',
        price: r.price ? parseFloat(r.price.toString()) : undefined,
        inPantry: !!r.in_pantry,
        ingredient_id: r.ingredient_id || undefined,
      }));
      setGroceryList(mapped);
    } catch (err) {
      console.warn('Error fetching groceries', err);
    } finally {
      setLoading(false);
      Animated.timing(addAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  };

  // --- Add Item ---
  const addGroceryItem = async () => {
    const name = newItem.name.trim();
    if (!name) return;
    const quantity = parseFloat(newItem.quantity) || 1;
    const price = newItem.price ? parseFloat(newItem.price) : null;

    setSaving(true);
    try {
      if (userId) {
        const { data, error } = await supabase
          .from('groceries')
          .insert([
            {
              user_id: userId,
              name,
              quantity,
              unit: newItem.unit,
              price,
              in_pantry: false,
              ingredient_id: newItem.ingredient_id,
            },
          ])
          .select()
          .single();
        if (error) throw error;
        const item: GroceryItem = {
          id: data.id,
          name: data.name,
          quantity: data.quantity || 1,
          unit: data.unit || 'piece',
          price: data.price ? parseFloat(data.price.toString()) : undefined,
          inPantry: false,
          ingredient_id: data.ingredient_id || undefined,
        };
        setGroceryList([item, ...groceryList]);
      } else {
        setGroceryList([
          { name, quantity, unit: newItem.unit, inPantry: false },
          ...groceryList,
        ]);
      }
      setNewItem({ name: '', quantity: '', unit: 'piece', price: '', ingredient_id: undefined });
    } catch (err) {
      console.warn('Error adding item', err);
    } finally {
      setSaving(false);
    }
  };

  // --- Update field ---
  const updateItem = async (item: GroceryItem, index: number, field: keyof GroceryItem, value: any) => {
    const updated = [...groceryList];
    updated[index][field] = value;
    setGroceryList(updated);

    try {
      if (item.id) {
        await supabase.from('groceries').update({ [field]: value }).eq('id', item.id);
      }
    } catch (err) {
      console.warn('Error updating field', err);
    }
  };

  // --- Delete item ---
  const deleteItem = (item: GroceryItem, index: number) => {
    Alert.alert('Delete', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = [...groceryList];
          updated.splice(index, 1);
          setGroceryList(updated);
          if (item.id) {
            try {
              await supabase.from('groceries').delete().eq('id', item.id);
            } catch (err) {
              console.warn('Error deleting item', err);
            }
          }
        },
      },
    ]);
  };

  // --- Pantry toggle ---
  const togglePantry = async (item: GroceryItem, index: number) => {
    const updated = [...groceryList];
    updated[index].inPantry = !updated[index].inPantry;
    setGroceryList(updated);
    try {
      if (item.id) {
        await supabase.from('groceries').update({ in_pantry: updated[index].inPantry }).eq('id', item.id);
      }
    } catch (err) {
      console.warn('Error toggling pantry', err);
    }
  };

  // --- Ingredient Search ---
  const searchIngredients = async (query: string) => {
    if (query.length < 2) {
      setIngredientResults([]);
      setAllowCustomIngredient(false);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('Ingredients')
        .select('id, name, alternate_names')
        .ilike('name', `%${query}%`)
        .limit(20);
      if (error) throw error;
      setIngredientResults(data || []);
      setAllowCustomIngredient((data || []).length === 0 && query.length >= 3);
    } catch (err) {
      console.warn('Error searching ingredients', err);
    } finally {
      setSearching(false);
    }
  };

  const selectIngredient = (ingredient: Ingredient) => {
    setNewItem({
      ...newItem,
      name: ingredient.name,
      ingredient_id: ingredient.id,
    });
    setSearchQuery('');
    setIngredientResults([]);
    setShowIngredientSearch(false);
  };

  const useCustomIngredient = () => {
    if (searchQuery.trim()) {
      setNewItem({ ...newItem, name: searchQuery.trim(), ingredient_id: undefined });
      setSearchQuery('');
      setIngredientResults([]);
      setShowIngredientSearch(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#568A60" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Add Item Section */}
      <Animated.View
        style={[
          styles.addContainer,
          {
            opacity: addAnim,
            transform: [
              {
                scale: addAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity style={styles.searchButton} onPress={() => setShowIngredientSearch(true)}>
          <FontAwesome name="search" size={16} color="#568A60" />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder="Item Name"
          value={newItem.name}
          onChangeText={(text) => {
            setNewItem({ ...newItem, name: text });
            if (text.length > 2) {
              searchIngredients(text);
              setShowIngredientSearch(true);
            }
          }}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Qty"
          value={newItem.quantity}
          onChangeText={(text) => setNewItem({ ...newItem, quantity: text })}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.unitPicker} onPress={() => setShowUnitPicker(true)}>
          <Text style={styles.unitText}>{newItem.unit}</Text>
          <FontAwesome name="chevron-down" size={12} color="#666" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={addGroceryItem} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff' }}>Add</Text>}
        </TouchableOpacity>
      </Animated.View>

      {/* Grocery List */}
      <ScrollView style={styles.listContent} contentContainerStyle={{ paddingBottom: 120 }}>
        {groceryList.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="shopping-basket" size={48} color="#999" />
            <Text style={styles.emptyText}>No items in your grocery list</Text>
          </View>
        ) : (
          groceryList.map((item, index) => (
            <Animated.View key={item.id || index} style={styles.listItem}>
              <View style={styles.row}>
                <Switch
                  value={item.inPantry}
                  onValueChange={() => togglePantry(item, index)}
                  trackColor={{ false: '#ccc', true: '#568A60' }}
                />
                <TextInput
                  style={[styles.nameInput]}
                  value={item.name}
                  onChangeText={(t) => updateItem(item, index, 'name', t)}
                />
                <TextInput
                  style={styles.qtyInput}
                  value={item.quantity.toString()}
                  onChangeText={(t) => updateItem(item, index, 'quantity', parseFloat(t) || 1)}
                  keyboardType="numeric"
                />
                <Text>{item.unit}</Text>
                <TouchableOpacity onPress={() => deleteItem(item, index)} style={styles.deleteButton}>
                  <FontAwesome name="trash" size={18} color="#d32f2f" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {/* Ingredient Search Modal */}
      <Modal visible={showIngredientSearch} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Ingredients</Text>
              <TouchableOpacity onPress={() => setShowIngredientSearch(false)}>
                <FontAwesome name="times" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search ingredients..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchIngredients(text);
              }}
              autoFocus
            />
            {searching ? (
              <ActivityIndicator size="large" color="#568A60" />
            ) : (
              <FlatList
                data={ingredientResults}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.ingredientItem} onPress={() => selectIngredient(item)}>
                    <Text style={styles.ingredientName}>{item.name}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  allowCustomIngredient ? (
                    <TouchableOpacity style={styles.customIngredientButton} onPress={useCustomIngredient}>
                      <FontAwesome name="plus-circle" size={18} color="#568A60" />
                      <Text style={styles.customIngredientText}>Use "{searchQuery}"</Text>
                    </TouchableOpacity>
                  ) : null
                }
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Unit Picker Modal */}
      <Modal visible={showUnitPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.unitModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit</Text>
              <TouchableOpacity onPress={() => setShowUnitPicker(false)}>
                <FontAwesome name="times" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u.value}
                  style={[styles.unitItem, newItem.unit === u.value && styles.unitItemSelected]}
                  onPress={() => {
                    if (editingItemIndex !== null) {
                      updateItem(groceryList[editingItemIndex], editingItemIndex, 'unit', u.value);
                    } else {
                      setNewItem({ ...newItem, unit: u.value });
                    }
                    setShowUnitPicker(false);
                    setEditingItemIndex(null);
                  }}
                >
                  <Text style={[styles.unitText, newItem.unit === u.value && { color: '#568A60', fontWeight: 'bold' }]}>
                    {u.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Styles (simplified, still beautiful) ---
const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 8, paddingHorizontal: 16 },
  center: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  addContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  searchButton: { padding: 10, backgroundColor: '#E6F4EA', borderRadius: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  unitPicker: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitText: { fontSize: 14, color: '#333' },
  addButton: { backgroundColor: '#568A60', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  listContent: { flex: 1 },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameInput: { flex: 2, borderBottomWidth: 1, borderColor: '#ccc', fontSize: 16 },
  qtyInput: { width: 50, borderBottomWidth: 1, textAlign: 'center' },
  deleteButton: { padding: 8, backgroundColor: '#ffebee', borderRadius: 8 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#777', marginTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, width: '100%', padding: 16, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  searchInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12 },
  ingredientItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  ingredientName: { fontSize: 16 },
  customIngredientButton: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  customIngredientText: { color: '#568A60', marginLeft: 6 },
  unitModal: { backgroundColor: '#fff', borderRadius: 16, padding: 12, width: '90%', maxHeight: '70%' },
  unitItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  unitItemSelected: { backgroundColor: '#E6F4EA' },
});
