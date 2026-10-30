import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { Auth, browserLocalPersistence, getAuth, initializeAuth, Persistence } from 'firebase/auth';
import { Firestore, initializeFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

import { firebaseConfig } from './firebaseConfig';

// `getReactNativePersistence` only exists in the React Native build of
// @firebase/auth (Metro picks it via the "react-native" export condition), so
// the web typings of 'firebase/auth' do not declare it.
type RnAuth = { getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence };

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function init() {
  if (app) return;
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const rnPersistence = (FirebaseAuth as unknown as RnAuth).getReactNativePersistence;
  if (Platform.OS !== 'web' && rnPersistence) {
    // Keeps the anonymous user (and so household membership) across app restarts.
    auth = initializeAuth(app, { persistence: rnPersistence(AsyncStorage) });
  } else {
    auth = getAuth(app);
    auth.setPersistence(browserLocalPersistence).catch(() => {});
  }
  // React Native's fetch has no streaming, so let Firestore fall back to long polling when needed.
  db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
}

export function firebaseAuth(): Auth {
  init();
  return auth!;
}

export function firestore(): Firestore {
  init();
  return db!;
}
