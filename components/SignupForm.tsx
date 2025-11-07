import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [lastname, setLastname] = useState(''); 
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

  const handleSignUp = async () => {
    setError('');
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    const trimmedName = name.trim();
    const trimmedLastname = lastname.trim();

    if (!trimmedEmail || !password || !confirmPassword || !trimmedUsername) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!/^[a-zA-Z0-9_\.\-]{3,20}$/.test(trimmedUsername)) {
      setError('Username must be 3-20 chars: letters, numbers, _ . -');
      return;
    }

    try {
      setLoading(true);
      const { error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            name: trimmedName,
            lastname: trimmedLastname,
            username: trimmedUsername,
          },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      alert('Check your email for a confirmation link!');
      router.replace('/login');
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
          <Text style={styles.title}>Create an Account</Text>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TextInput
            ref={(ref) => { inputRefs.current.name = ref; }}
            style={styles.input}
            placeholder="First name"
            placeholderTextColor="#568A60"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            onFocus={() => handleInputFocus('name')}
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.current.lastname?.focus()}
          />
          <TextInput
            ref={(ref) => { inputRefs.current.lastname = ref; }}
            style={styles.input}
            placeholder="Last name"
            placeholderTextColor="#568A60"
            value={lastname}
            onChangeText={setLastname}
            autoCapitalize="words"
            onFocus={() => handleInputFocus('lastname')}
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.current.username?.focus()}
          />
          <TextInput
            ref={(ref) => { inputRefs.current.username = ref; }}
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#568A60"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            onFocus={() => handleInputFocus('username')}
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.current.email?.focus()}
          />
          <TextInput
            ref={(ref) => { inputRefs.current.email = ref; }}
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#568A60"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => handleInputFocus('email')}
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.current.password?.focus()}
          />

          <View style={styles.inputWrapper}>
            <TextInput
              ref={(ref) => { inputRefs.current.password = ref; }}
              style={[styles.input, styles.inputWithToggle]}
              placeholder="Password"
              placeholderTextColor="#568A60"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onFocus={() => handleInputFocus('password')}
              returnKeyType="next"
              onSubmitEditing={() => inputRefs.current.confirmPassword?.focus()}
            />
            <TouchableOpacity style={styles.toggle} onPress={() => setShowPassword(v => !v)}>
              <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              ref={(ref) => { inputRefs.current.confirmPassword = ref; }}
              style={[styles.input, styles.inputWithToggle]}
              placeholder="Confirm Password"
              placeholderTextColor="#568A60"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              onFocus={() => handleInputFocus('confirmPassword')}
              returnKeyType="done"
              onSubmitEditing={() => {
                Keyboard.dismiss();
                handleSignUp();
              }}
            />
            <TouchableOpacity style={styles.toggle} onPress={() => setShowConfirmPassword(v => !v)}>
              <Text style={styles.toggleText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignUp} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Signing up...' : 'Sign Up'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/login' as any)}>
            <Text style={styles.linkText}>Already have an account? Log in</Text>
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
  inputWrapper: {
    width: '100%',
    position: 'relative',
  },
  inputWithToggle: {
    paddingRight: 70,
  },
  toggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  toggleText: {
    color: '#568A60',
    fontWeight: '600',
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


