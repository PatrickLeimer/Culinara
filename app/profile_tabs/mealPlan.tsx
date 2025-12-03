import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

type MealTypes = 'b' | 'l' | 'd' | 's';
type WeeklyRecipes = Record<string, Record<MealTypes, string>>;

export default function MealPlan() {
  // ✅ Weekly recipes state
  const [weeklyRecipes, setWeeklyRecipes] = useState<WeeklyRecipes>({
    Monday: { b: 'Pancakes', l: 'Salad', d: 'Chicken', s: 'Yogurt' },
    Tuesday: { b: 'Oatmeal', l: 'Sandwich', d: 'Pasta', s: 'Fruit' },
    Wednesday: { b: 'Eggs', l: 'Soup', d: 'Steak', s: 'Nuts' },
    Thursday: { b: 'Smoothie', l: 'Tacos', d: 'Fish', s: 'Granola' },
    Friday: { b: 'Bagel', l: 'Burger', d: 'Pizza', s: 'Chips' },
    Saturday: { b: 'French Toast', l: 'Salad', d: 'BBQ', s: 'Cookies' },
    Sunday: { b: 'Cereal', l: 'Wrap', d: 'Roast', s: 'Ice Cream' },
  });

  // ✅ Edit a specific meal
  const handleEditMeal = (day: string, mealType: MealTypes, value: string) => {
    setWeeklyRecipes(prev => ({
      ...prev,
      [day]: { ...prev[day], [mealType]: value },
    }));
  };

  // ✅ Map short meal types to full labels
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
        return mealType.toUpperCase();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.recipesContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(weeklyRecipes).map(([day, meals]) => (
          <View key={day} style={styles.dayCard}>
            {/* Day Header */}
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{day}</Text>
            </View>

            {/* Meal Cards */}
            <View style={styles.mealsGrid}>
              {Object.entries(meals).map(([mealType, recipe]) => (
                <TouchableOpacity key={mealType} style={styles.mealCard} activeOpacity={0.8}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealType}>{getMealLabel(mealType as MealTypes)}</Text>
                  </View>
                  <TextInput
                    style={styles.recipeInput}
                    value={recipe}
                    onChangeText={text => handleEditMeal(day, mealType as MealTypes, text)}
                    placeholder="Add meal..."
                    placeholderTextColor="#999"
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
  // Container & scroll
  container: {
    flex: 1,
    backgroundColor: '#d6ddd6ff',
  },
  recipesContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },

  // Day cards
  dayCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ededed',
  },
  dayHeader: {
    marginBottom: 10,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.3,
  },

  // Meals grid
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
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  mealHeader: {
    marginBottom: 6,
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
});
