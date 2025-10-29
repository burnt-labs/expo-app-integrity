import {
  AbstraxionProvider,
  useAbstraxionAccount,
} from '@burnt-labs/abstraxion-react-native'
import React from 'react'
import 'react-native-get-random-values'
import crypto from 'react-native-quick-crypto'

import LoginScreen from './components/LoginScreen'
import MainAppScreen from './components/MainAppScreen'
import { TREASURY_CONFIG } from './utils/constants'

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

function AppContent() {
  const { isConnected } = useAbstraxionAccount()

  // Mock safe area insets for now - in a real app you'd use react-native-safe-area-context
  const insets = { top: 60, bottom: 0, left: 0, right: 0 }

  if (!isConnected) {
    return <LoginScreen insets={insets} />
  }

  return <MainAppScreen insets={insets} />
}

export default function App() {
  return (
    <AbstraxionProvider config={TREASURY_CONFIG}>
      <AppContent />
    </AbstraxionProvider>
  )
}
