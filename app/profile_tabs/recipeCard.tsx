import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface RecipeCardProps {
  recipe: {
    id?: string;
    name: string;
    desc: string;
    ingredients?: string[];
    tags?: string[];
    Picture?: string | null;
    image?: any; // For explore.tsx compatibility
  };
  onPress: () => void;
  showOverlayButtons?: boolean; // Show + and heart buttons on image
  onPlusPress?: () => void;
  onHeartPress?: () => void;
  assetMap?: Record<string, any>; // Map of asset paths to require()
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onPress,
  showOverlayButtons = false,
  onPlusPress,
  onHeartPress,
  assetMap,
}) => {
  // Determine which image to use (handles both myRecipes and explore formats)
  const getImageSource = () => {
    // Check for explore.tsx format (image property)
    if (recipe.image) {
      return typeof recipe.image === 'string' ? { uri: recipe.image } : recipe.image;
    }
    
    // Check for myRecipes format (Picture property)
    if (recipe.Picture && assetMap) {
      const mappedImage = assetMap[recipe.Picture];
      return mappedImage || require('../../assets/images/placeholder.png');
    }
    
    // Fallback to placeholder
    return require('../../assets/images/placeholder.png');
  };

  return (
    <View style={styles.recipeBox}>
      <TouchableOpacity style={styles.cardBody} activeOpacity={0.9} onPress={onPress}>
        {/* Image Section */}
        <View style={styles.recipeImageWrapper}>
          <Image source={getImageSource()} style={styles.recipeImageWide} resizeMode="cover" />
        </View>

        {/* Recipe Info */}
        <Text style={styles.recipeTitle}>{recipe.name}</Text>
        <Text style={styles.recipeDesc} numberOfLines={3} ellipsizeMode="tail">
          {recipe.desc}
        </Text>

        {/* Buttons Below Description (for Explore) */}
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
              <FontAwesome name="heart-o" size={16} color="#FF4D4D" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default RecipeCard;

const styles = StyleSheet.create({
  recipeBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
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
    color: '#000',
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
});