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
      {/* Weekly Calendar View */}
      <ScrollView 
        style={styles.recipesContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(weeklyRecipes).map(([day, meals], dayIndex) => (
          <View key={day} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{day}</Text>
            </View>
            
            <View style={styles.mealsGrid}>
              {Object.entries(meals).map(([mealType, recipe]) => (
                <TouchableOpacity 
                  key={mealType} 
                  style={styles.mealCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealType}>{getMealLabel(mealType as MealTypes)}</Text>
                  </View>
                  <TextInput
                    style={styles.recipeInput}
                    value={recipe}
                    onChangeText={text =>
                      handleEditMeal(day, mealType as MealTypes, text)
                    }
                    placeholder="Add meal..."
                    placeholderTextColor="#999"
                    multiline={false}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff',
  },
  recipesContainer: { 
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  dayCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  dayHeader: {
    marginBottom: 12,
  },
  dayTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#000',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  mealsGrid: { 
    gap: 8,
  },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  mealHeader: {
    marginBottom: 8,
  },
  mealType: { 
    fontWeight: '600', 
    color: '#568A60', 
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  recipeInput: {
    borderWidth: 0,
    borderRadius: 8,
    padding: 0,
    backgroundColor: 'transparent',
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    minHeight: 24,
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
