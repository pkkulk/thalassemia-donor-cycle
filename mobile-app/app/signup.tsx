import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase'; // adjust path as needed

export default function SignupScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async () => {
      console.log("Sign up pressed");
      
    if (!email || !password || !fullName || !bloodGroup || !phone) {
      Alert.alert('Missing info', 'Please fill in all the fields.');
      return;
    }
    const { data, error } = await supabase.auth.signUp({
  email,
  password,
});
console.log("Signup response:", data);
console.log("User ID:", data?.user?.id);

if (error) {
  Alert.alert('Error', error.message);
  return;
}

const user = data.user;
console.log('Insert payload:', {
  name: fullName,
  email,
  blood_group: bloodGroup,
  phone,
  user_id: user?.id,
});

const { error: insertError } = await supabase.from('patients').insert({
  name: fullName,
  email,
  blood_group: bloodGroup,
  phone,
  user_id: user?.id, // ✅ Important: Linking patient to the signed-up user
});

    if (insertError) {
      Alert.alert('Signup failed', insertError.message);
    } else {
      Alert.alert('Success', 'Check your email for verification.');
      router.replace('/login');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Welcome to <Text style={styles.highlight}>RaktSetu!</Text></Text>
      <Text style={styles.subtext}>Please fill in the details to create an account.</Text>

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
        value={email}
        onChangeText={setEmail}
      />

      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
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
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#888" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    padding: 24,
    justifyContent: 'center',
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
    marginTop: 20,
    marginBottom: 16,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  backArrow: {
    alignSelf: 'center',
    marginTop: 10,
  },
});
