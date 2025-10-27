import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert(error.message);
      return;
    }
    alert('Check your email for a confirmation link!');
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:'center', alignItems:'center', padding:30, backgroundColor:'#fff' },
  title:{ fontSize:28, fontWeight:'600', marginBottom:40 },
  input:{ width:'100%', height:50, borderColor:'#ccc', borderWidth:1, borderRadius:10, paddingHorizontal:15, marginBottom:20 },
  button:{ backgroundColor:'#007AFF', width:'100%', paddingVertical:14, borderRadius:10, alignItems:'center' },
  buttonText:{ color:'#fff', fontWeight:'600', fontSize:16 },
});
