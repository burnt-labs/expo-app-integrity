import {
  AbstraxionProvider,
  useAbstraxionAccount,
} from '@burnt-labs/abstraxion-react-native'
import * as Integrity from 'expo-app-integrity'
import * as Clipboard from 'expo-clipboard'
import {
  requestForegroundPermissionsAsync,
  getCurrentPositionAsync,
  Accuracy,
  LocationObject,
  PermissionStatus,
} from 'expo-location'
import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import 'react-native-get-random-values'
import crypto from 'react-native-quick-crypto'

// Set up global crypto for React Native
if (
  typeof global !== 'undefined' &&
  global.navigator?.product === 'ReactNative'
) {
  // @ts-ignore - quickCrypto is not typed
  global.quickCrypto = crypto
}

// Add TextDecoder polyfill for React Native
if (typeof global.TextDecoder === 'undefined') {
  const { TextDecoder, TextEncoder } = require('text-encoding')
  global.TextDecoder = TextDecoder
  global.TextEncoder = TextEncoder
}

const cloudProjectNumber = 981207571806

const treasuryConfig = {
  treasury: 'xion175qd54keur7gkuwtctfupgtucvlvkrxhv0pgq753sfh5xueputvsms6nll',
  callbackUrl: 'integrity-example://',
}

function AppContent() {
  const {
    login,
    logout,
    isConnected,
    isConnecting,
    data: account,
  } = useAbstraxionAccount()

  const [attestation, setAttestation] = useState<string | null>(null)
  const [keyIdentifier, setKeyIdentifier] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<LocationObject | null>(null)
  const [locationPermission, setLocationPermission] =
    useState<PermissionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [addressCopied, setAddressCopied] = useState(false)
  const [copiedKeyId, setCopiedKeyId] = useState(false)

  const handleCopy = async () => {
    if (!attestation) return
    await Clipboard.setStringAsync(attestation)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleCopyKeyIdentifier = async () => {
    if (keyIdentifier) {
      await Clipboard.setStringAsync(keyIdentifier)
      setCopiedKeyId(true)
      setTimeout(() => setCopiedKeyId(false), 1500)
    }
  }

  const handleCopyAddress = async () => {
    if (!account?.bech32Address) return
    await Clipboard.setStringAsync(account.bech32Address)
    setAddressCopied(true)
    setTimeout(() => setAddressCopied(false), 1500)
  }

  const truncateAddress = (address: string) => {
    if (address.length <= 20) return address
    return `${address.slice(0, 8)}...${address.slice(-4)}`
  }

  // const decodeAttestation = (base64String: string) => {
  //   try {
  //     // Decode Base64 to get the raw bytes
  //     const rawBytes = atob(base64String)

  //     // Convert to hex for better visualization
  //     let hexString = ''
  //     for (let i = 0; i < rawBytes.length; i++) {
  //       const hex = rawBytes.charCodeAt(i).toString(16).padStart(2, '0')
  //       hexString += hex + ' '
  //     }

  //     return {
  //       base64: base64String,
  //       hex: hexString.trim(),
  //       length: rawBytes.length,
  //       format:
  //         'CBOR (Concise Binary Object Representation) - Binary format, not human-readable',
  //     }
  //   } catch (error) {
  //     return {
  //       base64: base64String,
  //       error: 'Failed to decode Base64',
  //     }
  //   }
  // }

  const handleAttestation = async () => {
    setIsLoading(true)
    setError(null)
    setAttestation(null)

    try {
      // Request location permissions
      const { status } = await requestForegroundPermissionsAsync()
      setLocationPermission(status)

      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required for app attestation',
        )
        setIsLoading(false)
        return
      }

      // Get current location
      const currentLocation = await getCurrentPositionAsync({
        accuracy: Accuracy.High,
        timeInterval: 5000,
      })
      setLocation(currentLocation)

      // Create server attestation challenge with location data
      const serverAttestationChallenge = JSON.stringify({
        timestamp: Date.now(),
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
      })

      console.log('serverAttestationChallenge', serverAttestationChallenge)

      // Perform app attestation with location-based challenge
      const result = await Integrity.attestKey(
        serverAttestationChallenge,
        cloudProjectNumber,
      )
      setAttestation(result.attestation)
      setKeyIdentifier(result.keyIdentifier)
    } catch (error: any) {
      console.log({ error })
      setError(error.code)
    } finally {
      setIsLoading(false)
    }
  }

  // const decodedResult = attestation ? decodeAttestation(attestation) : null

  if (isConnecting) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Location Based App Attestation</Text>
        <Text style={styles.subtitle}>Connecting...</Text>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Location Based App Attestation</Text>
        <Text style={styles.subtitle}>Connect your wallet to continue</Text>

        <TouchableOpacity
          style={[styles.button, isConnecting && styles.buttonDisabled]}
          onPress={login}
          disabled={isConnecting}
        >
          <Text style={styles.buttonText}>
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Location Based App Attestation</Text>
      <View style={styles.accountContainer}>
        <View style={styles.accountHeader}>
          <Text style={styles.accountText}>Connected Account:</Text>
          <TouchableOpacity
            onPress={handleCopyAddress}
            disabled={!account?.bech32Address}
            style={[
              styles.copyButton,
              !account?.bech32Address && styles.copyButtonDisabled,
            ]}
          >
            <Text style={styles.copyButtonText}>
              {addressCopied ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.accountAddress}>
          {account?.bech32Address
            ? truncateAddress(account.bech32Address)
            : 'N/A'}
        </Text>
      </View>

      {locationPermission === 'denied' && (
        <Text style={styles.errorText}>Location permission denied</Text>
      )}

      {location && (
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>Location:</Text>
          <Text style={styles.bodyText}>
            Latitude: {location.coords.latitude.toFixed(6)}
          </Text>
          <Text style={styles.bodyText}>
            Longitude: {location.coords.longitude.toFixed(6)}
          </Text>
          <Text style={styles.bodyText}>
            Accuracy: {location.coords.accuracy?.toFixed(2)}m
          </Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Attestation error:</Text>
          <Text style={styles.errorValue}>{error}</Text>
        </View>
      ) : (
        <View style={styles.attestationContainer}>
          <View style={styles.attestationHeader}>
            <Text style={styles.attestationText}>Attestation:</Text>
            <TouchableOpacity
              onPress={handleCopy}
              disabled={!attestation}
              style={[
                styles.copyButton,
                !attestation && styles.copyButtonDisabled,
              ]}
            >
              <Text style={styles.copyButtonText}>
                {copied ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.attestationScroll}>
            <Text style={styles.attestationValue}>{attestation ?? 'N/A'}</Text>
          </ScrollView>
        </View>
      )}
      {keyIdentifier && (
        <View style={styles.attestationContainer}>
          <View style={styles.attestationHeader}>
            <Text style={styles.attestationText}>Key Identifier:</Text>
            <TouchableOpacity
              onPress={handleCopyKeyIdentifier}
              disabled={!keyIdentifier}
              style={[
                styles.copyButton,
                !keyIdentifier && styles.copyButtonDisabled,
              ]}
            >
              <Text style={styles.copyButtonText}>
                {copiedKeyId ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.attestationScroll}>
            <Text style={styles.attestationValue}>{keyIdentifier}</Text>
          </ScrollView>
        </View>
      )}

      {/* {decodedResult && !decodedResult.error && (
        <View style={styles.attestationContainer}>
          <View style={styles.attestationHeader}>
            <Text style={styles.attestationText}>Decoded Information</Text>
          </View>
          <Text style={styles.bodyText}>Format: {decodedResult.format}</Text>
          <Text style={styles.bodyText}>
            Length: {decodedResult.length} bytes
          </Text>

          <View style={[styles.attestationHeader, { marginTop: 12 }]}>
            <Text style={styles.attestationText}>Hex Representation</Text>
            <TouchableOpacity
              onPress={() => handleCopyHex(decodedResult.hex)}
              disabled={!decodedResult.hex}
              style={[
                styles.copyButton,
                !decodedResult.hex && styles.copyButtonDisabled,
              ]}
            >
              <Text style={styles.copyButtonText}>
                {copiedHex ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.attestationScroll}>
            <Text style={styles.attestationValue}>{decodedResult.hex}</Text>
          </ScrollView>
        </View>
      )}

      {decodedResult?.error && (
        <Text style={styles.errorText}>
          Decode Error: {decodedResult.error}
        </Text>
      )} */}

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleAttestation}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Getting Location...' : 'Start Attestation'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

export default function App() {
  return (
    <AbstraxionProvider config={treasuryConfig}>
      <AppContent />
    </AbstraxionProvider>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
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
  accountContainer: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'stretch',
    minWidth: 200,
    maxWidth: 600,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  accountText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  accountAddress: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  locationContainer: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'stretch',
    minWidth: 200,
    maxWidth: 600,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  locationText: {
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#fff',
  },
  bodyText: {
    color: '#fff',
  },
  attestationContainer: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'stretch',
    minWidth: 200,
    maxWidth: 600,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  attestationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  attestationText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  copyButton: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  copyButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  copyButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  attestationScroll: {
    maxHeight: 160,
  },
  attestationValue: {
    fontSize: 12,
    textAlign: 'left',
    color: '#fff',
  },
  errorContainer: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'stretch',
    minWidth: 200,
    maxWidth: 600,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  errorText: {
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#d32f2f',
  },
  errorValue: {
    color: '#d32f2f',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    maxWidth: 600,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
})
