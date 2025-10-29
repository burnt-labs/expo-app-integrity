import { reverseGeocodeAsync } from 'expo-location'

// Utility function to decode base64 string and get location name
export const decodeLocationData = async (base64String: string) => {
  try {
    // Decode base64 string
    const decodedString = atob(base64String)
    const locationData = JSON.parse(decodedString)

    // Extract coordinates
    const { latitude, longitude } = locationData

    // Use reverse geocoding to get location name
    const locationName = await reverseGeocode(latitude, longitude)

    return {
      ...locationData,
      locationName,
      decoded: true,
    }
  } catch (error) {
    console.error('Error decoding location data:', error)
    return {
      error: 'Failed to decode location data',
      decoded: false,
    }
  }
}

// Reverse geocoding function to convert coordinates to location name
const reverseGeocode = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  try {
    // Using expo-location's built-in reverse geocoding
    const addresses = await reverseGeocodeAsync({ latitude, longitude })

    if (addresses && addresses.length > 0) {
      const address = addresses[0]

      // Format location name based on available data
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
    // Fallback to coordinates if reverse geocoding fails
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
  }
}

// Mock data for testing the table display
export const generateMockData = () => {
  const mockLocations = [
    { city: 'New York', region: 'NY', country: 'USA' },
    { city: 'London', region: 'England', country: 'UK' },
    { city: 'Tokyo', region: 'Tokyo', country: 'Japan' },
    { city: 'Sydney', region: 'NSW', country: 'Australia' },
    { city: 'Paris', region: 'Île-de-France', country: 'France' },
    { city: 'Berlin', region: 'Berlin', country: 'Germany' },
    { city: 'Toronto', region: 'Ontario', country: 'Canada' },
    { city: 'São Paulo', region: 'São Paulo', country: 'Brazil' },
    { city: 'Mumbai', region: 'Maharashtra', country: 'India' },
    { city: 'Dubai', region: 'Dubai', country: 'UAE' },
  ]

  const mockAddresses = [
    'xion1f7c3cd26s8veq9rp94t7ysreacz4aemeh0tl0wcmysljgrm6qapqu6jh5x',
    'xion1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d',
    'xion1z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4z3y2x1',
    'xion1m9n8o7p6q5r4s3t2u1v0w9x8y7z6a5b4c3d2e1f0g9h8i7j6k5l4m3n2o1',
    'xion1p0q1r2s3t4u5v6w7x8y9z0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8',
    'xion1s9t8u7v6w5x4y3z2a1b0c9d8e7f6g5h4i3j2k1l0m9n8o7p6q5r4s3t2u1',
    'xion1v0w1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8o9p0q1r2s3t4u5v6w7x8',
    'xion1y9z8a7b6c5d4e3f2g1h0i9j8k7l6m5n4o3p2q1r0s9t8u7v6w5x4y3z2a1',
    'xion1b0c1d2e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8',
    'xion1e9f8g7h6i5j4k3l2m1n0o9p8q7r6s5t4u3v2w1x0y9z8a7b6c5d4e3f2g1',
  ]

  return mockAddresses.map((address, index) => {
    const location = mockLocations[index]
    const mockLocationData = {
      timestamp: Date.now() - Math.random() * 86400000, // Random timestamp within last day
      latitude: 40.7128 + (Math.random() - 0.5) * 20, // Around NYC area
      longitude: -74.006 + (Math.random() - 0.5) * 20,
      accuracy: 10 + Math.random() * 20,
    }

    return {
      address,
      locationData: {
        ...mockLocationData,
        locationName: `${location.city}, ${location.region}, ${location.country}`,
        decoded: true,
      },
    }
  })
}
