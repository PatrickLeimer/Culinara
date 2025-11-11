import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface Recipe {
  name: string;
  desc: string;
  ingredients: string[];
  tags: string[];
}

const MyRecipes: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([
    { name: 'Recipe 1', desc: 'Short description', ingredients: ['Ingredient 1'], tags: ['Tag 1'] },
    { name: 'Recipe 2', desc: 'Short description', ingredients: ['Ingredient 2'], tags: ['Tag 2'] },
  ]);

  const [addEditModalVisible, setAddEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeDesc, setNewRecipeDesc] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const ingredientsList = ['Ingredient 1', 'Ingredient 2', 'Ingredient 3', 'Ingredient 4', 'Ingredient 5', 'Ingredient 6'];
  const tagsList = ['Healthy', 'Quick', 'Low-Budget', 'Vegan', 'Breakfast', 'Lunch', 'Dinner', 'Dessert'];
  const [newIngredient, setNewIngredient] = useState('');

  const openAddModal = () => {
    setEditingIndex(null);
    setNewRecipeName('');
    setNewRecipeDesc('');
    setSelectedIngredients([]);
    setSelectedTags([]);
    setAddEditModalVisible(true);
  };

  const openEditModal = (index: number) => {
    const recipe = recipes[index];
    setEditingIndex(index);
    setNewRecipeName(recipe.name);
    setNewRecipeDesc(recipe.desc);
    setSelectedIngredients(recipe.ingredients);
    setSelectedTags(recipe.tags);
    setAddEditModalVisible(true);
  };

  const openViewModal = (index: number) => {
    setViewingIndex(index);
    setViewModalVisible(true);
  };

  const handleSaveRecipe = () => {
    const newRecipe: Recipe = {
      name: newRecipeName,
      desc: newRecipeDesc,
      ingredients: selectedIngredients,
      tags: selectedTags,
    };
    if (editingIndex !== null) {
      const updated = [...recipes];
      updated[editingIndex] = newRecipe;
      setRecipes(updated);
    } else {
      setRecipes([newRecipe, ...recipes]);
    }
    setAddEditModalVisible(false);
  };

  const handleDeleteRecipe = (index: number) => {
    const updated = [...recipes];
    updated.splice(index, 1);
    setRecipes(updated);
    setViewModalVisible(false);
  };

  const toggleSelection = (item: string, selected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (selected.includes(item)) setSelected(selected.filter((i) => i !== item));
    else setSelected([...selected, item]);
  };

  return (
    <View style={styles.container}>
      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <FontAwesome name="plus" size={20} color="#fff" />
      </TouchableOpacity>

      {/* Recipe Grid */}
      <ScrollView contentContainerStyle={styles.grid}>
        {recipes.map((recipe, index) => (
          <TouchableOpacity key={index} style={styles.recipeCard} onPress={() => openViewModal(index)}>
            <View style={styles.recipeImage} />
            <Text style={styles.recipeTitle}>{recipe.name}</Text>
            <Text style={styles.recipeDesc}>{recipe.desc}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* View Recipe Modal */}
      <Modal visible={viewModalVisible} transparent animationType="slide">
        {viewingIndex !== null && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{recipes[viewingIndex].name}</Text>
              <Text style={styles.modalDesc}>{recipes[viewingIndex].desc}</Text>
              <Text style={styles.modalSubTitle}>
                Ingredients: {recipes[viewingIndex].ingredients.join(', ')}
              </Text>
              <Text style={styles.modalSubTitle}>
                Tags: {recipes[viewingIndex].tags.join(', ')}
              </Text>

              <View style={styles.modalButtons}>

                <TouchableOpacity style={styles.cancelButton} onPress={() => setViewModalVisible(false)}>
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelButton, styles.deleteButton]}
                  onPress={() => handleDeleteRecipe(viewingIndex)}
                >
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => {
                    setViewModalVisible(false);
                    openEditModal(viewingIndex);
                  }}
                >
                  <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>

              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal visible={addEditModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingIndex !== null ? 'Edit Recipe' : 'Create New Recipe'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Recipe Name"
              value={newRecipeName}
              onChangeText={setNewRecipeName}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={newRecipeDesc}
              onChangeText={setNewRecipeDesc}
              multiline
            />

            <Text style={styles.label}>Ingredients</Text>

            {/* Add new ingredient */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Add new ingredient"
                value={newIngredient}
                onChangeText={setNewIngredient}
              />
              <TouchableOpacity
                style={[styles.saveButton, { marginLeft: 8, paddingHorizontal: 12 }]}
                onPress={() => {
                  if (newIngredient.trim() && !selectedIngredients.includes(newIngredient.trim())) {
                    setSelectedIngredients([...selectedIngredients, newIngredient.trim()]);
                    setNewIngredient('');
                  }
                }}
              >
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Ingredient selection list */}
            <ScrollView style={styles.dropdownList}>
              {selectedIngredients.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.dropdownItem, styles.selectedItem]}
                  onPress={() => toggleSelection(item, selectedIngredients, setSelectedIngredients)}
                >
                  <Text style={styles.dropdownText}>{item}</Text>
                  <Text>✓</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            

            <Text style={styles.label}>Tags</Text>
            <View style={styles.tagsContainer}>
              {tagsList.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.tagItem,
                    selectedTags.includes(item) && styles.tagSelected,
                  ]}
                  onPress={() => toggleSelection(item, selectedTags, setSelectedTags)}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setAddEditModalVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveRecipe}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MyRecipes;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 8, backgroundColor: '#bfcdb8ff' },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#5b8049ff',
    borderRadius: 30,
    padding: 12,
    zIndex: 2,
  },
  grid: { paddingBottom: 100 },
  recipeCard: {
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recipeImage: { height: 120, backgroundColor: '#ccc', borderRadius: 8, marginBottom: 8 },
  recipeTitle: { fontSize: 18, fontWeight: 'bold' },
  recipeDesc: { fontSize: 14, color: '#555' },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '85%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  modalDesc: { fontSize: 16, marginBottom: 8 },
  modalSubTitle: { fontSize: 14, marginBottom: 4 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  cancelButton: { backgroundColor: '#ccc', padding: 10, borderRadius: 8 },
  saveButton: { backgroundColor: '#5b8049ff', padding: 10, borderRadius: 8 },
  deleteButton: { backgroundColor: '#e74c3c' },
  buttonText: { color: '#fff' },

  input: { borderWidth: 1, color: '#bfcdb8ff', borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 10 },
  textArea: { height: 80 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 8 },
  dropdownList: { maxHeight: 100, marginVertical: 8 },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  dropdownText: { fontSize: 16 },
  selectedItem: { backgroundColor: '#bfcdb8ff' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  tagItem: { padding: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 12, margin: 4 },
  tagSelected: { backgroundColor: '#e0f7ff', borderColor: '#5b8049ff' },
});
