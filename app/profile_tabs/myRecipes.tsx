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
import RecipeCard from './recipeCard';

interface Recipe {
  id?: string;
  name: string;
  desc: string;
  ingredients: string[];
  tags: string[];
  visibility?: boolean;
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
  const [newIngredient, setNewIngredient] = useState('');

  const tagsList = ['Healthy', 'Quick', 'Low-Budget', 'Vegan', 'Breakfast', 'Lunch', 'Dinner', 'Dessert'];

  const assetOptions = [
    { key: 'green_smoothie', label: 'Green Smoothie', src: require('../../assets/images/green_smoothie.png'), path: 'assets/images/green_smoothie.png' },
    { key: 'chickpea_curry', label: 'Chickpea Curry', src: require('../../assets/images/chickpea_curry.png'), path: 'assets/images/chickpea_curry.png' },
    { key: 'avocado_toast', label: 'Avocado Toast', src: require('../../assets/images/avocado_toast.png'), path: 'assets/images/avocado_toast.png' },
    { key: 'lemon_chicken', label: 'Lemon Chicken', src: require('../../assets/images/lemon_chicken.png'), path: 'assets/images/lemon_chicken.png' },
    { key: 'mug_cake', label: 'Mug Cake', src: require('../../assets/images/mug_cake.png'), path: 'assets/images/mug_cake.png' },
  ];

  // Asset map for RecipeCard component
  const assetMap: Record<string, any> = {
    'assets/images/green_smoothie.png': require('../../assets/images/green_smoothie.png'),
    'assets/images/chickpea_curry.png': require('../../assets/images/chickpea_curry.png'),
    'assets/images/avocado_toast.png': require('../../assets/images/avocado_toast.png'),
    'assets/images/lemon_chicken.png': require('../../assets/images/lemon_chicken.png'),
    'assets/images/mug_cake.png': require('../../assets/images/mug_cake.png'),
  };

  const openAddModal = () => {
    setEditingIndex(null);
    setNewRecipeName('');
    setNewRecipeDesc('');
    setSelectedIngredients([]);
    setSelectedTags([]);
    setNewRecipeVisibility(true);
    setNewRecipePicture('assets/images/placeholder.png');
    setNewRecipePictureRequire(require('../../assets/images/placeholder.png'));
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
    if ((recipe as any).Picture) {
      setNewRecipePicture((recipe as any).Picture);
      const mapped = assetMap[(recipe as any).Picture];
      setNewRecipePictureRequire(mapped || require('../../assets/images/placeholder.png'));
    } else {
      setNewRecipePicture('assets/images/placeholder.png');
      setNewRecipePictureRequire(require('../../assets/images/placeholder.png'));
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Error', 'Could not determine current user. Please log in again.');
        return;
      }

      if (editingIndex !== null && (recipes[editingIndex] as any)?.id) {
        const existingId = (recipes[editingIndex] as any).id;
        const payloadUpdate = {
          Name: newRecipe.name,
          Description: newRecipe.desc,
          Recipe_Ingredients: newRecipe.ingredients,
          Picture: newRecipePicture || (recipes[editingIndex] as any).Picture || '',
          Tags: newRecipe.tags,
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
          try { DeviceEventEmitter.emit('recipesUpdated'); } catch (e) {}
        }
      } else {
        const payload = {
          Name: newRecipe.name,
          Description: newRecipe.desc,
          Recipe_Ingredients: newRecipe.ingredients,
          Picture: newRecipePicture || '',
          Tags: newRecipe.tags,
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
          try { DeviceEventEmitter.emit('recipesUpdated'); } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Unexpected error saving recipe:', err);
      Alert.alert('Error', 'Unexpected error while saving recipe.');
    }
  };

  const handleDeleteRecipe = (index: number) => {
    // Show confirmation dialog
    Alert.alert(
      'Delete Recipe',
      'Are you sure you want to delete this recipe? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const recipe = recipes[index] as any;
            const proceedLocalDelete = () => {
              const updated = [...recipes];
              updated.splice(index, 1);
              setRecipes(updated);
              setViewModalVisible(false);
            };

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

  const toggleSelection = (item: string, selected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (selected.includes(item)) setSelected(selected.filter((i) => i !== item));
    else setSelected([...selected, item]);
  };

  // Get image source for view modal
  const getRecipeImage = (recipe: Recipe) => {
    if (recipe.Picture && assetMap[recipe.Picture]) {
      return assetMap[recipe.Picture];
    }
    return require('../../assets/images/placeholder.png');
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
            <RecipeCard
              key={(recipe as any).id ?? index}
              recipe={recipe}
              onPress={() => openViewModal(index)}
              showOverlayButtons={false}
              assetMap={assetMap}
            />
          ))
        )}
      </ScrollView>

