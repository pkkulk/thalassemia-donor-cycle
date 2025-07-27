import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        Welcome <Text style={styles.highlight}>Back!</Text>
      </Text>
      <Text style={styles.subtext}>Please enter your credentials.</Text>

      <Text style={styles.label}>Enter your Username.</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder="Username"
        placeholderTextColor="#aaa"
      />

      <Text style={styles.label}>Enter your Password.</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { flex: 1, borderBottomRightRadius: 0, borderTopRightRadius: 0 }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#888" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity>
        <Text style={styles.forgotText}>Forgot Password...?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={()=>router.push("patient-home")}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backArrow} onPress={() => router.back()}>
        <Ionicons name="arrow-back-circle" size={32} color="#E28D86" />
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
  forgotText: {
    color: '#D26868',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#D68C83',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
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
