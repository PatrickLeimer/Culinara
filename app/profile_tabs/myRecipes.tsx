import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  Switch,
  Alert,
  Image,
  DeviceEventEmitter,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';

interface Recipe {
  id?: string;
  name: string;
  desc: string;
  ingredients: string[];
  tags: string[];
  visibility?: boolean; // true = public, false = private
  Picture?: string | null;
}

type Props = {
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
};

const MyRecipes: React.FC<Props> = ({ recipes, setRecipes }) => {
  const [addEditModalVisible, setAddEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeDesc, setNewRecipeDesc] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newRecipeVisibility, setNewRecipeVisibility] = useState<boolean>(true);
  const [newRecipePicture, setNewRecipePicture] = useState<string>('');
  const [newRecipePictureRequire, setNewRecipePictureRequire] = useState<any | null>(null);

  const ingredientsList = ['Ingredient 1', 'Ingredient 2', 'Ingredient 3', 'Ingredient 4', 'Ingredient 5', 'Ingredient 6'];
  const tagsList = ['Healthy', 'Quick', 'Low-Budget', 'Vegan', 'Breakfast', 'Lunch', 'Dinner', 'Dessert'];
  const [newIngredient, setNewIngredient] = useState('');

  // Local asset options (map to require sources for preview and a path string to store in DB)
  const assetOptions = [
    { key: 'green_smoothie', label: 'Green Smoothie', src: require('../../assets/images/green_smoothie.png'), path: 'assets/images/green_smoothie.png' },
    { key: 'chickpea_curry', label: 'Chickpea Curry', src: require('../../assets/images/chickpea_curry.png'), path: 'assets/images/chickpea_curry.png' },
    { key: 'avocado_toast', label: 'Avocado Toast', src: require('../../assets/images/avocado_toast.png'), path: 'assets/images/avocado_toast.png' },
    { key: 'lemon_chicken', label: 'Lemon Chicken', src: require('../../assets/images/lemon_chicken.png'), path: 'assets/images/lemon_chicken.png' },
    { key: 'mug_cake', label: 'Mug Cake', src: require('../../assets/images/mug_cake.png'), path: 'assets/images/mug_cake.png' },
  ];

  const openAddModal = () => {
    setEditingIndex(null);
    setNewRecipeName('');
    setNewRecipeDesc('');
    setSelectedIngredients([]);
    setSelectedTags([]);
    setNewRecipeVisibility(true);
    setNewRecipePicture('');
    setNewRecipePictureRequire(null);
    setAddEditModalVisible(true);
  };

  const openEditModal = (index: number) => {
    const recipe = recipes[index];
    setEditingIndex(index);
    setNewRecipeName(recipe.name);
    setNewRecipeDesc(recipe.desc);
    setSelectedIngredients(recipe.ingredients);
    setSelectedTags(recipe.tags);
    setNewRecipeVisibility(recipe.visibility ?? true);
    // If recipe has a Picture path saved from DB, set preview. We assume DB stores 'assets/images/...' path.
    if ((recipe as any).Picture) {
      setNewRecipePicture((recipe as any).Picture);
      const mapped = assetOptions.find((a) => a.path === (recipe as any).Picture);
      setNewRecipePictureRequire(mapped ? mapped.src : null);
    } else {
      setNewRecipePicture('');
      setNewRecipePictureRequire(null);
    }
    setAddEditModalVisible(true);
  };

  const openViewModal = (index: number) => {
    setViewingIndex(index);
    setViewModalVisible(true);
  };

  const handleSaveRecipe = async () => {
    const newRecipe: Recipe = {
      name: newRecipeName,
      desc: newRecipeDesc,
      ingredients: selectedIngredients,
      tags: selectedTags,
      visibility: newRecipeVisibility,
    };

    try {
      // get current user id
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Error', 'Could not determine current user. Please log in again.');
        return;
      }

      // If editing an existing recipe that has an id, perform UPDATE; otherwise INSERT
      if (editingIndex !== null && (recipes[editingIndex] as any)?.id) {
        const existingId = (recipes[editingIndex] as any).id;
        const payloadUpdate = {
          Name: newRecipe.name,
          Description: newRecipe.desc,
          Picture: newRecipePicture || (recipes[editingIndex] as any).Picture || '',
          Tags: newRecipe.tags,
          // Ingredients column not present in DB; keep locally but don't send to server
          Public: !!newRecipe.visibility,
        } as any;

        const { data: updatedRow, error: updateError } = await supabase
          .from('Recipes')
          .update(payloadUpdate)
          .eq('id', existingId)
          .select('id, created_at')
          .single();

          if (updateError) {
          console.error('Error updating recipe:', updateError);
          Alert.alert('Error', 'Could not update recipe on server.');
        } else {
          const savedRecipe = { ...newRecipe, id: existingId, created_at: updatedRow?.created_at, Picture: payloadUpdate.Picture } as any;
          const updated = [...recipes];
          updated[editingIndex] = savedRecipe;
          setRecipes(updated);
          setAddEditModalVisible(false);
          // notify other screens to refresh their recipe lists
          try { DeviceEventEmitter.emit('recipesUpdated'); } catch (e) { /* no-op if emitter unavailable */ }
        }
      } else {
        // Insert new recipe
        const payload = {
          Name: newRecipe.name,
          Description: newRecipe.desc,
          Picture: newRecipePicture || '',
          Tags: newRecipe.tags,
          // Do not send Ingredients column — it does not exist in DB schema
          user_id: user.id,
          Public: !!newRecipe.visibility,
        } as any;

        const { data: inserted, error: insertError } = await supabase
          .from('Recipes')
          .insert(payload)
          .select('id, created_at')
          .single();

        if (insertError) {
          console.error('Error inserting recipe:', insertError);
          Alert.alert('Error', 'Could not save recipe to server.');
        } else {
          const savedRecipe = { ...newRecipe, id: inserted?.id, created_at: inserted?.created_at, Picture: payload.Picture } as any;
          setRecipes([savedRecipe, ...recipes]);
          setAddEditModalVisible(false);
          // notify other screens to refresh their recipe lists
          try { DeviceEventEmitter.emit('recipesUpdated'); } catch (e) { /* no-op if emitter unavailable */ }
        }
      }
    } catch (err) {
      console.error('Unexpected error saving recipe:', err);
      Alert.alert('Error', 'Unexpected error while saving recipe.');
    }
  };

  const handleDeleteRecipe = (index: number) => {
    const recipe = recipes[index] as any;
    const proceedLocalDelete = () => {
      const updated = [...recipes];
      updated.splice(index, 1);
      setRecipes(updated);
      setViewModalVisible(false);
    };

    // If recipe exists in DB, delete from server first
      if (recipe?.id) {
      supabase
        .from('Recipes')
        .delete()
        .eq('id', recipe.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error deleting recipe from server:', error);
            Alert.alert('Error', 'Could not delete recipe from server.');
          } else {
            proceedLocalDelete();
            try { DeviceEventEmitter.emit('recipesUpdated'); } catch (e) { /* no-op */ }
          }
        });
    } else {
      proceedLocalDelete();
    }
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
        {recipes.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <FontAwesome name="book" size={48} color="#999" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyStateTitle}>No Recipes Yet</Text>
            <Text style={styles.emptyStateText}>Start creating your first recipe to share with the community!</Text>
          </View>
        ) : (
          recipes.map((recipe, index) => (
            <TouchableOpacity key={(recipe as any).id ?? index} style={styles.recipeCard} onPress={() => openViewModal(index)}>
              <View style={styles.recipeImage} />
              <Text style={styles.recipeTitle}>{recipe.name}</Text>
              <Text style={styles.recipeDesc}>{recipe.desc}</Text>
            </TouchableOpacity>
          ))
        )}
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

            {/* Picture selector (local assets) */}
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>Picture</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <View style={{ width: 90, height: 90, borderRadius: 8, backgroundColor: '#eee', overflow: 'hidden', marginRight: 12 }}>
                  {newRecipePictureRequire ? (
                    <Image source={newRecipePictureRequire} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: '#888' }}>No image</Text>
                    </View>
                  )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {assetOptions.map((a) => (
                    <TouchableOpacity key={a.key} onPress={() => { setNewRecipePicture(a.path); setNewRecipePictureRequire(a.src); }} style={{ marginRight: 8 }}>
                      <Image source={a.src} style={{ width: 72, height: 72, borderRadius: 6, borderWidth: newRecipePicture === a.path ? 2 : 0, borderColor: '#5b8049ff' }} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 8 }}>
              <Text style={styles.label}>Visibility</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ marginRight: 8 }}>{newRecipeVisibility ? 'Public' : 'Private'}</Text>
                <Switch
                  value={newRecipeVisibility}
                  onValueChange={setNewRecipeVisibility}
                  trackColor={{ false: '#ccc', true: '#5b8049ff' }}
                  thumbColor={newRecipeVisibility ? '#fff' : '#fff'}
                />
              </View>
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
  recipeDesc: { fontSize: 14, color: '#000' },

  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

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
