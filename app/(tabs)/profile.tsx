import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MyRecipes from '../profile_tabs/myRecipes';
import MealPlan from '../profile_tabs/mealPlan';
// import Liked from '../profile_tabs/Liked'; // future tab

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'MyRecipes' | 'Liked' | 'MealPlan'>('MyRecipes');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hello, User</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Friends</Text>
          <Text style={styles.statNumber}>12</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Recipes</Text>
          <Text style={styles.statNumber}>2</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['MyRecipes', 'Liked', 'MealPlan'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.activeTab,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={styles.tabText}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'MyRecipes' && <MyRecipes />}
        {activeTab === 'MealPlan' && <MealPlan />}
        {activeTab === 'Liked' && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Liked recipes will appear here</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 50, 
    backgroundColor: '#bfcdb8ff' 
  },
  
  header: { 
    alignItems: 'center', 
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 20 
  },

  headerTitle: { 
    fontSize: 22, 
    letterSpacing: 1,
    fontWeight: 'bold' 
  },

  statsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: 20 
  },

  statBox: { 
    alignItems: 'center' 
  },

  statLabel: { 
    fontSize: 16, color: '#666' 
  },

  statNumber: { 
    fontSize: 20, fontWeight: 'bold' 
  },

  tabsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: 20, 
    backgroundColor: '#bfcdb8ff'
  },

  tab: { 
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 
  },

  activeTab: { 
    backgroundColor: '#ececec' 
  },

  tabText: { 
    fontSize: 16 
  },

  contentContainer: { 
    flex: 1, 
    backgroundColor: '#fff',
  },

  placeholder: { 
    alignItems: 'center', justifyContent: 'center', flex: 1 
  },

  placeholderText: { 
    color: '#888' 
  },
});
