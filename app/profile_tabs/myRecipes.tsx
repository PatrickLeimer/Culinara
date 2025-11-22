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
  DeviceEventEmitter,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import RecipeCard, { Recipe, DEFAULT_ASSET_MAP } from './recipeCard';

type Props = {
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
};

const MyRecipes: React.FC<Props> = ({ recipes, setRecipes }) => {
  const [addEditModalVisible, setAddEditModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form fields
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeDescription, setNewRecipeDescription] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newRecipePublic, setNewRecipePublic] = useState<boolean>(true);
  const [newRecipePicture, setNewRecipePicture] = useState<string>('');
  const [newIngredient, setNewIngredient] = useState('');

  const tagsList = ['Healthy', 'Quick', 'Low-Budget', 'Vegan', 'Breakfast', 'Lunch', 'Dinner', 'Dessert'];

  const openAddModal = () => {
    setEditingIndex(null);
    setNewRecipeName('');
    setNewRecipeDescription('');
    setSelectedIngredients([]);
    setSelectedTags([]);
    setNewRecipePublic(true);
    setNewRecipePicture('assets/images/placeholder.png');
    setAddEditModalVisible(true);
  };

  const openEditModal = (index: number) => {
    const recipe = recipes[index];
    setEditingIndex(index);
    setNewRecipeName(recipe.name);
    setNewRecipeDescription(recipe.desc || recipe.description || '');
    setSelectedIngredients(recipe.ingredients || []);
    setSelectedTags(recipe.tags || []);
    setNewRecipePublic(recipe.public ?? recipe.Public ?? true);
    setNewRecipePicture(recipe.picture || recipe.Picture || 'assets/images/placeholder.png');
    setAddEditModalVisible(true);
  };

  const toggleSelection = (item: string, selected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (selected.includes(item)) setSelected(selected.filter((i) => i !== item));
    else setSelected([...selected, item]);
  };

  const handleSaveRecipe = async () => {
    const newRecipe: Recipe = {
      name: newRecipeName,
      description: newRecipeDescription,
      ingredients: selectedIngredients,
      tags: selectedTags,
      public: newRecipePublic,
      picture: newRecipePicture,
    };

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Error', 'Could not determine current user. Please log in again.');
        return;
      }

      if (editingIndex !== null && recipes[editingIndex]?.id) {
        const existingId = recipes[editingIndex].id;
        const payloadUpdate = {
          name: newRecipe.name,
          description: newRecipe.description,
          picture: newRecipe.picture || recipes[editingIndex].picture || '',
          tags: newRecipe.tags,
          ingredients: newRecipe.ingredients,
          public: !!newRecipe.public,
        };

        const { data: updatedRow, error: updateError } = await supabase
          .from('Recipes')
          .update(payloadUpdate)
          .eq('id', existingId)
          .select('id, created_at')
          .single();

        if (updateError) {
          Alert.alert('Error', 'Could not update recipe on server.');
        } else {
          const savedRecipe = { 
            ...newRecipe, 
            id: existingId, 
            created_at: updatedRow?.created_at,
            desc: newRecipe.description,
          } as Recipe;
          const updated = [...recipes];
          updated[editingIndex] = savedRecipe;
          setRecipes(updated);
          setAddEditModalVisible(false);
          try { DeviceEventEmitter.emit('recipesUpdated'); } catch (e) {}
        }
      } else {
        const payload = {
          name: newRecipe.name,
          description: newRecipe.description,
          picture: newRecipe.picture || '',
          tags: newRecipe.tags,
          ingredients: newRecipe.ingredients,
          owner: user.id,
          public: !!newRecipe.public,
        };

        const { data: inserted, error: insertError } = await supabase
          .from('Recipes')
          .insert(payload)
          .select('id, created_at')
          .single();

        if (insertError) {
          Alert.alert('Error', 'Could not save recipe to server.');
        } else {
          const savedRecipe = { 
            ...newRecipe, 
            id: inserted?.id, 
            created_at: inserted?.created_at,
            desc: newRecipe.description,
          } as Recipe;
          setRecipes([savedRecipe, ...recipes]);
          setAddEditModalVisible(false);
          try { DeviceEventEmitter.emit('recipesUpdated'); } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Unexpected error saving recipe:', err);
      Alert.alert('Error', 'Unexpected error while saving recipe.');
    }
  };

  const handleDeleteRecipe = (index: number) => {
    Alert.alert(
      'Delete Recipe',
      'Are you sure you want to delete this recipe? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const recipe = recipes[index];
            const proceedLocalDelete = () => {
              const updated = [...recipes];
              updated.splice(index, 1);
              setRecipes(updated);
            };

            if (recipe?.id) {
              supabase
                .from('Recipes')
                .delete()
                .eq('id', recipe.id)
                .then(({ error }) => {
                  if (error) Alert.alert('Error', 'Could not delete recipe from server.');
                  else {
                    proceedLocalDelete();
                    try { DeviceEventEmitter.emit('recipesUpdated'); } catch (e) {}
                  }
                });
            } else {
              proceedLocalDelete();
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <FontAwesome name="plus" size={20} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.grid}>
        {recipes.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <FontAwesome name="book" size={48} color="#999" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyStateTitle}>No Recipes Yet</Text>
            <Text style={styles.emptyStateText}>Start creating your first recipe to share with the community!</Text>
          </View>
        ) : (
          recipes.map((recipe, index) => (
            <RecipeCard
              key={recipe.id ?? index}
              recipe={recipe}
              onEdit={() => openEditModal(index)}
              onDelete={() => handleDeleteRecipe(index)}
              assetMap={DEFAULT_ASSET_MAP}
            />
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={addEditModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentEdit}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
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
                value={newRecipeDescription}
                onChangeText={setNewRecipeDescription}
                multiline
              />

              <Text style={styles.label}>Ingredients</Text>
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

              <View style={{ marginTop: 10 }}>
                <Text style={styles.label}>Picture</Text>
                <TouchableOpacity 
                  style={styles.uploadPlaceholder}
                  onPress={() => {
                    Alert.alert('Coming Soon', 'Image upload feature is not yet implemented.');
                  }}
                >
                  <FontAwesome name="camera" size={32} color="#999" />
                  <Text style={styles.uploadText}>Upload Image</Text>
                  <Text style={styles.uploadSubtext}>Feature coming soon</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 8 }}>
                <Text style={styles.label}>Visibility</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ marginRight: 8 }}>{newRecipePublic ? 'Public' : 'Private'}</Text>
                  <Switch
                    value={newRecipePublic}
                    onValueChange={setNewRecipePublic}
                    trackColor={{ false: '#ccc', true: '#5b8049ff' }}
                    thumbColor={newRecipePublic ? '#fff' : '#fff'}
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

            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MyRecipes;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#bfcdb8ff' },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#5b8049ff',
    borderRadius: 30,
    padding: 12,
    zIndex: 2,
  },
  grid: { paddingBottom: 120, paddingHorizontal: 12 },
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
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 20,
  },
  modalContentEdit: {
    width: '100%',
    height: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  cancelButton: { backgroundColor: '#ccc', padding: 12, borderRadius: 8, flex: 1, marginRight: 8 },
  saveButton: { backgroundColor: '#5b8049ff', padding: 12, borderRadius: 8, flex: 1, marginLeft: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  input: { borderWidth: 1, color: '#333', borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 10, backgroundColor: '#fff' },
  textArea: { height: 80, textAlignVertical: 'top' },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 8, color: '#333' },
  dropdownList: { maxHeight: 100, marginVertical: 8 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, borderBottomWidth: 1, borderColor: '#eee' },
  dropdownText: { fontSize: 16, color: '#333' },
  selectedItem: { backgroundColor: '#d2e8d2' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  tagItem: { padding: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 12, margin: 4 },
  tagSelected: { backgroundColor: '#e0f7ff', borderColor: '#5b8049ff' },
  uploadPlaceholder: {
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});