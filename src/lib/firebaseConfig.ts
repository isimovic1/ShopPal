// Paste the web app config from the Firebase console here (see FIREBASE_SETUP.md).
// These values identify the project; they are not secrets — access is
// controlled by the Firestore rules in firestore.rules.
export const firebaseConfig = {
  apiKey: 'AIzaSyDxV6XmPKJQ03PHaZ5edXRQizXM8BmxZgA',
  authDomain: 'shoppal-99658.firebaseapp.com',
  projectId: 'shoppal-99658',
  storageBucket: 'shoppal-99658.firebasestorage.app',
  messagingSenderId: '49924314936',
  appId: '1:49924314936:web:5bf9f7802c9ea10860d3cd',
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}
