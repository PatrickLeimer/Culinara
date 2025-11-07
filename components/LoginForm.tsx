import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function LoginForm() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});

  const handleInputFocus = (inputName: string) => {
    setTimeout(() => {
      const input = inputRefs.current[inputName];
      if (input && scrollViewRef.current) {
        input.measureInWindow((x, y, width, height) => {
          scrollViewRef.current?.scrollTo({
            y: y - 100,
            animated: true,
          });
        });
      }
    }, 300);
  };

  const handleLogin = async () => {
    setError('');
    const trimmedInput = emailOrUsername.trim();

    if (!trimmedInput || !password) {
      setError('Please enter both email/username and password');
      return;
    }

    try {
      setLoading(true);
      let emailToUse = trimmedInput;

      // Check if input is a username (doesn't contain @) or an email
      if (!trimmedInput.includes('@')) {
        // It's a username, so we need to look up the email
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('username', trimmedInput)
          .single();

        if (userError || !userData) {
          setError('Invalid username or password');
          return;
        }

        emailToUse = userData.email;
      }

      // Sign in with the email (either provided directly or looked up from username)
      const { error: signInError } = await supabase.auth.signInWithPassword({ 
        email: emailToUse, 
        password 
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace('/explore');
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.form}>
          <Text style={styles.title}>Culinara</Text>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TextInput
            ref={(ref) => { inputRefs.current.emailOrUsername = ref; }}
            style={styles.input}
            placeholder="Email or Username"
            placeholderTextColor="#568A60"
            value={emailOrUsername}
            onChangeText={setEmailOrUsername}
            autoCapitalize="none"
            onFocus={() => handleInputFocus('emailOrUsername')}
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.current.password?.focus()}
          />
          <TextInput
            ref={(ref) => { inputRefs.current.password = ref; }}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#568A60"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            onFocus={() => handleInputFocus('password')}
            returnKeyType="done"
            onSubmitEditing={() => {
              Keyboard.dismiss();
              handleLogin();
            }}
          />
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Log In'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/signup' as any)}>
            <Text style={styles.linkText}>Don't have an account? Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    width: '100%',
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  form: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000'
  },
  errorText: {
    color: '#b3261e',
    marginBottom: 12,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#568A60',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  button: {
    backgroundColor: '#568A60',
    width: '50%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  linkText: {
    color: '#568A60',
    marginTop: 20,
  },
});


