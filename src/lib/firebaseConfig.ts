// Paste the web app config from the Firebase console here (see FIREBASE_SETUP.md).
// These values identify the project; they are not secrets — access is
// controlled by the Firestore rules in firestore.rules.
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}
