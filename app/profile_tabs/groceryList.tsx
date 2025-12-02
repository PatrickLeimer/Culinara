import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function GroceryList() {
  const [groceryList, setGroceryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setGroceryList([]);
          setLoading(false);
          return;
        }
        setUserId(user.id);
        const { data, error } = await supabase.from('groceries').select('id, name, amount, in_pantry').eq('user_id', user.id).order('created_at', { ascending: false });
        if (error) {
          console.warn('Error loading groceries', error);
          setGroceryList([]);
        } else {
          setGroceryList((data ?? []).map((r: any) => ({ id: r.id, name: r.name, amount: r.amount || '', inPantry: !!r.in_pantry })));
        }
      } catch (err) {
        console.warn('Unexpected error loading groceries', err);
        setGroceryList([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const [newGroceryItem, setNewGroceryItem] = useState({ name: '', amount: '' });
  const togglePantry = async (index: number) => {
    const updated = [...groceryList];
    const item = updated[index];
    updated[index].inPantry = !updated[index].inPantry;
    setGroceryList(updated);
    // Persist change
      try {
      if (item.id) await supabase.from('groceries').update({ in_pantry: updated[index].inPantry }).eq('id', item.id);
    } catch (err) {
      console.warn('Could not update grocery purchased state', err);
    }
  };

  const addGroceryItem = () => {
    const trimmedName = newGroceryItem.name.trim();
    if (!trimmedName) return;
    // Persist to Supabase if we have a user
    (async () => {
          try {
            if (userId) {
              const { data, error } = await supabase.from('groceries').insert([{ user_id: userId, name: trimmedName, amount: newGroceryItem.amount || null, in_pantry: false }]).select('id, name, amount, in_pantry').single();
              if (!error && data) {
                setGroceryList([...groceryList, { id: data.id, name: data.name, amount: data.amount || '', inPantry: !!data.in_pantry }]);
              } else {
                setGroceryList([...groceryList, { name: trimmedName, amount: newGroceryItem.amount || '', inPantry: false }]);
              }
            } else {
              setGroceryList([...groceryList, { name: trimmedName, amount: newGroceryItem.amount || '', inPantry: false }]);
            }
          } catch (err) {
            console.warn('Error adding grocery item', err);
            setGroceryList([...groceryList, { name: trimmedName, amount: newGroceryItem.amount || '', inPantry: false }]);
          } finally {
            setNewGroceryItem({ name: '', amount: '' });
          }
    })();
  };

  const deleteGroceryItem = (index: number) => {
    const updated = [...groceryList];
    const [removed] = updated.splice(index, 1);
    setGroceryList(updated);
    (async () => {
      try {
        if (removed?.id) await supabase.from('groceries').delete().eq('id', removed.id);
      } catch (err) {
        console.warn('Error deleting grocery item from server', err);
      }
    })();
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
        {loading ? (
          <Text style={{ padding: 12, color: '#666' }}>Loading...</Text>
        ) : (
          groceryList.map((item, index) => (
            <View key={item.id ?? index} style={styles.listItem}>
              <Switch value={item.inPantry} onValueChange={() => togglePantry(index)} />
              <TextInput
                style={[styles.itemText, { borderBottomWidth: 1, borderColor: '#ccc' }]}
                value={item.name}
                onChangeText={async (text) => {
                  const updated = [...groceryList];
                  updated[index].name = text;
                  setGroceryList(updated);
                  try {
                    if (item.id) await supabase.from('groceries').update({ name: text }).eq('id', item.id);
                  } catch (err) {
                    console.warn('Could not update grocery name', err);
                  }
                }}
              />
              <TextInput
                style={[styles.itemAmount, { borderBottomWidth: 1, borderColor: '#ccc', width: 60 }]}
                value={item.amount}
                onChangeText={async (text) => {
                  const updated = [...groceryList];
                  updated[index].amount = text;
                  setGroceryList(updated);
                  try {
                    if (item.id) await supabase.from('groceries').update({ amount: text }).eq('id', item.id);
                  } catch (err) {
                    console.warn('Could not update grocery amount', err);
                  }
                }}
              />
              <TouchableOpacity onPress={() => deleteGroceryItem(index)} style={styles.deleteButton}>
                <FontAwesome name="times" size={18} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 8, paddingHorizontal: 16 },
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
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  itemText: { flex: 1, marginLeft: 10, fontSize: 16 },
  itemAmount: { color: '#666' },
  deleteButton: { padding: 6, marginLeft: 8 },
});
