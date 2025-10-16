import React, { useState } from 'react';
import { FontAwesome } from '@expo/vector-icons';

import '../styles/app.css';
import '../styles/recipes.css';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('MyRecipes');
  const [recipes, setRecipes] = useState([
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

  const ingredientsList = ['Ingredient 1', 'Ingredient 2', 'Ingredient 3'];
  const tagsList = ['Tag 1', 'Tag 2', 'Tag 3'];

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

  const toggleSelection = (item: string, selected: string[], setSelected: any) => {
    if (selected.includes(item)) {
      setSelected(selected.filter((i) => i !== item));
    } else {
      setSelected([...selected, item]);
    }
  };

  const handleSaveRecipe = () => {
    const newRecipe = {
      name: newRecipeName,
      desc: newRecipeDesc,
      ingredients: selectedIngredients,
      tags: selectedTags,
      // image: //TODO
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

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="headerTitle">Hello, User</div>
      </div>

      {/* Stats */}
      <div className="statsContainer">
        <div className="statBox">
          <div className="statLabel">Friends</div>
          <div className="statNumber">12</div>
        </div>
        <div className="statBox">
          <div className="statLabel">Recipes</div>
          <div className="statNumber">{recipes.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabsContainer">
        {['MyRecipes', 'Liked', 'MealPlan'].map((tab) => (
          <div
            key={tab}
            className={`tab ${activeTab === tab ? 'activeTab' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="contentContainer">
        {activeTab === 'MyRecipes' ? (
          <>
            <div className="addButton" onClick={openAddModal}>
              <FontAwesome name="plus" size={20} color="#fff" />
            </div>

            <div className="grid">
              {recipes.map((recipe, index) => (
                <div
                  key={index}
                  className="recipeCard"
                  onClick={() => openViewModal(index)}
                >
                  <div className="recipeImage" />
                  <div className="recipeTitle">{recipe.name}</div>
                  <div className="recipeDesc">{recipe.desc}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="placeholder">
            <div className="placeholderText">Content will appear here</div>
          </div>
        )}
      </div>

      {/* View Recipe Modal */}
      {viewModalVisible && viewingIndex !== null && (
        <div className="modalOverlay">
          <div className="modalContent">
            <div className="modalTitle">{recipes[viewingIndex].name}</div>
            <div className="modalDesc">{recipes[viewingIndex].desc}</div>
            <div className="modalSubTitle">
              Ingredients: {recipes[viewingIndex].ingredients.join(', ')}
            </div>
            <div className="modalSubTitle">
              Tags: {recipes[viewingIndex].tags.join(', ')}
            </div>

            <div className="modalButtons">
              <div
                className="saveButton"
                onClick={() => {
                  setViewModalVisible(false);
                  openEditModal(viewingIndex);
                }}
              >
                Edit
              </div>
              <div
                className="cancelButton deleteButton"
                onClick={() => handleDeleteRecipe(viewingIndex)}
              >
                Delete
              </div>
              <div className="cancelButton" onClick={() => setViewModalVisible(false)}>
                Close
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {addEditModalVisible && (
        <div className="modalOverlay">
          <div className="modalContent">
            <div className="modalTitle">
              {editingIndex !== null ? 'Edit Recipe' : 'Create New Recipe'}
            </div>

            <input
              className="input"
              placeholder="Recipe Name"
              value={newRecipeName}
              onChange={(e) => setNewRecipeName(e.target.value)}
            />
            <textarea
              className="input"
              placeholder="Description"
              value={newRecipeDesc}
              onChange={(e) => setNewRecipeDesc(e.target.value)}
            />

            {/* Ingredients */}
            <div className="label">Ingredients</div>
            <div className="selectionContainer">
              {ingredientsList.map((item) => (
                <div
                  key={item}
                  className={`selectionItem ${
                    selectedIngredients.includes(item) ? 'selectionItemSelected' : ''
                  }`}
                  onClick={() => toggleSelection(item, selectedIngredients, setSelectedIngredients)}
                >
                  {item}
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="label">Tags</div>
            <div className="selectionContainer">
              {tagsList.map((item) => (
                <div
                  key={item}
                  className={`selectionItem ${
                    selectedTags.includes(item) ? 'selectionItemSelected' : ''
                  }`}
                  onClick={() => toggleSelection(item, selectedTags, setSelectedTags)}
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="label">Image Upload: //TODO</div>

            <div className="modalButtons">
              <div className="cancelButton" onClick={() => setAddEditModalVisible(false)}>
                Cancel
              </div>
              <div className="saveButton" onClick={handleSaveRecipe}>
                Save
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
