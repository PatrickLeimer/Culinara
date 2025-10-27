import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';

export default function MealPlan() {
  const [listMode, setListMode] = useState<'grocery' | 'pantry'>('grocery');
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const weeklyRecipes = {
    Monday: { b: 'Pancakes', l: 'Salad', d: 'Chicken', s: 'Yogurt' },
    Tuesday: { b: 'Oatmeal', l: 'Sandwich', d: 'Pasta', s: 'Fruit' },
    Wednesday: { b: 'Eggs', l: 'Soup', d: 'Steak', s: 'Nuts' },
    Thursday: { b: 'Smoothie', l: 'Tacos', d: 'Fish', s: 'Granola' },
    Friday: { b: 'Bagel', l: 'Burger', d: 'Pizza', s: 'Chips' },
    Saturday: { b: 'French Toast', l: 'Salad', d: 'BBQ', s: 'Cookies' },
    Sunday: { b: 'Cereal', l: 'Wrap', d: 'Roast', s: 'Ice Cream' },
  };

  const groceryList = [
    { name: 'Milk', amount: '1 gal' },
    { name: 'Eggs', amount: '12' },
    { name: 'Chicken Breast', amount: '2 lbs' },
  ];

  const pantryList = [
    { name: 'Rice', amount: '5 lbs', exp: '2025-11-01' },
    { name: 'Canned Beans', amount: '10 cans', exp: '2025-12-15' },
    { name: 'Olive Oil', amount: '1 L', exp: '2026-01-30' },
  ];

  const toggleCheck = (item: string) => {
    setCheckedItems(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.recipesContainer}>
        {Object.entries(weeklyRecipes).map(([day, meals]) => (
          <View key={day} style={styles.dayContainer}>
            <Text style={styles.dayTitle}>{day}</Text>
            <View style={styles.mealsContainer}>
              {Object.entries(meals).map(([mealType, recipe]) => (
                <View key={mealType} style={styles.recipeCard}>
                  <Text style={styles.mealType}>{mealType.toUpperCase()}</Text>
                  <Text style={styles.recipeName}>{recipe}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.listContainer}>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              listMode === 'grocery' && styles.activeToggle,
            ]}
            onPress={() => setListMode('grocery')}
          >
            <Text
              style={[
                styles.toggleText,
                listMode === 'grocery' && styles.activeText,
              ]}
            >
              Grocery List
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              listMode === 'pantry' && styles.activeToggle,
            ]}
            onPress={() => setListMode('pantry')}
          >
            <Text
              style={[
                styles.toggleText,
                listMode === 'pantry' && styles.activeText,
              ]}
            >
              Pantry List
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.listContent}>
          {listMode === 'grocery' &&
            groceryList.map(item => (
              <View key={item.name} style={styles.listItem}>
                <Switch
                  value={checkedItems.includes(item.name)}
                  onValueChange={() => toggleCheck(item.name)}
                />
                <Text style={styles.itemText}>{item.name}</Text>
                <Text style={styles.itemAmount}>{item.amount}</Text>
              </View>
            ))}

          {listMode === 'pantry' &&
            pantryList.map(item => (
              <View key={item.name} style={styles.listItem}>
                <Text style={styles.itemText}>{item.name}</Text>
                <Text style={styles.itemAmount}>{item.amount}</Text>
                <Text style={styles.itemExp}>{item.exp}</Text>
              </View>
            ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#bfcdb8ff' },
  recipesContainer: { flex: 2 },
  dayContainer: { marginBottom: 16 },
  dayTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  mealsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recipeCard: {
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    padding: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  mealType: { fontWeight: '600', color: '#444' },
  recipeName: { color: '#222' },
  listContainer: { flex: 1, marginTop: 20 },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    marginHorizontal: 5,
  },
  activeToggle: {
    backgroundColor: '#5b8049ff',
    borderColor: '#5b8049ff',
  },
  toggleText: { color: '#333' },
  activeText: { color: '#fff', fontWeight: '600' },
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
  itemExp: { color: '#999', fontSize: 12 },
});
