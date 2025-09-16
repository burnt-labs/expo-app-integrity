import * as Integrity from 'expo-app-integrity'
import { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import {
  requestForegroundPermissionsAsync,
  getCurrentPositionAsync,
  Accuracy,
  LocationObject,
  PermissionStatus,
} from 'expo-location'
import * as Clipboard from 'expo-clipboard'

const cloudProjectNumber = 981207571806

export default function App() {
  const [attestation, setAttestation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<LocationObject | null>(null)
  const [locationPermission, setLocationPermission] =
    useState<PermissionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!attestation) return
    await Clipboard.setStringAsync(attestation)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

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

      // Perform app attestation with location-based challenge
      const attestation = await Integrity.attestKey(
        serverAttestationChallenge,
        cloudProjectNumber,
      )
      setAttestation(attestation.attestation)
    } catch (error: any) {
      console.log({ error })
      setError(error.code)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>App Attestation with Location</Text>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleAttestation}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Getting Location...' : 'Start Attestation'}
        </Text>
      </TouchableOpacity>

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

      <View style={styles.attestationContainer}>
        <View style={styles.attestationHeader}>
          <Text style={styles.attestationText}>AppAttest attestation</Text>
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

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>AppAttest error:</Text>
          <Text style={styles.errorValue}>{error}</Text>
        </View>
      )}
    </View>
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
  locationContainer: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    minWidth: 200,
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
    alignItems: 'center',
    minWidth: 200,
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
})
