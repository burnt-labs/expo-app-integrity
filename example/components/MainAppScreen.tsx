import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from '@burnt-labs/abstraxion-react-native'
import * as Integrity from 'expo-app-integrity'
import * as Clipboard from 'expo-clipboard'
import {
  requestForegroundPermissionsAsync,
  getCurrentPositionAsync,
  reverseGeocodeAsync,
  Accuracy,
} from 'expo-location'
import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'

import {
  CLOUD_PROJECT_NUMBER,
  CONTRACT_ADDRESS,
  APP_ID,
} from '../utils/constants'
import { decodeLocationData } from '../utils/locationUtils'

interface MainAppScreenProps {
  insets: { top: number; bottom: number; left: number; right: number }
}

export default function MainAppScreen({ insets }: MainAppScreenProps) {
  const { logout, data: account } = useAbstraxionAccount()
  const { client } = useAbstraxionSigningClient()

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [addressCopied, setAddressCopied] = useState(false)
  const [decodedLocationData, setDecodedLocationData] = useState<any>(null)
  const [mapData, setMapData] = useState<
    { address: string; locationData: any }[]
  >([])
  const [userQueryStatus, setUserQueryStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('loading')
  const [mapQueryStatus, setMapQueryStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('loading')
  const [attestationStep, setAttestationStep] = useState<string>('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [successLocation, setSuccessLocation] = useState<string>('')

  // Auto-query stored location when client is available
  useEffect(() => {
    if (client && account?.bech32Address) {
      queryContract()
      queryContractMap()
    }
  }, [client, account?.bech32Address])

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

  const queryContract = async () => {
    try {
      setUserQueryStatus('loading')
      if (!client) {
        throw new Error('Client not found')
      }

      const msg = {
        get_value_by_user: {
          address: account?.bech32Address,
        },
      }
      const result = await client.queryContractSmart(CONTRACT_ADDRESS, msg)

      // Decode the base64 result if it exists
      if (result && typeof result === 'string') {
        const decodedData = await decodeLocationData(result)
        setDecodedLocationData(decodedData)
        setUserQueryStatus('success')
        return
      }
      setUserQueryStatus('success')
    } catch (error) {
      console.log({ error })
      setUserQueryStatus('error')
    }
  }

  const queryContractMap = async () => {
    try {
      setMapQueryStatus('loading')
      if (!client) {
        throw new Error('Client not found')
      }

      const msg = {
        get_map: {},
      }
      const result = await client.queryContractSmart(CONTRACT_ADDRESS, msg)

      // Handle array of address-location pairs
      if (result && Array.isArray(result)) {
        const decodedMapData = []

        for (const [address, base64LocationData] of result) {
          try {
            const decodedLocation = await decodeLocationData(base64LocationData)
            decodedMapData.push({
              address,
              locationData: decodedLocation,
            })
          } catch (error) {
            console.error(
              `Error decoding location for address ${address}:`,
              error,
            )
            decodedMapData.push({
              address,
              locationData: {
                error: 'Failed to decode location data',
                decoded: false,
              },
            })
          }
        }

        setMapData(decodedMapData)
        setMapQueryStatus('success')
        return
      }
      setMapQueryStatus('success')
    } catch (error) {
      console.log({ error })
      setMapQueryStatus('error')
    }
  }

  const reverseGeocode = async (
    latitude: number,
    longitude: number,
  ): Promise<string> => {
    try {
      const addresses = await reverseGeocodeAsync({ latitude, longitude })

      if (addresses && addresses.length > 0) {
        const address = addresses[0]
        const parts = []
        if (address.city) parts.push(address.city)
        if (address.region) parts.push(address.region)
        if (address.country) parts.push(address.country)

        return parts.length > 0
          ? parts.join(', ')
          : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      }

      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    }
  }

  const handleUnifiedAttestation = async () => {
    setIsLoading(true)
    setError(null)
    setAttestationStep('')

    try {
      // Step 1: Request location permissions
      setAttestationStep('Requesting location permission...')
      const { status } = await requestForegroundPermissionsAsync()

      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required for app attestation',
        )
        setIsLoading(false)
        return
      }

      // Step 2: Get current location
      setAttestationStep('Getting current location...')
      const currentLocation = await getCurrentPositionAsync({
        accuracy: Accuracy.Lowest,
        timeInterval: 5000,
      })

      // Step 3: Create server attestation challenge with location data
      setAttestationStep('Creating attestation challenge...')
      const serverAttestationChallenge = JSON.stringify({
        timestamp: Date.now(),
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
      })

      // Step 4: Perform app attestation
      setAttestationStep('Generating device attestation...')
      const result = await Integrity.attestKey(
        serverAttestationChallenge,
        CLOUD_PROJECT_NUMBER,
      )

      // Step 5: Submit to contract
      setAttestationStep('Submitting to blockchain...')
      if (!client) {
        throw new Error('Client not found')
      }

      if (
        !result.keyIdentifier ||
        !serverAttestationChallenge ||
        !result.attestation
      ) {
        throw new Error(
          'Key identifier, server attestation challenge, or attestation not found',
        )
      }

      const msg = {
        update: {
          attestation: {
            app_id: APP_ID,
            key_id: result.keyIdentifier,
            challenge: btoa(serverAttestationChallenge),
            cbor_data: result.attestation,
            dev_env: true,
          },
        },
      }

      await client.execute(
        account?.bech32Address,
        CONTRACT_ADDRESS,
        msg,
        'auto',
      )

      // Get the location name for success display
      const locationName = await reverseGeocode(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
      )

      setSuccessLocation(locationName)
      setShowSuccess(true)
      setAttestationStep('Successfully verified location')

      // Auto-refresh stored location and map data after successful attestation
      setTimeout(() => {
        queryContract()
        queryContractMap()
        setAttestationStep('')
        setShowSuccess(false)
        setIsLoading(false)
      }, 3000)
    } catch (error: any) {
      console.log({ error })
      setError(error.message)
      setAttestationStep('')
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top },
        ]}
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

        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>Your Verified Location</Text>
          {userQueryStatus === 'idle' && (
            <Text style={styles.bodyText}>No location queried yet.</Text>
          )}
          {userQueryStatus === 'loading' && (
            <Text style={styles.bodyText}>
              Loading your verified location...
            </Text>
          )}
          {userQueryStatus === 'error' && (
            <Text style={styles.errorValue}>Failed to load your location.</Text>
          )}
          {userQueryStatus === 'success' && decodedLocationData?.decoded && (
            <Text style={styles.bodyText}>
              {decodedLocationData.locationName}
            </Text>
          )}
        </View>

        <View style={styles.tableContainer}>
          <Text style={styles.tableTitle}>Verified User Locations</Text>
          {mapQueryStatus === 'idle' && (
            <Text style={styles.bodyText}>No locations queried yet.</Text>
          )}
          {mapQueryStatus === 'loading' && (
            <Text style={styles.bodyText}>
              Loading verified user locations...
            </Text>
          )}
          {mapQueryStatus === 'error' && (
            <Text style={styles.errorValue}>
              Failed to load user locations.
            </Text>
          )}
          {mapQueryStatus === 'success' && mapData.length === 0 && (
            <Text style={styles.bodyText}>No verified locations found.</Text>
          )}
          {mapData.length > 0 && (
            <ScrollView style={styles.tableScroll} showsVerticalScrollIndicator>
              {mapData.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <View style={styles.addressColumn}>
                    <Text style={styles.addressLabel}>Address:</Text>
                    <Text style={styles.addressText}>
                      {truncateAddress(item.address)}
                    </Text>
                  </View>
                  <View style={styles.locationColumn}>
                    <Text style={styles.locationLabel}>Location:</Text>
                    {item.locationData.decoded ? (
                      <Text style={styles.locationText}>
                        {item.locationData.locationName}
                      </Text>
                    ) : (
                      <Text style={styles.errorText}>
                        {item.locationData.error || 'Unknown'}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {decodedLocationData && !decodedLocationData.decoded && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Decode Error:</Text>
            <Text style={styles.errorValue}>{decodedLocationData.error}</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error Log:</Text>
            <Text style={styles.errorValue}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleUnifiedAttestation}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Start Attestation</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              {showSuccess ? (
                <>
                  <Text style={styles.checkmark}>✓</Text>
                  <Text style={styles.loadingText}>{attestationStep}</Text>
                  <Text style={styles.successLocationText}>
                    {successLocation}
                  </Text>
                </>
              ) : (
                <>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.loadingText}>{attestationStep}</Text>
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'stretch',
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff',
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: '#111',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 250,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
  checkmark: {
    color: '#4CAF50',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  successLocationText: {
    color: '#4CAF50',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  tableContainer: {
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
  tableTitle: {
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  tableScroll: {
    maxHeight: 300,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  addressColumn: {
    flex: 1,
    marginRight: 8,
  },
  locationColumn: {
    flex: 1,
    marginLeft: 8,
  },
  addressLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    fontWeight: '600',
  },
  locationLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 12,
    color: '#fff',
    fontFamily: 'monospace',
  },
  mockButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    maxWidth: 600,
  },
  mockButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  clearButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    maxWidth: 600,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
})
