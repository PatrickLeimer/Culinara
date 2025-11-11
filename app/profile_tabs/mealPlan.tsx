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
  const [weeklyRecipes, setWeeklyRecipes] = useState<WeeklyRecipes>({
    Monday: { b: 'Pancakes', l: 'Salad', d: 'Chicken', s: 'Yogurt' },
    Tuesday: { b: 'Oatmeal', l: 'Sandwich', d: 'Pasta', s: 'Fruit' },
    Wednesday: { b: 'Eggs', l: 'Soup', d: 'Steak', s: 'Nuts' },
    Thursday: { b: 'Smoothie', l: 'Tacos', d: 'Fish', s: 'Granola' },
    Friday: { b: 'Bagel', l: 'Burger', d: 'Pizza', s: 'Chips' },
    Saturday: { b: 'French Toast', l: 'Salad', d: 'BBQ', s: 'Cookies' },
    Sunday: { b: 'Cereal', l: 'Wrap', d: 'Roast', s: 'Ice Cream' },
  });
  // Edit meal for a specific day and type
  const handleEditMeal = (day: string, mealType: MealTypes, value: string) => {
    setWeeklyRecipes(prev => ({
      ...prev,
      [day]: { ...prev[day], [mealType]: value },
    }));
  };

  // Map single-letter meal types to full labels
  const getMealLabel = (mealType: MealTypes) => {
    switch (mealType) {
      case 'b':
        return 'Breakfast';
      case 'l':
        return 'Lunch';
      case 'd':
        return 'Dinner';
      case 's':
        return 'Snack';
      default:
        return String(mealType).toUpperCase();
    }
  };

  // (MealPlan only) Toggle and edit handled in-place for weeklyRecipes above

  return (
    <View style={styles.container}>
      {/* MEAL PLAN SECTION */}
      <ScrollView style={styles.recipesContainer}>
        {Object.entries(weeklyRecipes).map(([day, meals]) => (
          <View key={day} style={styles.dayContainer}>
            <Text style={styles.dayTitle}>{day}</Text>
            <View style={styles.mealsContainer}>
              {Object.entries(meals).map(([mealType, recipe]) => (
                <View key={mealType} style={styles.recipeCard}>
                  <Text style={styles.mealType}>{getMealLabel(mealType as MealTypes)}</Text>
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
  mealsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  recipeCard: {
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    width: '48%', // two columns: two cards per row
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
