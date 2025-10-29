import { useAbstraxionAccount } from '@burnt-labs/abstraxion-react-native'
import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  View,
} from 'react-native'

interface LoginScreenProps {
  insets: { top: number; bottom: number; left: number; right: number }
}

export default function LoginScreen({ insets }: LoginScreenProps) {
  const {
    login,
    isLoggingIn,
    isConnecting,
    isInitializing,
    isReturningFromAuth,
  } = useAbstraxionAccount()

  const [errorModalVisible, setErrorModalVisible] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleLogin = async () => {
    try {
      await login()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Login cancelled or failed. Please try again.'
      setErrorMessage(message)
      setErrorModalVisible(true)
    }
  }

  if (isInitializing) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Location Based App Attestation</Text>
        <Text style={styles.subtitle}>Initializing...</Text>
        <ActivityIndicator size="large" color="#fff" />
      </SafeAreaView>
    )
  }

  if (isConnecting || isLoggingIn || isReturningFromAuth) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Location Based App Attestation</Text>
        <Text style={styles.subtitle}>Connecting...</Text>
        <ActivityIndicator size="large" color="#fff" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Location Based App Attestation</Text>
      <Text style={styles.subtitle}>Connect your wallet to continue</Text>

      <TouchableOpacity
        style={[styles.button, isConnecting && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={isConnecting}
      >
        <Text style={styles.buttonText}>
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={errorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#888',
  },
  button: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    maxWidth: 600,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#e0e0e0',
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
})
