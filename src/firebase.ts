import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const authProvider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, authProvider);
    return result.user;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out:", error);
  }
}

export async function saveProgress(userId: string, completedTopics: Record<string, boolean>, scoreByTopic: Record<string, number>) {
  try {
    const progressRef = doc(db, 'userProgress', userId);
    const snap = await getDoc(progressRef);
    
    if (snap.exists()) {
      await updateDoc(progressRef, {
        completedTopics,
        scoreByTopic,
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(progressRef, {
        completedTopics,
        scoreByTopic,
        updatedAt: serverTimestamp()
      });
    }
  } catch (err: any) {
    console.error("Firestore Error Saving Progress:", JSON.stringify({
      error: err.message,
      operationType: 'write',
      path: `userProgress/${userId}`,
      authInfo: { uid: auth.currentUser?.uid }
    }));
  }
}

export async function loadProgress(userId: string) {
  try {
    const progressRef = doc(db, 'userProgress', userId);
    const snap = await getDoc(progressRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err: any) {
    console.error("Firestore Error Loading Progress:", JSON.stringify({
      error: err.message,
      operationType: 'read',
      path: `userProgress/${userId}`,
      authInfo: { uid: auth.currentUser?.uid }
    }));
    return null;
  }
}
