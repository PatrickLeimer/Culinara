import React, { useState, useEffect } from 'react';
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
  type IngredientSelection = { name: string; quantity?: string | null; measurement_type?: string | null };
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientSelection[]>([]);
  const [selectIngredientModalVisible, setSelectIngredientModalVisible] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newRecipePublic, setNewRecipePublic] = useState<boolean>(true);
  const [newRecipePicture, setNewRecipePicture] = useState<string | null>(null);
  const [newRecipePictureUri, setNewRecipePictureUri] = useState<string | null>(null);
  const [newIngredient, setNewIngredient] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const tagsList = ['Healthy', 'Quick', 'Low-Budget', 'Vegan', 'Breakfast', 'Lunch', 'Dinner', 'Dessert'];

  // Normalize display/storage names (strip anything after " by ...")
  const cleanIngredientName = (n: string) => (n || '').replace(/\s+by\b.*$/i, '').trim();

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

  const openEditModal = (index: number) => {
    const recipe = recipes[index];
    setEditingIndex(index);
    setNewRecipeName(recipe.name);
    setNewRecipeDescription(recipe.desc || recipe.description || '');
    // Normalize ingredients into structured form
    const normalized = (recipe.ingredients || []).map((i: any) =>
      typeof i === 'string' ? { name: i, quantity: null, measurement_type: null } : { name: i.name ?? i, quantity: i.quantity ?? null, measurement_type: i.measurement_type ?? null }
    );
    setSelectedIngredients(normalized as IngredientSelection[]);
    setSelectedTags(recipe.tags || []);
    setNewRecipePublic(recipe.public ?? recipe.Public ?? true);
    setNewRecipePicture(recipe.picture || recipe.Picture || null);
    setNewRecipePictureUri(recipe.picture || recipe.Picture || null);
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

  const handleSaveRecipe = async () => {
    const newRecipe: Recipe = {
      name: newRecipeName,
      description: newRecipeDescription,
      // keep recipe.ingredients as string[] for compatibility; structured data saved separately
      ingredients: selectedIngredients.map((s) => s.name),
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
          description: newRecipe.description,
          picture: newRecipe.picture || recipes[editingIndex].picture || '',
          tags: newRecipe.tags,
          public: !!newRecipe.public,
        };

        const { data: updatedRow, error: updateError } = await supabase
          .from('Recipes')
          .update(payloadUpdate)
          .eq('id', existingId)
          .select('id, created_at')
          .single();

        if (updateError) {
          console.error('Error updating recipe:', updateError);
          Alert.alert('Error', updateError.message || 'Could not update recipe on server.');
        }
        else {
          const savedRecipe = { ...newRecipe, id: existingId, created_at: updatedRow?.created_at, desc: newRecipe.description } as Recipe;
          const updated = [...recipes];
          updated[editingIndex] = savedRecipe;
          setRecipes(updated);
          setAddEditModalVisible(false);
          try { DeviceEventEmitter.emit('recipesUpdated'); } catch (e) {}
          // Sync ingredients into Ingredients table, join rows, and add to groceries
          try {
            await upsertIngredientsForRecipe(existingId, selectedIngredients);
            await upsertRecipeIngredientsJoin(existingId, selectedIngredients);
            const { data: { user: curUser } } = await supabase.auth.getUser();
            if (curUser) await addIngredientsToGroceries(curUser.id, selectedIngredients);
          } catch (err) {
            console.error('Error syncing ingredients/groceries after update:', err);
          }
        }
      } else {
        const payload = {
          name: newRecipe.name,
          description: newRecipe.description,
          picture: newRecipe.picture || '',
          tags: newRecipe.tags,
          owner: user.id,
          public: !!newRecipe.public,
        };

        const { data: inserted, error: insertError } = await supabase
          .from('Recipes')
          .insert(payload)
          .select('id, created_at')
          .single();

        if (insertError) {
          console.error('Error inserting recipe:', insertError);
          Alert.alert('Error', insertError.message || 'Could not save recipe to server.');
        }
        else {
          const savedRecipe = { ...newRecipe, id: inserted?.id, created_at: inserted?.created_at, desc: newRecipe.description } as Recipe;
          setRecipes([savedRecipe, ...recipes]);
          setAddEditModalVisible(false);
          try { DeviceEventEmitter.emit('recipesUpdated'); } catch (e) {}
          // Sync ingredients into Ingredients table, join rows, and add to groceries
          try {
            if (inserted?.id) {
              await upsertIngredientsForRecipe(inserted.id, selectedIngredients);
              await upsertRecipeIngredientsJoin(inserted.id, selectedIngredients);
              const { data: { user: curUser } } = await supabase.auth.getUser();
              if (curUser) await addIngredientsToGroceries(curUser.id, selectedIngredients);
            }
          } catch (err) {
            console.error('Error syncing ingredients/groceries after insert:', err);
          }
        }
      }
    } catch (err) {
      console.error('Unexpected error saving recipe:', err);
      Alert.alert('Error', 'Unexpected error while saving recipe.');
    }
  };

  // Persist ingredient rows for a recipe into a structured table (disabled for current schema)
  // Current DB schema's Ingredients table is canonical and does not have recipe_id/quantity/unit columns.
  // We therefore skip writing to Ingredients and rely solely on Recipe_Ingredients for per-recipe quantities.
  const upsertIngredientsForRecipe = async (_recipeId: string, _ingredientItems: IngredientSelection[]) => {
    return; // no-op with current schema
  };
  // Persist join rows into Recipe_Ingredients: link recipe_id to canonical ingredient_id with qty/unit
  const upsertRecipeIngredientsJoin = async (recipeId: string, ingredientItems: IngredientSelection[]) => {
    if (!recipeId) return;
    await supabase.from('Recipe_Ingredients').delete().eq('recipe_id', recipeId);
    if (!ingredientItems || ingredientItems.length === 0) return;

    // Build cleaned selected names
    const cleanedSelected = Array.from(new Set(ingredientItems.map(i => cleanIngredientName(i.name)))).filter(Boolean);

    // Fetch all canonical names once, then map by cleaned form to be resilient to " by ..." suffixes
    const { data: canonical = [], error: fetchErr } = await supabase
      .from('Ingredients')
      .select('id,name');
    if (fetchErr) throw fetchErr;
    const idByClean = new Map<string, number | string>();
    (canonical || []).forEach((row: any) => {
      const c = cleanIngredientName(String(row.name));
      if (c && !idByClean.has(c)) idByClean.set(c, row.id);
    });

    const joinRows = ingredientItems
      .map(it => {
        const ingId = idByClean.get(cleanIngredientName(it.name));
        if (!ingId) return null;
        return {
          recipe_id: recipeId,
          ingredient_id: ingId,
          quantity: it.quantity ?? null,
          unit: it.measurement_type ?? null,
        };
      })
      .filter(Boolean) as Array<{ recipe_id: string; ingredient_id: any; quantity: string | null; unit: string | null }>;

    if (joinRows.length > 0) {
      const { error } = await supabase.from('Recipe_Ingredients').insert(joinRows);
      if (error) throw error;
    }
  };

  // Add recipe ingredients to the user's groceries list, only inserting missing names
  const addIngredientsToGroceries = async (userId: string, ingredientItems: IngredientSelection[]) => {
    if (!userId || !ingredientItems || ingredientItems.length === 0) return;
    try {
      const names = Array.from(new Set(ingredientItems.map((i) => cleanIngredientName(i.name)))).filter(Boolean);
      const { data: existing = [], error: fetchErr } = await supabase.from('groceries').select('name').eq('user_id', userId).in('name', names);
      if (fetchErr) console.warn('Could not fetch existing groceries', fetchErr);
      const existingNames = new Set((existing ?? []).map((r: any) => r.name));
      const toInsert = names.filter((n) => !existingNames.has(n)).map((n) => ({ user_id: userId, name: n, amount: null, in_pantry: false }));
      if (toInsert.length === 0) return;
      const { error } = await supabase.from('groceries').insert(toInsert);
      if (error) throw error;
    } catch (err) {
      console.error('Error adding ingredients to groceries:', err);
      throw err;
    }
  };

  const loadAvailableIngredients = async () => {
    try {
      setLoadingAvailable(true);
      // Try both capitalized and lowercase table names to be resilient to schema naming
      let data: any = null;
      let error: any = null;
      try {
        const res = await supabase.from('Ingredients').select('name');
        // Debug: log the raw response so we can diagnose schema/RLS issues
        // eslint-disable-next-line no-console
        console.log('loadAvailableIngredients: Ingredients res=', res);
        data = res.data; error = res.error;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('loadAvailableIngredients: Ingredients threw', e);
        data = null; error = e;
      }
      if ((error || !data || data.length === 0)) {
        // fallback: try again with the canonical table name to handle schema cache hiccups
        try {
          const res2 = await supabase.from('Ingredients').select('name');
          // Debug: log fallback attempt
          // eslint-disable-next-line no-console
          console.log('loadAvailableIngredients: fallback Ingredients res=', res2);
          data = res2.data; error = res2.error;
        } catch (e2) {
          // eslint-disable-next-line no-console
          console.log('loadAvailableIngredients: fallback Ingredients threw', e2);
          data = null; error = e2;
        }
      }
      if (error) {
        console.warn('Could not load available ingredients', error);
        setAvailableIngredients([]);
      } else {
        // Map to names and strip any suffix starting with " by ..." (case-insensitive)
        const namesRaw = (data ?? []).map((r: any) => String(r.name));
        const namesClean = namesRaw.map((n: string) => cleanIngredientName(n)).filter(Boolean);
        const uniq: string[] = Array.from(new Set(namesClean));
        setAvailableIngredients(uniq.sort());
      }
    } catch (err) {
      console.warn('Unexpected error loading available ingredients', err);
      setAvailableIngredients([]);
    } finally {
      setLoadingAvailable(false);
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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.modalTitle}>{editingIndex !== null ? 'Edit Recipe' : 'Create New Recipe'}</Text>

              <TextInput style={styles.input} placeholder="Recipe Name" value={newRecipeName} onChangeText={setNewRecipeName} />
              <TextInput style={[styles.input, styles.textArea]} placeholder="Description" value={newRecipeDescription} onChangeText={setNewRecipeDescription} multiline />

              <Text style={styles.label}>Ingredients</Text>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Add new ingredient"
                  placeholderTextColor={'#999'}
                  value={newIngredient}
                  onChangeText={setNewIngredient}
                />
                <TouchableOpacity
                  style={[styles.saveButton, { marginLeft: 8, paddingHorizontal: 12 }]}
                  onPress={() => {
                    const name = newIngredient.trim();
                    if (name && !selectedIngredients.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
                      setSelectedIngredients([...selectedIngredients, { name, quantity: null, measurement_type: null }]);
                      setNewIngredient('');
                    }
                  }}
                >
                  <Text style={styles.buttonText}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { marginLeft: 8, paddingHorizontal: 12, backgroundColor: '#6aa16a' }]}
                  onPress={() => { setSelectIngredientModalVisible(true); loadAvailableIngredients(); }}
                >
                  <Text style={styles.buttonText}>Search</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.dropdownList}>
                {selectedIngredients.map((item, idx) => (
                  <View key={`${item.name}-${idx}`} style={[styles.dropdownItem, styles.selectedItem, { alignItems: 'center' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dropdownText}>{item.name}</Text>
                      <View style={{ flexDirection: 'row', marginTop: 6, gap: 8 }}>
                        <TextInput
                          placeholder="Qty"
                          value={item.quantity ?? ''}
                          onChangeText={(t) => {
                            const copy = [...selectedIngredients];
                            copy[idx] = { ...copy[idx], quantity: t };
                            setSelectedIngredients(copy);
                          }}
                          style={[styles.input, { flex: 1, marginBottom: 0, height: 36 }]}
                        />
                        <TextInput
                          placeholder="Measurement"
                          value={item.measurement_type ?? ''}
                          onChangeText={(t) => {
                            const copy = [...selectedIngredients];
                            copy[idx] = { ...copy[idx], measurement_type: t };
                            setSelectedIngredients(copy);
                          }}
                          style={[styles.input, { flex: 1, marginBottom: 0, height: 36 }]}
                        />
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => { const copy = [...selectedIngredients]; copy.splice(idx, 1); setSelectedIngredients(copy); }}>
                      <Text style={{ color: 'red', marginLeft: 8 }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {/* Select ingredient modal */}
              <Modal visible={selectIngredientModalVisible} transparent animationType="fade">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                  <View style={{ width: '90%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 10, padding: 12 }}>
                    <Text style={{ fontWeight: '700', marginBottom: 8 }}>Search</Text>
                    <TextInput
                      placeholder="Search ingredients"
                      value={ingredientSearch}
                      onChangeText={setIngredientSearch}
                      style={[styles.input, { marginBottom: 8 }]}
                    />
                    <ScrollView style={{ maxHeight: 320 }}>
                      {loadingAvailable ? (
                        <Text>Loading...</Text>
                      ) : (
                        availableIngredients
                          .filter((n) => ingredientSearch.trim() === '' || n.toLowerCase().includes(ingredientSearch.trim().toLowerCase()))
                          .map((name) => (
                          <TouchableOpacity
                            key={name}
                            style={{ padding: 10, borderBottomWidth: 1, borderColor: '#eee' }}
                            onPress={() => {
                              if (!selectedIngredients.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
                                setSelectedIngredients([...selectedIngredients, { name, quantity: null, measurement_type: null }]);
                              }
                              // Close the select modal after choosing an ingredient
                              setSelectIngredientModalVisible(false);
                            }}
                          >
                            <Text>{name}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                      <TouchableOpacity style={[styles.cancelButton, { marginRight: 8 }]} onPress={() => setSelectIngredientModalVisible(false)}>
                        <Text style={styles.buttonText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>

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
  modalContentEdit: { width: '100%', height: '90%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalScrollContent: { padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  cancelButton: { backgroundColor: '#ccc', padding: 12, borderRadius: 8, flex: 1, marginRight: 8 },
  saveButton: { backgroundColor: '#5b8049ff', padding: 12, borderRadius: 8, flex: 1, marginLeft: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  input: { borderWidth: 1, color: '#333', borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 10, backgroundColor: '#fff' },
  textArea: { height: 80, textAlignVertical: 'top' },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 8, color: '#333', marginBottom: 8 },
  dropdownList: { maxHeight: 100, marginVertical: 8 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, borderBottomWidth: 1, borderColor: '#eee' },
  dropdownText: { fontSize: 16, color: '#333' },
  selectedItem: { backgroundColor: '#d2e8d2' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  tagItem: { padding: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 12, margin: 4 },
  tagSelected: { backgroundColor: '#e0f7ff', borderColor: '#5b8049ff' },
  uploadPlaceholder: { backgroundColor: '#f5f5f5', borderWidth: 2, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 12, padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  uploadPlaceholderSmall: { padding: 20 },
  uploadText: { fontSize: 16, fontWeight: '600', color: '#666', marginTop: 12 },
  uploadSubtext: { fontSize: 12, color: '#999', marginTop: 4, textAlign: 'center' },
  imagePreviewContainer: { position: 'relative', marginTop: 8, marginBottom: 12 },
  imagePreview: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#E0E0E0' },
  removeImageButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 12, padding: 4 },
});
