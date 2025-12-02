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
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface GroceryItem {
  id?: string;
  name: string;
  amount: string;
  unit?: string;
  quantity?: number;
  inPantry: boolean;
  price?: number;
  expires_at?: string;
  ingredient_id?: number;
}

interface Ingredient {
  id: number;
  name: string;
  alternate_names?: string;
}

const UNITS = [
  { label: 'lbs', value: 'lbs' },
  { label: 'oz', value: 'oz' },
  { label: 'g', value: 'g' },
  { label: 'kg', value: 'kg' },
  { label: 'gal', value: 'gal' },
  { label: 'qt', value: 'qt' },
  { label: 'pt', value: 'pt' },
  { label: 'cup', value: 'cup' },
  { label: 'tbsp', value: 'tbsp' },
  { label: 'tsp', value: 'tsp' },
  { label: 'ml', value: 'ml' },
  { label: 'L', value: 'L' },
  { label: 'piece', value: 'piece' },
  { label: 'dozen', value: 'dozen' },
];

export default function GroceryList() {
  const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
  const [newGroceryItem, setNewGroceryItem] = useState({ 
    name: '', 
    quantity: '', 
    unit: 'piece',
    price: '',
    ingredient_id: undefined as number | undefined
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [budget, setBudget] = useState<number>(0);
  const [budgetInput, setBudgetInput] = useState('');
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  
  // Ingredient search
  const [searchQuery, setSearchQuery] = useState('');
  const [ingredientResults, setIngredientResults] = useState<Ingredient[]>([]);
  const [showIngredientSearch, setShowIngredientSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null);
  const [allowCustomIngredient, setAllowCustomIngredient] = useState(false);

  // Animation refs
  const itemAnimations = useRef<Animated.Value[]>([]).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const budgetCardAnim = useRef(new Animated.Value(0)).current;
  const addSectionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchGroceryList();
    fetchBudget();
  }, []);

  useEffect(() => {
    // Initialize animations for items
    while (itemAnimations.length < groceryList.length) {
      itemAnimations.push(new Animated.Value(0));
    }
    
    // Animate budget card and add section
    Animated.parallel([
      Animated.timing(budgetCardAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(addSectionAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Staggered animation for grocery items
      itemAnimations.slice(0, groceryList.length).forEach((anim, index) => {
        Animated.sequence([
          Animated.delay(index * 60),
          Animated.parallel([
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.spring(anim, {
              toValue: 1,
              tension: 50,
              friction: 7,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    });
  }, [groceryList.length]);

  const fetchGroceryList = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('groceries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching groceries:', error);
      } else if (data) {
        const mapped: GroceryItem[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          amount: item.amount || `${item.quantity || 1} ${item.unit || 'piece'}`,
          unit: item.unit || 'piece',
          quantity: item.quantity ? parseFloat(item.quantity.toString()) : (item.amount ? parseFloat(item.amount.split(' ')[0]) : 1),
          inPantry: item.in_pantry || false,
          price: item.price ? parseFloat(item.price.toString()) : undefined,
          expires_at: item.expires_at,
          ingredient_id: item.ingredient_id || undefined,
        }));
        setGroceryList(mapped);
      }
    } catch (error) {
      console.error('Error fetching groceries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudget = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has a budget setting (you might need to add a user_settings table)
      // For now, we'll store it in a simple way or use local storage
      // This is a placeholder - you may want to create a user_settings table
      const { data } = await supabase
        .from('users')
        .select('budget')
        .eq('id', user.id)
        .single();
      
      if (data?.budget) {
        setBudget(data.budget);
        setBudgetInput(data.budget.toString());
      }
    } catch (error) {
      console.error('Error fetching budget:', error);
    }
  };

  const saveBudget = async () => {
    try {
      const budgetValue = parseFloat(budgetInput) || 0;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update budget - you may need to add a budget column to users table or create a settings table
      // For now, we'll use a workaround with user metadata or create a simple settings approach
      setBudget(budgetValue);
      setShowBudgetModal(false);
      
      // Note: You'll need to add a budget column to the users table or create a user_settings table
      // ALTER TABLE public.users ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2);
    } catch (error) {
      console.error('Error saving budget:', error);
    }
  };

  const searchIngredients = async (query: string) => {
    if (query.length < 2) {
      setIngredientResults([]);
      setAllowCustomIngredient(false);
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from('Ingredients')
        .select('id, name, alternate_names')
        .ilike('name', `%${query}%`)
        .limit(20);

      if (error) {
        console.error('Error searching ingredients:', error);
      } else {
        setIngredientResults(data || []);
        // Allow custom ingredient if no results found and query is long enough
        setAllowCustomIngredient((data || []).length === 0 && query.length >= 3);
      }
    } catch (error) {
      console.error('Error searching ingredients:', error);
    } finally {
      setSearching(false);
    }
  };

  const selectIngredient = (ingredient: Ingredient) => {
    setNewGroceryItem({ ...newGroceryItem, name: ingredient.name, ingredient_id: ingredient.id });
    setShowIngredientSearch(false);
    setSearchQuery('');
    setIngredientResults([]);
    setAllowCustomIngredient(false);
  };

  const useCustomIngredient = () => {
    // Use the search query as the custom ingredient name
    if (searchQuery.trim()) {
      setNewGroceryItem({ ...newGroceryItem, name: searchQuery.trim(), ingredient_id: undefined });
      setShowIngredientSearch(false);
      setSearchQuery('');
      setIngredientResults([]);
      setAllowCustomIngredient(false);
    }
  };

  const togglePantry = async (item: GroceryItem, index: number) => {
    const updated = [...groceryList];
    updated[index].inPantry = !updated[index].inPantry;
    setGroceryList(updated);

    // Save to database
    if (item.id) {
      try {
        const { error } = await supabase
          .from('groceries')
          .update({ in_pantry: updated[index].inPantry })
          .eq('id', item.id);

        if (error) {
          console.error('Error updating pantry status:', error);
          // Revert on error
          updated[index].inPantry = !updated[index].inPantry;
          setGroceryList(updated);
        }
      } catch (error) {
        console.error('Error updating pantry status:', error);
      }
    }
  };

  const addGroceryItem = async () => {
    const trimmedName = newGroceryItem.name.trim();
    if (!trimmedName) return;

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const quantity = parseFloat(newGroceryItem.quantity) || 1;
      const amount = `${quantity} ${newGroceryItem.unit}`;
      const price = newGroceryItem.price ? parseFloat(newGroceryItem.price) : null;

      const insertData: any = {
        user_id: user.id,
        name: trimmedName,
        amount: amount,
        quantity: quantity,
        unit: newGroceryItem.unit,
        in_pantry: false,
      };

      if (newGroceryItem.ingredient_id) {
        insertData.ingredient_id = newGroceryItem.ingredient_id;
      }

      if (price !== null) {
        insertData.price = price;
      }

      const { data, error } = await supabase
        .from('groceries')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error adding grocery item:', error);
        Alert.alert('Error', `Failed to add grocery item: ${error.message}`);
      } else if (data) {
        const newItem: GroceryItem = {
          id: data.id,
          name: data.name,
          amount: data.amount || amount,
          unit: data.unit || newGroceryItem.unit,
          quantity: data.quantity ? parseFloat(data.quantity.toString()) : quantity,
          inPantry: false,
          price: data.price ? parseFloat(data.price.toString()) : undefined,
          ingredient_id: data.ingredient_id || undefined,
        };
        setGroceryList([newItem, ...groceryList]);
        setNewGroceryItem({ name: '', quantity: '', unit: 'piece', price: '', ingredient_id: undefined });
      }
    } catch (error) {
      console.error('Error adding grocery item:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateGroceryItem = async (item: GroceryItem, index: number, field: string, value: any) => {
    const updated = [...groceryList];
    if (field === 'name') {
      updated[index].name = value;
    } else if (field === 'quantity') {
      updated[index].quantity = parseFloat(value) || 1;
      updated[index].amount = `${updated[index].quantity} ${updated[index].unit || 'piece'}`;
    } else if (field === 'unit') {
      updated[index].unit = value;
      updated[index].amount = `${updated[index].quantity || 1} ${value}`;
    } else if (field === 'price') {
      updated[index].price = parseFloat(value) || undefined;
    }
    setGroceryList(updated);

    // Save to database
    if (item.id) {
      try {
        const updateData: any = {};
        if (field === 'name') {
          updateData.name = value;
        } else if (field === 'quantity') {
          updateData.quantity = parseFloat(value) || 1;
          updateData.amount = `${updateData.quantity} ${updated[index].unit || 'piece'}`;
        } else if (field === 'unit') {
          updateData.unit = value;
          updateData.amount = `${updated[index].quantity || 1} ${value}`;
        } else if (field === 'price') {
          updateData.price = parseFloat(value) || null;
        }

        const { error } = await supabase
          .from('groceries')
          .update(updateData)
          .eq('id', item.id);

        if (error) {
          console.error('Error updating grocery item:', error);
          Alert.alert('Error', `Failed to update item: ${error.message}`);
        }
      } catch (error) {
        console.error('Error updating grocery item:', error);
      }
    }
  };

  const deleteGroceryItem = async (item: GroceryItem, index: number) => {
    // Show confirmation dialog
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (item.id) {
              try {
                const { error } = await supabase
                  .from('groceries')
                  .delete()
                  .eq('id', item.id);

                if (error) {
                  console.error('Error deleting grocery item:', error);
                  Alert.alert('Error', `Failed to delete item: ${error.message}`);
                  return;
                }
              } catch (error) {
                console.error('Error deleting grocery item:', error);
                Alert.alert('Error', 'An unexpected error occurred while deleting the item.');
                return;
              }
            }

            // Remove from local state
            const updated = [...groceryList];
            updated.splice(index, 1);
            setGroceryList(updated);
          },
        },
      ]
    );
  };

  const calculateTotal = () => {
    return groceryList
      .filter(item => !item.inPantry && item.price)
      .reduce((sum, item) => sum + (item.price || 0), 0);
  };

  const totalCost = calculateTotal();
  const remainingBudget = budget - totalCost;

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#568A60" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Budget Section */}
      <Animated.View 
        style={[
          styles.budgetSection,
          {
            opacity: budgetCardAnim,
            transform: [{ translateY: budgetCardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0],
            })}],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.budgetCard}
          onPress={() => setShowBudgetModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.budgetRow}>
            <View>
              <Text style={styles.budgetLabel}>Budget</Text>
              <Text style={styles.budgetAmount}>${budget.toFixed(2)}</Text>
            </View>
            <View style={styles.budgetRight}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={[styles.totalAmount, totalCost > budget && styles.overBudget]}>
                ${totalCost.toFixed(2)}
              </Text>
            </View>
          </View>
          {budget > 0 && (
            <View style={styles.remainingRow}>
              <Text style={styles.remainingLabel}>Remaining</Text>
              <Text style={[styles.remainingAmount, remainingBudget < 0 && styles.overBudget]}>
                ${remainingBudget.toFixed(2)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Add Item Section */}
      <Animated.View 
        style={[
          styles.addContainer,
          {
            opacity: addSectionAnim,
            transform: [{ scale: addSectionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.95, 1],
            })}],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => setShowIngredientSearch(true)}
        >
          <FontAwesome name="search" size={16} color="#568A60" />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder="Item Name"
          value={newGroceryItem.name}
          onChangeText={text => {
            setNewGroceryItem({ ...newGroceryItem, name: text });
            if (text.length > 2) {
              searchIngredients(text);
              setShowIngredientSearch(true);
            }
          }}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Qty"
          value={newGroceryItem.quantity}
          onChangeText={text => setNewGroceryItem({ ...newGroceryItem, quantity: text })}
          keyboardType="numeric"
        />
        <TouchableOpacity 
          style={styles.unitPicker}
          onPress={() => {
            setEditingItemIndex(null);
            setShowUnitPicker(true);
          }}
        >
          <Text style={styles.unitText}>{newGroceryItem.unit}</Text>
          <FontAwesome name="chevron-down" size={12} color="#666" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="$"
          value={newGroceryItem.price}
          onChangeText={text => setNewGroceryItem({ ...newGroceryItem, price: text })}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity 
          style={[styles.addButton, saving && styles.addButtonDisabled]} 
          onPress={addGroceryItem}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '600' }}>Add</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Grocery List */}
      <ScrollView 
        style={styles.listContent}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {groceryList.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="shopping-basket" size={48} color="#999" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No items in your grocery list</Text>
            <Text style={styles.emptySubtext}>Add items to get started!</Text>
          </View>
        ) : (
          groceryList.map((item, index) => {
            // Ensure animation exists
            if (!itemAnimations[index]) {
              itemAnimations[index] = new Animated.Value(1);
            }
            const itemAnim = itemAnimations[index];
            return (
            <Animated.View 
              key={item.id || index} 
              style={[
                styles.listItem,
                {
                  opacity: itemAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                  transform: [
                    {
                      translateX: itemAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-30, 0],
                      }),
                    },
                    {
                      scale: itemAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Grid Layout: 4 columns x 2 rows */}
              {/* Row 1 */}
              <View style={styles.gridRow}>
                <View style={styles.gridCell}>
                  <Switch 
                    value={item.inPantry} 
                    onValueChange={() => togglePantry(item, index)}
                    trackColor={{ false: '#ccc', true: '#568A60' }}
                  />
                </View>
                <View style={[styles.gridCell, styles.gridCell2x]}>
                  {editingNameIndex === index ? (
                    <TextInput
                      style={styles.itemTextInput}
                      value={item.name}
                      onChangeText={text => updateGroceryItem(item, index, 'name', text)}
                      onBlur={() => setEditingNameIndex(null)}
                      placeholder="Item name"
                      placeholderTextColor="#999"
                      autoFocus
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => setEditingNameIndex(index)}
                      style={styles.nameTouchable}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.itemNameDisplay} numberOfLines={1}>
                        {item.name || 'Tap to add name'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.gridCell}>
                  <View style={styles.quantityBox}>
                    <TextInput
                      style={styles.quantityInput}
                      value={item.quantity?.toString() || '1'}
                      onChangeText={text => updateGroceryItem(item, index, 'quantity', text)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.gridCell}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingItemIndex(index);
                      setNewGroceryItem({ ...newGroceryItem, unit: item.unit || 'piece' });
                      setShowUnitPicker(true);
                    }}
                  >
                    <View style={styles.unitDisplayContainer}>
                      <Text style={styles.unitDisplay}>{item.unit || 'piece'}</Text>
                      <FontAwesome name="chevron-down" size={10} color="#666" style={{ marginLeft: 4 }} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Row 2 */}
              <View style={styles.gridRow}>
                <View style={styles.gridCell} />
                <View style={styles.gridCell} />
                <View style={styles.gridCell}>
                  <View style={styles.priceBox}>
                    <Text style={styles.priceSign}>$</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={item.price?.toString() || ''}
                      onChangeText={text => updateGroceryItem(item, index, 'price', text)}
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <View style={styles.gridCell}>
                  <TouchableOpacity 
                    onPress={() => deleteGroceryItem(item, index)}
                    style={styles.deleteButton}
                    activeOpacity={0.7}
                  >
                    <FontAwesome name="trash" size={18} color="#d32f2f" />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* Ingredient Search Modal */}
      <Modal
        visible={showIngredientSearch}
        transparent={true}
        animationType="fade"
              onRequestClose={() => {
                setShowIngredientSearch(false);
                setSearchQuery('');
                setIngredientResults([]);
                setAllowCustomIngredient(false);
              }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.searchModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Ingredients</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowIngredientSearch(false);
                  setSearchQuery('');
                  setIngredientResults([]);
                  setAllowCustomIngredient(false);
                }}
              >
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
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color="#568A60" />
              </View>
            ) : (
              <FlatList
                data={ingredientResults}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.ingredientItem}
                    onPress={() => selectIngredient(item)}
                  >
                    <Text style={styles.ingredientName}>{item.name}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  searchQuery.length >= 3 ? (
                    <View style={styles.centerContent}>
                      <Text style={styles.emptyText}>No ingredients found</Text>
                      {allowCustomIngredient && (
                        <TouchableOpacity
                          style={styles.customIngredientButton}
                          onPress={useCustomIngredient}
                          activeOpacity={0.7}
                        >
                          <FontAwesome name="plus-circle" size={20} color="#568A60" style={{ marginRight: 8 }} />
                          <Text style={styles.customIngredientText}>
                            Use "{searchQuery}" as custom ingredient
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : null
                }
                style={styles.ingredientList}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Budget Modal */}
      <Modal
        visible={showBudgetModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBudgetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.budgetModalContent}>
            <Text style={styles.modalTitle}>Set Budget</Text>
            <TextInput
              style={styles.budgetInput}
              placeholder="Enter budget amount"
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowBudgetModal(false);
                  setBudgetInput(budget.toString());
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveBudget}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unit Picker Modal */}
      <Modal
        visible={showUnitPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowUnitPicker(false);
          setEditingItemIndex(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.unitModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit</Text>
              <TouchableOpacity onPress={() => {
                setShowUnitPicker(false);
                setEditingItemIndex(null);
              }}>
                <FontAwesome name="times" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.unitList}
              keyboardShouldPersistTaps="handled"
            >
              {UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit.value}
                  style={[
                    styles.unitItem,
                    newGroceryItem.unit === unit.value && styles.unitItemSelected
                  ]}
                  onPress={() => {
                    if (editingItemIndex !== null && editingItemIndex >= 0) {
                      // Update existing item
                      updateGroceryItem(groceryList[editingItemIndex], editingItemIndex, 'unit', unit.value);
                    } else {
                      // Update new item
                      setNewGroceryItem({ ...newGroceryItem, unit: unit.value });
                    }
                    setShowUnitPicker(false);
                    setEditingItemIndex(null);
                  }}
                >
                  <Text style={[
                    styles.unitItemText,
                    newGroceryItem.unit === unit.value && styles.unitItemTextSelected
                  ]}>
                    {unit.label}
                  </Text>
                  {newGroceryItem.unit === unit.value && (
                    <FontAwesome name="check" size={16} color="#568A60" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
    paddingVertical: 40,
  },
  budgetSection: {
    marginBottom: 16,
  },
  budgetCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetRight: {
    alignItems: 'flex-end',
  },
  budgetLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  budgetAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#568A60',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  overBudget: {
    color: '#d32f2f',
  },
  remainingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  remainingLabel: {
    fontSize: 14,
    color: '#666',
  },
  remainingAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#568A60',
  },
  addContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16, 
    gap: 8 
  },
  searchButton: {
    padding: 10,
    backgroundColor: '#E6F4EA',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
  unitPicker: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#568A60',
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  listContent: { 
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
  },
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
    marginBottom: 8,
  },
  gridCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  gridCell2x: {
    flex: 2,
    alignItems: 'flex-start',
    paddingLeft: 12,
  },
  nameTouchable: {
    paddingVertical: 8,
    width: '100%',
  },
  itemNameDisplay: {
    fontSize: 18,
    color: '#000',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  itemTextInput: {
    fontSize: 18,
    color: '#000',
    fontWeight: '700',
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 2,
    borderBottomColor: '#568A60',
    backgroundColor: 'transparent',
    width: '100%',
  },
  quantityBox: {
    backgroundColor: '#E6F4EA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    fontSize: 15,
    color: '#568A60',
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 30,
    padding: 0,
  },
  unitDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    minWidth: 70,
  },
  unitDisplay: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  priceAndDeleteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 70,
    gap: 4,
  },
  priceSign: {
    fontSize: 15,
    color: '#568A60',
    fontWeight: '700',
  },
  priceInput: {
    fontSize: 15,
    color: '#568A60',
    fontWeight: '700',
    textAlign: 'left',
    flex: 1,
    padding: 0,
    minWidth: 50,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
    minHeight: 36,
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
    maxHeight: '80%',
    width: '100%',
    paddingTop: 20,
  },
  searchModalContent: {
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
  ingredientList: {
    maxHeight: 400,
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
  searchInput: {
    margin: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    fontSize: 16,
  },
  ingredientItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ingredientName: {
    fontSize: 16,
    color: '#000',
  },
  budgetModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
  },
  budgetInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#568A60',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  unitModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    maxHeight: '70%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  unitList: {
    maxHeight: 500,
    paddingVertical: 8,
  },
  unitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    marginHorizontal: 8,
    borderRadius: 12,
    marginVertical: 2,
  },
  unitItemSelected: {
    backgroundColor: '#E6F4EA',
    borderBottomColor: '#E6F4EA',
  },
  unitItemText: {
    fontSize: 17,
    color: '#333',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  unitItemTextSelected: {
    color: '#568A60',
    fontWeight: '700',
  },
  customIngredientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#E6F4EA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#568A60',
    borderStyle: 'dashed',
  },
  customIngredientText: {
    fontSize: 16,
    color: '#568A60',
    fontWeight: '600',
  },
});
