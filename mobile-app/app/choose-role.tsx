import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';

export default function ChooseRoleScreen() {
  const [selected, setSelected] = useState<'donor' | 'patient'>('donor');

  return (
    <View style={styles.container}>

      <Text style={styles.heading}>Please click on the appropriate option,</Text>
      <Text style={styles.subheading}>Are You A….</Text>

      <View style={styles.roleContainer}>
        <TouchableOpacity
          style={[
            styles.roleBox,
            selected === 'donor' && styles.selectedBox
          ]}
          onPress={() => setSelected('donor')}
        >
          <Image source={require('../assets/logo.png')} style={styles.icon} />
          <Text style={styles.roleText}>Donor</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleBox,
            selected === 'patient' && styles.selectedBox
          ]}
          onPress={() => setSelected('patient')}
        >
          <Image source={require('../assets/logo.png')} style={styles.icon} />
          <Text style={styles.roleText}>Patient</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.signupText}>Sign up here..</Text>

      <TouchableOpacity style={styles.signupButton} onPress={() => router.push('signup')}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <Text style={styles.loginPrompt}>Already Registered...?</Text>

      <TouchableOpacity style={styles.loginButton} onPress={() => router.push('login')}>
        <Text style={styles.buttonText}>Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  logo: {
    width: 140,
    height: 270,
    marginBottom: 10,
  },
  heading: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
  },
  subheading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E76F51',
    marginBottom: 20,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 30,
    height : 100 ,
    marginBottom: 25,
  },
  roleBox: {
    backgroundColor: '#FCEEEE',
    width: 170,
    height: 170,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedBox: {
    borderColor: '#E76F51',
    backgroundColor: '#FFF0ED',
  },
  icon: {
    width: 50,
    height: 50,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  signupText: {
    fontSize: 14,
    color: '#555',
    marginTop : 60,
    marginBottom: 8,
  },
  signupButton: {
    backgroundColor: '#D68C83',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 12,
  },
  loginPrompt: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  loginButton: {
    backgroundColor: '#c4a186',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
