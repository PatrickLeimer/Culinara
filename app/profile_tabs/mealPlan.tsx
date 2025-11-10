import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
} from 'react-native';

type MealTypes = 'b' | 'l' | 'd' | 's';
type WeeklyRecipes = Record<string, Record<MealTypes, string>>;

export default function MealPlan() {
  const [activeSection, setActiveSection] = useState<'mealPlan' | 'grocery'>('mealPlan');

  const [weeklyRecipes, setWeeklyRecipes] = useState<WeeklyRecipes>({
    Monday: { b: 'Pancakes', l: 'Salad', d: 'Chicken', s: 'Yogurt' },
    Tuesday: { b: 'Oatmeal', l: 'Sandwich', d: 'Pasta', s: 'Fruit' },
    Wednesday: { b: 'Eggs', l: 'Soup', d: 'Steak', s: 'Nuts' },
    Thursday: { b: 'Smoothie', l: 'Tacos', d: 'Fish', s: 'Granola' },
    Friday: { b: 'Bagel', l: 'Burger', d: 'Pizza', s: 'Chips' },
    Saturday: { b: 'French Toast', l: 'Salad', d: 'BBQ', s: 'Cookies' },
    Sunday: { b: 'Cereal', l: 'Wrap', d: 'Roast', s: 'Ice Cream' },
  });

  const [groceryList, setGroceryList] = useState([
    { name: 'Milk', amount: '1 gal', inPantry: false },
    { name: 'Eggs', amount: '12', inPantry: true },
    { name: 'Chicken Breast', amount: '2 lbs', inPantry: false },
  ]);

  const [newGroceryItem, setNewGroceryItem] = useState({ name: '', amount: '' });

  // Edit meal for a specific day and type
  const handleEditMeal = (day: string, mealType: MealTypes, value: string) => {
    setWeeklyRecipes(prev => ({
      ...prev,
      [day]: { ...prev[day], [mealType]: value },
    }));
  };

  // Toggle pantry status for grocery item
  const togglePantry = (index: number) => {
    const updated = [...groceryList];
    updated[index].inPantry = !updated[index].inPantry;
    setGroceryList(updated);
  };

  // Add new grocery item
  const addGroceryItem = () => {
    const trimmedName = newGroceryItem.name.trim();
    if (!trimmedName) return;
    setGroceryList([...groceryList, { ...newGroceryItem, inPantry: false }]);
    setNewGroceryItem({ name: '', amount: '' });
  };

  // Delete grocery item
  const deleteGroceryItem = (index: number) => {
    const updated = [...groceryList];
    updated.splice(index, 1);
    setGroceryList(updated);
  };

  return (
    <View style={styles.container}>
      {/* SECTION TOGGLE */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, activeSection === 'mealPlan' && styles.activeToggle]}
          onPress={() => setActiveSection('mealPlan')}
        >
          <Text style={[styles.toggleText, activeSection === 'mealPlan' && styles.activeText]}>
            Meal Plan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, activeSection === 'grocery' && styles.activeToggle]}
          onPress={() => setActiveSection('grocery')}
        >
          <Text style={[styles.toggleText, activeSection === 'grocery' && styles.activeText]}>
            Grocery List
          </Text>
        </TouchableOpacity>
      </View>

      {/* MEAL PLAN SECTION */}
      {activeSection === 'mealPlan' && (
        <ScrollView style={styles.recipesContainer}>
          {Object.entries(weeklyRecipes).map(([day, meals]) => (
            <View key={day} style={styles.dayContainer}>
              <Text style={styles.dayTitle}>{day}</Text>
              <View style={styles.mealsContainer}>
                {Object.entries(meals).map(([mealType, recipe]) => (
                  <View key={mealType} style={styles.recipeCard}>
                    <Text style={styles.mealType}>{mealType.toUpperCase()}</Text>
                    <TextInput
                      style={styles.recipeInput}
                      value={recipe}
                      onChangeText={text =>
                        handleEditMeal(day, mealType as MealTypes, text)
                      }
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* GROCERY LIST SECTION */}
      {activeSection === 'grocery' && (
        <View style={styles.listContainer}>
          <View style={styles.addContainer}>
            <TextInput
              style={[styles.input, { flex: 2 }]}
              placeholder="Item Name"
              value={newGroceryItem.name}
              onChangeText={text => setNewGroceryItem({ ...newGroceryItem, name: text })}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Amount"
              value={newGroceryItem.amount}
              onChangeText={text => setNewGroceryItem({ ...newGroceryItem, amount: text })}
            />
            <TouchableOpacity style={styles.addButton} onPress={addGroceryItem}>
              <Text style={{ color: '#fff' }}>Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.listContent}>
            {groceryList.map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Switch value={item.inPantry} onValueChange={() => togglePantry(index)} />
                <TextInput
                  style={[styles.itemText, { borderBottomWidth: 1, borderColor: '#ccc' }]}
                  value={item.name}
                  onChangeText={text => {
                    const updated = [...groceryList];
                    updated[index].name = text;
                    setGroceryList(updated);
                  }}
                />
                <TextInput
                  style={[styles.itemAmount, { borderBottomWidth: 1, borderColor: '#ccc', width: 60 }]}
                  value={item.amount}
                  onChangeText={text => {
                    const updated = [...groceryList];
                    updated[index].amount = text;
                    setGroceryList(updated);
                  }}
                />
                <TouchableOpacity onPress={() => deleteGroceryItem(index)}>
                  <Text style={{ color: 'red', marginLeft: 8 }}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#bfcdb8ff' },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    marginHorizontal: 5,
  },
  activeToggle: { backgroundColor: '#5b8049ff', borderColor: '#5b8049ff' },
  toggleText: { color: '#333' },
  activeText: { color: '#fff', fontWeight: '600' },
  recipesContainer: { flex: 1 },
  dayContainer: { marginBottom: 16, width: '100%' },
  dayTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  mealsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recipeCard: {
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    padding: 8,
    marginRight: 8,
    marginBottom: 8,
    width: 110,
  },
  mealType: { fontWeight: '600', color: '#444', marginBottom: 4 },
  recipeInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 4,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  listContainer: { flex: 1, marginTop: 8 },
  addContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  addButton: {
    backgroundColor: '#5b8049ff',
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  listContent: { marginTop: 8 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  itemText: { flex: 1, marginLeft: 10, fontSize: 16 },
  itemAmount: { color: '#666' },
});
