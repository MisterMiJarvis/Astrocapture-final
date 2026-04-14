// FIX: Switched to Firebase compat imports to resolve module export errors, likely caused by a version mismatch.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
// FIX: Removed unused and undefined 'WeatherWidget' type from import.
import { FirebaseConfig, AppData, Post } from '../types';
import { FIREBASE_CONFIG } from './firebaseConfig'; // Import the hardcoded config

let app: firebase.app.App | null = null;
let auth: firebase.auth.Auth | null = null;
let db: firebase.firestore.Firestore | null = null;
let storage: firebase.storage.Storage | null = null;

export const isFirebaseInitialized = () => !!app;

// MODIFIED: This function no longer takes a config object.
// It uses the imported FIREBASE_CONFIG.
export const initializeFirebase = () => {
  // Developer check: Ensure placeholder values have been replaced.
  if (FIREBASE_CONFIG.apiKey.startsWith("YOUR_") || FIREBASE_CONFIG.projectId.startsWith("YOUR_")) {
    console.error("Firebase Configuration Error: Please update the placeholder values in 'services/firebaseConfig.ts' with your actual Firebase project credentials.");
    return false;
  }
  
  try {
    if (!app) {
      app = firebase.initializeApp(FIREBASE_CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();
      storage = firebase.storage();
      console.log("Firebase initialized successfully");
    }
    return true;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    return false;
  }
};

export const getAuthInstance = () => auth;

// --- Authentication ---
export const login = async (email: string, pass: string) => {
  if (!auth) throw new Error("Database not connected");
  // FIX: Use compat API for authentication
  return auth.signInWithEmailAndPassword(email, pass);
};

export const logout = async () => {
  if (!auth) return;
  // FIX: Use compat API for sign out
  return auth.signOut();
};

// --- Storage (Images) ---
export const uploadFile = async (file: File, path: string): Promise<string> => {
  if (!storage) throw new Error("Storage not connected");
  // FIX: Use compat API for file uploads
  const storageRef = storage.ref(path + '/' + Date.now() + '_' + file.name);
  const snapshot = await storageRef.put(file);
  return snapshot.ref.getDownloadURL();
};

// --- Firestore (Data) ---

// Get a single document by ID
export const getDocument = async (collectionName: string, docId: string): Promise<any | null> => {
  if (!db) throw new Error("Database not connected");
  const docRef = db.collection(collectionName).doc(docId);
  const docSnap = await docRef.get();
  if (docSnap.exists) {
    return { id: docSnap.id, ...docSnap.data() };
  } else {
    return null;
  }
};


// Subscribe to a single document (Global Settings)
export const subscribeToSettings = (
  docName: string, 
  onUpdate: (data: any) => void
) => {
  if (!db) return () => {};
  // We store global settings in a collection named 'settings'
  // FIX: Use compat API for Firestore subscriptions
  return db.collection('settings').doc(docName).onSnapshot((doc) => {
    if (doc.exists) {
      onUpdate(doc.data());
    } else {
      // Return empty object if doc doesn't exist yet
      onUpdate(null);
    }
  }, (error) => {
    console.warn(`Error subscribing to settings/${docName}:`, error);
  });
};

// Save a single document (Global Settings)
export const saveSettings = async (docName: string, data: any) => {
  if (!db) throw new Error("Database not connected");
  // FIX: Use compat API to save documents
  await db.collection('settings').doc(docName).set(data, { merge: true });
};

// Subscribe to a collection (Posts, Widgets)
export const subscribeToCollection = (
  collectionName: string,
  onUpdate: (data: any[]) => void
) => {
  if (!db) return () => {};
  
  // Basic query to get all items
  // FIX: Use compat API for Firestore collection subscriptions
  const q = db.collection(collectionName);
  
  return q.onSnapshot((snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    onUpdate(items);
  }, (error) => {
    console.warn(`Error subscribing to collection ${collectionName}:`, error);
    onUpdate([]); // Return empty list on error to prevent UI issues
  });
};

// Save an item to a collection
export const saveCollectionItem = async (collectionName: string, id: string, data: any) => {
  if (!db) throw new Error("Database not connected");
  // FIX: Use compat API to save collection items
  await db.collection(collectionName).doc(id).set(data, { merge: true });
};

// Delete an item from a collection
export const deleteCollectionItem = async (collectionName: string, id: string) => {
  if (!db) throw new Error("Database not connected");
  // FIX: Use compat API to delete collection items
  await db.collection(collectionName).doc(id).delete();
};

// Seed function for initial setup
export const seedDatabase = async (initialData: AppData) => {
  if (!db) throw new Error("Database not connected");
  
  // 1. Save Settings
  await saveSettings('heroSlides', { slides: initialData.heroSlides });
  await saveSettings('about', initialData.about);
  await saveSettings('footer', initialData.footer);
  await saveSettings('processing', initialData.processingConfig);
  await saveSettings('license', initialData.license);
  await saveSettings('global', { 
    logoUrl: initialData.logoUrl, 
    faviconUrl: initialData.faviconUrl,
    version: initialData.version
  });

  // 2. Save Posts
  for (const post of initialData.posts) {
    await saveCollectionItem('posts', post.id, post);
  }

  // 3. Save Processing Posts
  for (const post of initialData.processingPosts) {
    await saveCollectionItem('processingPosts', post.id, post);
  }

  // FIX: Removed logic for 'weatherWidgets' as it does not exist on the AppData type.
};
