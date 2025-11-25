import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
} from 'react-native';

export default function GroceryList() {
  const [groceryList, setGroceryList] = useState([
    { name: 'Milk', amount: '1 gal', inPantry: false },
    { name: 'Eggs', amount: '12', inPantry: true },
    { name: 'Chicken Breast', amount: '2 lbs', inPantry: false },
  ]);

  const [newGroceryItem, setNewGroceryItem] = useState({ name: '', amount: '' });

  const togglePantry = (index: number) => {
    const updated = [...groceryList];
    updated[index].inPantry = !updated[index].inPantry;
    setGroceryList(updated);
  };

  const addGroceryItem = () => {
    const trimmedName = newGroceryItem.name.trim();
    if (!trimmedName) return;
    setGroceryList([...groceryList, { ...newGroceryItem, inPantry: false }]);
    setNewGroceryItem({ name: '', amount: '' });
  };

  const deleteGroceryItem = (index: number) => {
    const updated = [...groceryList];
    updated.splice(index, 1);
    setGroceryList(updated);
  };

  return (
    <View style={styles.container}>
      <View style={styles.addContainer}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder="Item Name"
          value={newGroceryItem.name}
          onChangeText={text => setNewGroceryItem({ ...newGroceryItem, name: text })}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Amount"
          value={newGroceryItem.amount}
          onChangeText={text => setNewGroceryItem({ ...newGroceryItem, amount: text })}
        />
        <TouchableOpacity style={styles.addButton} onPress={addGroceryItem}>
          <Text style={{ color: '#fff' }}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listContent}>
        {groceryList.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <Switch value={item.inPantry} onValueChange={() => togglePantry(index)} />
            <TextInput
              style={[styles.itemText, { borderBottomWidth: 1, borderColor: '#ccc' }]}
              value={item.name}
              onChangeText={text => {
                const updated = [...groceryList];
                updated[index].name = text;
                setGroceryList(updated);
              }}
            />
            <TextInput
              style={[styles.itemAmount, { borderBottomWidth: 1, borderColor: '#ccc', width: 60 }]}
              value={item.amount}
              onChangeText={text => {
                const updated = [...groceryList];
                updated[index].amount = text;
                setGroceryList(updated);
              }}
            />
            <TouchableOpacity onPress={() => deleteGroceryItem(index)}>
              <Text style={{ color: 'red', marginLeft: 8 }}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 8, padding: 24 },
  addContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  addButton: {
    backgroundColor: '#5b8049ff',
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  listContent: { marginTop: 8 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  itemText: { flex: 1, marginLeft: 10, fontSize: 16 },
  itemAmount: { color: '#666' },
});
