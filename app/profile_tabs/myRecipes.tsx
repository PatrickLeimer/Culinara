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
  Image,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import RecipeCard, { Recipe, DEFAULT_ASSET_MAP } from './recipeCard';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

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
  const [newRecipePicture, setNewRecipePicture] = useState<string | null>(null);
  const [newRecipePictureUri, setNewRecipePictureUri] = useState<string | null>(null);
  const [newIngredient, setNewIngredient] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const tagsList = ['Healthy', 'Quick', 'Low-Budget', 'Vegan', 'Breakfast', 'Lunch', 'Dinner', 'Dessert'];

  const openAddModal = () => {
    setEditingIndex(null);
    setNewRecipeName('');
    setNewRecipeDescription('');
    setSelectedIngredients([]);
    setSelectedTags([]);
    setNewRecipePublic(true);
    setNewRecipePicture(null);
    setNewRecipePictureUri(null);
    setAddEditModalVisible(true);
  };

  const openEditModal = async (index: number) => {
    const recipe = recipes[index];
    setEditingIndex(index);
    setNewRecipeName(recipe.name);
    setNewRecipeDescription(recipe.desc || recipe.description || '');
    setSelectedTags(recipe.tags || []);
    setNewRecipePublic(recipe.public ?? recipe.Public ?? true);
    setNewRecipePicture(recipe.picture || recipe.Picture || null);
    setNewRecipePictureUri(recipe.picture || recipe.Picture || null);
    
    // Fetch ingredients from Recipe_Ingredients table
    if (recipe.id) {
      try {
        const { data: recipeIngredients, error } = await supabase
          .from('Recipe_Ingredients')
          .select(`
            Ingredients (
              name
            )
          `)
          .eq('recipe_id', recipe.id);

        if (!error && recipeIngredients) {
          const ingredientNames = recipeIngredients
            .map((ri: any) => ri.Ingredients?.name)
            .filter((name: string | undefined) => name !== undefined && name !== null);
          setSelectedIngredients(ingredientNames);
        } else {
          setSelectedIngredients(recipe.ingredients || []);
        }
      } catch (err) {
        console.error('Error fetching recipe ingredients:', err);
        setSelectedIngredients(recipe.ingredients || []);
      }
    } else {
      setSelectedIngredients(recipe.ingredients || []);
    }
    
    setAddEditModalVisible(true);
  };

  const toggleSelection = (item: string, selected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (selected.includes(item)) setSelected(selected.filter((i) => i !== item));
    else setSelected([...selected, item]);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        const imageUri = result.assets[0].uri;

        // Upload to Supabase
        const uploadedUrl = await uploadImageToSupabase(imageUri);

        if (uploadedUrl) {
          // Delete old image if changing
          if (newRecipePicture) await deleteImageFromSupabase(newRecipePicture);

          setNewRecipePicture(uploadedUrl);
          setNewRecipePictureUri(imageUri);
          Alert.alert('Success', 'Image uploaded successfully!');
        }
        setUploadingImage(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
      setUploadingImage(false);
    }
  };

  const uploadImageToSupabase = async (uri: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to upload images');
        return null;
      }

      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const u8arr = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      const { error } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, u8arr, { contentType: `image/${fileExt}` });

      if (error) {
        console.error('Upload error:', error);
        Alert.alert('Upload Failed', error.message);
        return null;
      }

      const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (err) {
      console.error('Error uploading to Supabase:', err);
      Alert.alert('Error', 'Failed to upload image to server');
      return null;
    }
  };

  const deleteImageFromSupabase = async (url: string) => {
    if (!url) return;

    try {
      const filePath = url.split('/').slice(-2).join('/'); // userId/timestamp.jpg format
      const { error } = await supabase.storage.from('recipe-images').remove([filePath]);

      if (error) console.log('Error deleting image:', error.message);
      else console.log('Image deleted successfully');

      setNewRecipePicture(null);
      setNewRecipePictureUri(null);
    } catch (err) {
      console.log('Unexpected error deleting image:', err);
    }
  };

  const handleDeleteImage = async () => {
    if (!newRecipePicture) return; 

    try {
      const filePath = newRecipePicture; // use full path from Supabase
      const { error } = await supabase.storage
        .from('recipe-images')
        .remove([filePath]);

      if (error) {
        console.log('Error deleting image from Supabase:', error.message);
        Alert.alert('Error', 'Failed to delete image from server.');
        return;
      }

      console.log('Image deleted successfully');

      // Clear modal state
      setNewRecipePicture('');
      setNewRecipePictureUri(null);

      // If editing existing recipe, also update it in local state
      if (editingIndex !== null) {
        const updatedRecipes = [...recipes];
        updatedRecipes[editingIndex] = {
          ...updatedRecipes[editingIndex],
          picture: null,
        };
        setRecipes(updatedRecipes);
      }

    } catch (err) {
      console.log('Unexpected error deleting image:', err);
      Alert.alert('Error', 'Unexpected error deleting image.');
    }
  };

  // Helper function to find or create an ingredient
  const findOrCreateIngredient = async (ingredientName: string, userId: string): Promise<number | null> => {
    try {
      // First, try to find existing ingredient (case-insensitive, user-specific or global)
      const { data: existing, error: findError } = await supabase
        .from('Ingredients')
        .select('id')
        .ilike('name', ingredientName.trim())
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .limit(1)
        .single();

      if (existing && !findError) {
        return existing.id;
      }

      // If not found, create a new ingredient
      const { data: newIngredient, error: createError } = await supabase
        .from('Ingredients')
        .insert({
          name: ingredientName.trim(),
          user_id: userId,
        })
        .select('id')
        .single();

      if (createError || !newIngredient) {
        console.error('Error creating ingredient:', createError);
        return null;
      }

      return newIngredient.id;
    } catch (err) {
      console.error('Unexpected error in findOrCreateIngredient:', err);
      return null;
    }
  };

  // Helper function to save recipe ingredients
  const saveRecipeIngredients = async (recipeId: string, ingredientNames: string[], userId: string) => {
    try {
      // Delete existing recipe ingredients
      await supabase
        .from('Recipe_Ingredients')
        .delete()
        .eq('recipe_id', recipeId);

      if (ingredientNames.length === 0) return;

      // Find or create each ingredient and create Recipe_Ingredients entries
      const recipeIngredientPromises = ingredientNames.map(async (ingredientName) => {
        const ingredientId = await findOrCreateIngredient(ingredientName, userId);
        if (ingredientId) {
          return {
            recipe_id: recipeId,
            ingredient_id: ingredientId,
            quantity: '', // You can add quantity/unit fields to the UI later
            unit: '',
          };
        }
        return null;
      });

      const recipeIngredients = (await Promise.all(recipeIngredientPromises)).filter(
        (ri) => ri !== null
      ) as Array<{ recipe_id: string; ingredient_id: number; quantity: string; unit: string }>;

      if (recipeIngredients.length > 0) {
        const { error } = await supabase
          .from('Recipe_Ingredients')
          .insert(recipeIngredients);

        if (error) {
          console.error('Error saving recipe ingredients:', error);
        }
      }
    } catch (err) {
      console.error('Unexpected error saving recipe ingredients:', err);
    }
  };

  const handleSaveRecipe = async () => {
    // Validate required fields
    if (!newRecipeName.trim()) {
      Alert.alert('Validation Error', 'Please enter a recipe name.');
      return;
    }

    const newRecipe: Recipe = {
      name: newRecipeName.trim(),
      description: newRecipeDescription.trim(),
      ingredients: selectedIngredients,
      tags: selectedTags,
      public: newRecipePublic,
      picture: newRecipePicture || null,
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
          description: newRecipe.description || null,
          picture: newRecipe.picture || recipes[editingIndex].picture || null,
          tags: newRecipe.tags || [],
          public: !!newRecipe.public,
        };

        const { data: updatedRow, error: updateError } = await supabase
          .from('Recipes')
          .update(payloadUpdate)
          .eq('id', existingId)
          .select('id, created_at')
          .single();

        if (updateError) {
          console.error('Update error:', updateError);
          Alert.alert('Error', `Could not update recipe: ${updateError.message || 'Unknown error'}`);
        } else {
          // Save ingredients
          await saveRecipeIngredients(existingId, selectedIngredients, user.id);

          const savedRecipe = { ...newRecipe, id: existingId, created_at: updatedRow?.created_at, desc: newRecipe.description } as Recipe;
          const updated = [...recipes];
          updated[editingIndex] = savedRecipe;
          setRecipes(updated);
          setAddEditModalVisible(false);
          try { DeviceEventEmitter.emit('recipesUpdated'); } catch (e) {}
        }
      } else {
        const payload = {
          name: newRecipe.name,
          description: newRecipe.description || null,
          picture: newRecipe.picture || null,
          tags: newRecipe.tags || [],
          owner: user.id,
          public: !!newRecipe.public,
        };

        const { data: inserted, error: insertError } = await supabase
          .from('Recipes')
          .insert(payload)
          .select('id, created_at')
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          Alert.alert('Error', `Could not save recipe: ${insertError.message || 'Unknown error'}`);
        } else {
          // Save ingredients
          if (inserted?.id) {
            await saveRecipeIngredients(inserted.id, selectedIngredients, user.id);
          }

          const savedRecipe = { ...newRecipe, id: inserted?.id, created_at: inserted?.created_at, desc: newRecipe.description } as Recipe;
          setRecipes([savedRecipe, ...recipes]);
          setAddEditModalVisible(false);
          try { DeviceEventEmitter.emit('recipesUpdated'); } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Unexpected error saving recipe:', err);
      Alert.alert('Error', `Unexpected error while saving recipe: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

            // Notify other screens (like ExploreScreen) to refetch
            DeviceEventEmitter.emit('recipesUpdated');
          };

          if (recipe?.id) {
            supabase
              .from('Recipes')
              .delete()
              .eq('id', recipe.id)
              .then(({ error }) => {
                if (error) Alert.alert('Error', 'Could not delete recipe from server.');
                else proceedLocalDelete();
              });
          } else proceedLocalDelete();
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

      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: 110 }]}>
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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.modalTitle}>{editingIndex !== null ? 'Edit Recipe' : 'Create New Recipe'}</Text>

              <TextInput style={styles.input} placeholder="Recipe Name" value={newRecipeName} onChangeText={setNewRecipeName} />
              <TextInput style={[styles.input, styles.textArea]} placeholder="Description" value={newRecipeDescription} onChangeText={setNewRecipeDescription} multiline />

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
                  <TouchableOpacity key={item} style={[styles.dropdownItem, styles.selectedItem]} onPress={() => toggleSelection(item, selectedIngredients, setSelectedIngredients)}>
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
                    style={[styles.tagItem, selectedTags.includes(item) && styles.tagSelected]}
                    onPress={() => toggleSelection(item, selectedTags, setSelectedTags)}
                  >
                    <Text>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ marginTop: 10 }}>
                <Text style={styles.label}>Picture</Text>
                {(newRecipePictureUri || newRecipePicture) && (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={
                        newRecipePictureUri
                          ? { uri: newRecipePictureUri }
                          : newRecipePicture && newRecipePicture.startsWith('http')
                          ? { uri: newRecipePicture }
                          : newRecipePicture && DEFAULT_ASSET_MAP[newRecipePicture]
                          ? DEFAULT_ASSET_MAP[newRecipePicture]
                          : require('../../assets/images/placeholder.png')
                      }
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity style={styles.removeImageButton} onPress={handleDeleteImage}>
                      <FontAwesome name="times-circle" size={24} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.uploadPlaceholder, (newRecipePictureUri || newRecipePicture) && styles.uploadPlaceholderSmall]}
                  onPress={pickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <>
                      <FontAwesome name="spinner" size={32} color="#999" />
                      <Text style={styles.uploadText}>Uploading...</Text>
                    </>
                  ) : (
                    <>
                      <FontAwesome name="camera" size={32} color="#999" />
                      <Text style={styles.uploadText}>{(newRecipePictureUri || newRecipePicture) ? 'Change Image' : 'Upload Image'}</Text>
                      <Text style={styles.uploadSubtext}>{(newRecipePictureUri || newRecipePicture) ? 'Tap to select a different image' : 'Tap to select from gallery'}</Text>
                    </>
                  )}
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
  addButton: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#5b8049ff', borderRadius: 30, padding: 12, zIndex: 2 },
  grid: { paddingBottom: 120, paddingHorizontal: 12 },
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyStateTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: '#666', textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 20 },
  modalContentEdit: { 
    width: '100%', 
    height: '90%', 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalScrollContent: { padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 24, fontWeight: '600', marginBottom: 20, color: '#000', letterSpacing: 0.2 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  cancelButton: { 
    backgroundColor: '#f5f5f5', 
    padding: 14, 
    borderRadius: 10, 
    flex: 1, 
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: { 
    backgroundColor: '#568A60', 
    padding: 14, 
    borderRadius: 10, 
    flex: 1, 
    marginLeft: 8,
    shadowColor: '#568A60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '600', 
    textAlign: 'center',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  input: { 
    borderWidth: 1, 
    color: '#000', 
    borderColor: '#568A60', 
    padding: 12, 
    borderRadius: 10, 
    marginBottom: 16, 
    backgroundColor: '#fff',
    fontSize: 16,
    height: 50,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginTop: 12, 
    marginBottom: 8,
    color: '#000',
    letterSpacing: 0.2,
  },
  dropdownList: { maxHeight: 100, marginVertical: 8 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, borderBottomWidth: 1, borderColor: '#eee' },
  dropdownText: { fontSize: 16, color: '#333' },
  selectedItem: { backgroundColor: '#d2e8d2' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  tagItem: { 
    padding: 10, 
    borderWidth: 1.5, 
    borderColor: '#ddd', 
    borderRadius: 12, 
    margin: 4,
    backgroundColor: '#fff',
  },
  tagSelected: { 
    backgroundColor: '#E6F4EA', 
    borderColor: '#568A60',
    shadowColor: '#568A60',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  uploadPlaceholder: { backgroundColor: '#f5f5f5', borderWidth: 2, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 12, padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  uploadPlaceholderSmall: { padding: 20 },
  uploadText: { fontSize: 16, fontWeight: '600', color: '#666', marginTop: 12 },
  uploadSubtext: { fontSize: 12, color: '#999', marginTop: 4, textAlign: 'center' },
  imagePreviewContainer: { position: 'relative', marginTop: 8, marginBottom: 12 },
  imagePreview: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#E0E0E0' },
  removeImageButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 12, padding: 4 },
});
