import { useState, useRef } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

type UserRole = 'donor' | 'patient';

export default function SignupScreen() {
  const scrollRef = useRef<KeyboardAwareScrollView>(null);
  const params = useLocalSearchParams();

  const role =
    params.role === 'donor' || params.role === 'patient'
      ? (params.role as UserRole)
      : 'patient';

  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ✅ Reset scroll when coming back to this screen
  useFocusEffect(() => {
    scrollRef.current?.scrollToPosition(0, 0, false);
  });

  const handleSignUp = async () => {
    if (!email || !password || !fullName || !bloodGroup || !phone) {
      Alert.alert('Missing info', 'Please fill in all the fields.');
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      Alert.alert('Signup failed', authError.message);
      return;
    }

    const user = authData.user;
    if (!user) {
      Alert.alert('Error', 'User object not created.');
      return;
    }

    const profileTableName = role === 'donor' ? 'donor' : 'patients';

    const profilePayload = {
      name: fullName,
      email,
      blood_group: bloodGroup,
      phone,
      user_id: user.id,
    };

    const { error: insertError } = await supabase
      .from(profileTableName)
      .insert(profilePayload);

    if (insertError) {
      Alert.alert('Profile Setup Failed', insertError.message);
      return;
    }

    Alert.alert('Success', 'Account created! Check your email to verify.');
    router.replace('/login');
  };

  return (
    <KeyboardAwareScrollView
      ref={scrollRef}
      contentContainerStyle={styles.container}
      enableOnAndroid
      extraScrollHeight={140}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>
        Welcome to <Text style={styles.highlight}>RaktSetu!</Text>
      </Text>

      <Text style={styles.subtext}>
        Signing up as a{' '}
        <Text style={{ fontWeight: 'bold', color: '#E76F51' }}>
          {role.toUpperCase()}
        </Text>
        . Fill in the details to create an account.
      </Text>

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your full name"
        placeholderTextColor="#aaa"
        value={fullName}
        onChangeText={setFullName}
      />

      <Text style={styles.label}>Blood Group</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. A+, O-, B+"
        placeholderTextColor="#aaa"
        value={bloodGroup}
        onChangeText={setBloodGroup}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your phone number"
        placeholderTextColor="#aaa"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        placeholderTextColor="#aaa"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[
            styles.input,
            { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
          ]}
          placeholder="Create a password"
          placeholderTextColor="#aaa"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showPassword ? 'eye-off' : 'eye'}
            size={22}
            color="#888"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#FFF5F5',
    padding: 24,
    paddingTop: 60,
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    marginBottom: 4,
  },
  highlight: {
    color: '#E76F51',
  },
  subtext: {
    textAlign: 'center',
    color: '#555',
    marginBottom: 24,
  },
  label: {
    marginBottom: 6,
    color: '#444',
    marginTop: 10,
  },
  input: {
    backgroundColor: '#FCEEEE',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    color: '#000',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeIcon: {
    padding: 12,
    backgroundColor: '#FCEEEE',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  button: {
    backgroundColor: '#D68C83',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
