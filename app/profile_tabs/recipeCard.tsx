import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  Modal, 
  ScrollView 
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

// ============================================================================
// TYPES
// ============================================================================

export interface Recipe {
  id?: string;
  name: string;
  desc?: string;
  description?: string;
  ingredients?: string[];
  tags?: string[];
  picture?: string | null;
  Picture?: string | null;
  image?: any;
  public?: boolean;
  Public?: boolean;
  created_at?: string;
  user_id?: string;
}

interface RecipeCardProps {
  recipe: Recipe;
  onPress?: () => void;
  showOverlayButtons?: boolean;
  onPlusPress?: () => void;
  onHeartPress?: () => void;
  isLiked?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  assetMap?: Record<string, any>;
  showLikeButtonInModal?: boolean;
}

// ============================================================================
// ASSET MAP - Centralized image mapping
// ============================================================================

export const DEFAULT_ASSET_MAP: Record<string, any> = {
  'assets/images/green_smoothie.png': require('../../assets/images/green_smoothie.png'),
  'assets/images/chickpea_curry.png': require('../../assets/images/chickpea_curry.png'),
  'assets/images/avocado_toast.png': require('../../assets/images/avocado_toast.png'),
  'assets/images/lemon_chicken.png': require('../../assets/images/lemon_chicken.png'),
  'assets/images/mug_cake.png': require('../../assets/images/mug_cake.png'),
};

// ============================================================================
// MOCK RECIPES - Centralized fallback data
// ============================================================================