      {/* View Recipe Modal - Now matches explore.tsx style */}
      <Modal visible={viewModalVisible} transparent animationType="slide">
        {viewingIndex !== null && (
          <View style={styles.modalOverlay}>
            <View style={styles.viewModalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Recipe Image */}
                <Image 
                  source={getRecipeImage(recipes[viewingIndex])} 
                  style={styles.viewModalImage}
                  resizeMode="cover"
                />

                {/* Recipe Title */}
                <Text style={styles.viewModalTitle}>{recipes[viewingIndex].name}</Text>

                {/* Recipe Description */}
                <Text style={styles.viewModalDesc}>{recipes[viewingIndex].desc}</Text>

                {/* Tags */}
                <View style={styles.tagRow}>
                  {recipes[viewingIndex].tags.map((tag: string) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                {/* Ingredients */}
                <Text style={styles.ingredientsLabel}>Ingredients</Text>
                {recipes[viewingIndex].ingredients.map((ing: string, i: number) => (
                  <Text key={i} style={styles.ingredientItem}>• {ing}</Text>
                ))}

                {/* Action Buttons - Close, Edit, Delete */}
                <View style={styles.viewModalButtons}>
                  <TouchableOpacity 
                    style={styles.viewModalCloseButton} 
                    onPress={() => setViewModalVisible(false)}
                  >
                    <Text style={styles.viewModalButtonText}>Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.viewModalEditButton} 
                    onPress={() => {
                      setViewModalVisible(false);
                      openEditModal(viewingIndex);
                    }}
                  >
                    <Text style={styles.viewModalButtonText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.viewModalDeleteButton} 
                    onPress={() => handleDeleteRecipe(viewingIndex)}
                  >
                    <Text style={styles.viewModalButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>

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
                placeholderTextColor={'#999'}
                value={newRecipeName}
                onChangeText={setNewRecipeName}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                placeholderTextColor={'#999'}
                value={newRecipeDesc}
                onChangeText={setNewRecipeDesc}
                multiline
              />

              <Text style={styles.label}>Ingredients</Text>
              <View style={{ flexDirection: 'row', marginBottom: 8, marginTop: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Enter an ingredient"
                  placeholderTextColor={'#999'}
                  value={newIngredient}
                  onChangeText={setNewIngredient}
                  onSubmitEditing={() => {
                    if (newIngredient.trim()) {
                      setSelectedIngredients((prev) => [...prev, newIngredient.trim()]);
                      setNewIngredient('');
                    }
                  }}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.saveButton, { marginLeft: 8, paddingHorizontal: 12 }]}
                  onPress={() => {
                    if (newIngredient.trim()) {
                      setSelectedIngredients((prev) => [...prev, newIngredient.trim()]);
                      setNewIngredient('');
                    }
                  }}
                >
                  <Text style={styles.buttonText}>Add</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 12 }}>
                {selectedIngredients.length > 0 ? (
                  selectedIngredients.map((item, index) => (
                    <View
                      key={index}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        backgroundColor: '#eaf2e9',
                        padding: 10,
                        borderRadius: 8,
                        marginBottom: 6,
                      }}
                    >
                      <Text style={{ color: '#333' }}>• {item}</Text>
                      <TouchableOpacity onPress={() => setSelectedIngredients(selectedIngredients.filter((i) => i !== item))}>
                        <FontAwesome name="trash" size={16} color="#e74c3c" />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={{ color: '#666', fontStyle: 'italic' }}>No ingredients added yet.</Text>
                )}
              </View>


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
                    // TODO: Implement image upload functionality
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

  // View Modal Styles (matching explore.tsx)
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 20,
  },
  viewModalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 16,
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
  viewModalImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#E0E0E0',
  },
  viewModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#000',
  },
  viewModalDesc: {
    fontSize: 14,
    color: '#444',
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginTop: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#2f5d3a',
  },
  ingredientsLabel: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  ingredientItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  viewModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  viewModalCloseButton: {
    flex: 1,
    backgroundColor: '#ccc',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewModalEditButton: {
    flex: 1,
    backgroundColor: '#5b8049ff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewModalDeleteButton: {
    flex: 1,
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewModalButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Add/Edit Modal styles
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  cancelButton: { backgroundColor: '#ccc', padding: 12, borderRadius: 8, flex: 1, marginRight: 8 },
  saveButton: { backgroundColor: '#5b8049ff', padding: 12, borderRadius: 8, flex: 1, marginLeft: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },

  input: { borderWidth: 1, color: '#cbc5c5ff', borderColor: '#787171ff', padding: 10, borderRadius: 8, marginBottom: 10, backgroundColor: '#fff' },
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