export const MOCK_RECIPES: Recipe[] = [
  {
    id: 'mock-1',
    name: 'Green Goddess Smoothie',
    desc: 'A refreshing blender smoothie packed with spinach and banana.',
    ingredients: ['Spinach', 'Banana', 'Almond milk', 'Chia seeds', 'Honey'],
    tags: ['Healthy', 'Quick', 'Breakfast'],
    image: require('../../assets/images/green_smoothie.png'),
  },
  {
    id: 'mock-2',
    name: '15-min Chickpea Curry',
    desc: 'A spicy, budget-friendly vegan curry served with rice.',
    ingredients: ['Chickpeas', 'Tomato', 'Onion', 'Curry powder', 'Garlic'],
    tags: ['Vegan', 'Low-Budget', 'Quick', 'Dinner'],
    image: require('../../assets/images/chickpea_curry.png'),
  },
  {
    id: 'mock-3',
    name: 'Avocado Toast Deluxe',
    desc: 'Creamy avocado on toasted sourdough with chili flakes.',
    ingredients: ['Sourdough', 'Avocado', 'Lemon', 'Chili flakes', 'Olive oil'],
    tags: ['Quick', 'Breakfast', 'Healthy'],
    image: require('../../assets/images/avocado_toast.png'),
  },
  {
    id: 'mock-4',
    name: 'One-Pan Lemon Chicken',
    desc: 'Simple roasted chicken with lemon and herbs, easy cleanup.',
    ingredients: ['Chicken thighs', 'Lemon', 'Rosemary', 'Potatoes', 'Olive oil'],
    tags: ['Dinner', 'Low-Budget'],
    image: require('../../assets/images/lemon_chicken.png'),
  },
  {
    id: 'mock-5',
    name: 'Chocolate Mug Cake',
    desc: 'Single-serving dessert ready in 2 minutes in the microwave.',
    ingredients: ['Flour', 'Cocoa powder', 'Sugar', 'Egg', 'Milk'],
    tags: ['Dessert', 'Quick'],
    image: require('../../assets/images/mug_cake.png'),
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getRecipeDescription = (recipe: Recipe): string => {
  return recipe.desc || recipe.description || '';
};

export const getRecipeImage = (recipe: Recipe, assetMap = DEFAULT_ASSET_MAP) => {
  // First, check if the recipe has a proper image field
  if (recipe.image) {
    return typeof recipe.image === 'string' ? { uri: recipe.image } : recipe.image;
  }

  // Check Supabase or Picture field
  const picturePath = recipe.picture || recipe.Picture;
  if (picturePath) {
    // If it looks like a URL (Supabase), use it directly
    if (picturePath.startsWith('http')) return { uri: picturePath };
    // Otherwise, try mapping from DEFAULT_ASSET_MAP
    if (assetMap[picturePath]) return assetMap[picturePath];
  }

  // Fallback placeholder
  return require('../../assets/images/placeholder.png');
};

// ============================================================================
// RECIPE CARD COMPONENT
// ============================================================================

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onPress,
  showOverlayButtons = false,
  onPlusPress,
  onHeartPress,
  isLiked = false,
  onEdit,
  onDelete,
  assetMap = DEFAULT_ASSET_MAP,
  showLikeButtonInModal = true,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else {
      setModalVisible(true);
    }
  };

  return (
    <>
      <View style={styles.recipeBox}>
        <TouchableOpacity style={styles.cardBody} activeOpacity={0.9} onPress={handleCardPress}>
          <View style={styles.recipeImageWrapper}>
            <Image 
              source={getRecipeImage(recipe, assetMap)} 
              style={styles.recipeImageWide} 
              resizeMode="cover" 
            />
          </View>

          <Text style={styles.recipeTitle}>{recipe.name}</Text>
          <Text style={styles.recipeDesc} numberOfLines={3} ellipsizeMode="tail">
            {getRecipeDescription(recipe)}
          </Text>

          {showOverlayButtons && (
            <View style={styles.buttonsRow}>
              <TouchableOpacity 
                style={styles.buttonCircle}
                onPress={(e) => {
                  e.stopPropagation();
                  onPlusPress?.();
                }}
              >
                <FontAwesome name="plus" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.buttonOutline}
                onPress={(e) => {
                  e.stopPropagation();
                  onHeartPress?.();
                }}
              >
                <FontAwesome name={isLiked ? "heart" : "heart-o"} size={16} color="#FF4D4D" />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        visible={modalVisible}
        recipe={recipe}
        onClose={() => setModalVisible(false)}
        onEdit={onEdit}
        onDelete={onDelete}
        isLiked={isLiked}
        onHeartPress={onHeartPress}
        showLikeButton={showLikeButtonInModal}
        assetMap={assetMap}
      />
    </>
  );
};

// ============================================================================
// RECIPE DETAIL MODAL COMPONENT
// ============================================================================

interface RecipeDetailModalProps {
  visible: boolean;
  recipe: Recipe;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isLiked?: boolean;
  onHeartPress?: () => void;
  showLikeButton?: boolean;
  assetMap?: Record<string, any>;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  visible,
  recipe,
  onClose,
  onEdit,
  onDelete,
  isLiked,
  onHeartPress,
  showLikeButton = true,
  assetMap = DEFAULT_ASSET_MAP,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Recipe Image */}
            <Image 
              source={getRecipeImage(recipe, assetMap)} 
              style={styles.modalImage}
              resizeMode="cover"
            />

            {/* Recipe Title */}
            <Text style={styles.modalTitle}>{recipe.name}</Text>

            {/* Recipe Description */}
            <Text style={styles.modalDesc}>{getRecipeDescription(recipe)}</Text>

            {/* Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
              <View style={styles.tagRow}>
                {recipe.tags.map((tag: string) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Ingredients */}
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <>
                <Text style={styles.ingredientsLabel}>Ingredients</Text>
                {recipe.ingredients.map((ing: string, i: number) => (
                  <Text key={i} style={styles.ingredientItem}>• {ing}</Text>
                ))}
              </>
            )}

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCloseButton} 
                onPress={onClose}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>

              {showLikeButton && onHeartPress && (
                <TouchableOpacity 
                  style={[styles.modalHeartButton, isLiked && styles.modalHeartButtonLiked]} 
                  onPress={() => {
                    onHeartPress();
                  }}
                >
                  <FontAwesome 
                    name={isLiked ? "heart" : "heart-o"} 
                    size={16} 
                    color={isLiked ? "#fff" : "#FF4D4D"} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.modalButtonText, !isLiked && { color: '#FF4D4D' }]}>
                    {isLiked ? 'Liked' : 'Like'}
                  </Text>
                </TouchableOpacity>
              )}

              {onEdit && (
                <TouchableOpacity 
                  style={styles.modalEditButton} 
                  onPress={() => {
                    onClose();
                    onEdit();
                  }}
                >
                  <Text style={styles.modalButtonText}>Edit</Text>
                </TouchableOpacity>
              )}

              {onDelete && (
                <TouchableOpacity 
                  style={styles.modalDeleteButton} 
                  onPress={onDelete}
                >
                  <Text style={styles.modalButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// SHARED STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Card Styles
  recipeBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardBody: {
    flex: 1,
    paddingBottom: 8,
  },
  recipeImageWrapper: {
    position: 'relative',
    width: '100%',
  },
  recipeImageWide: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  recipeDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  buttonCircle: {
    backgroundColor: 'rgba(91,128,73,0.95)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  buttonOutline: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF4D4D',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 16,
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#000',
  },
  modalDesc: {
    fontSize: 14,
    color: '#444',
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
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
  modalButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  modalCloseButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ccc',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalHeartButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF4D4D',
  },
  modalHeartButtonLiked: {
    backgroundColor: '#FF4D4D',
    borderColor: '#FF4D4D',
  },
  modalEditButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#5b8049ff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalDeleteButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default RecipeCard;