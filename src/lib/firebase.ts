import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import {
  JournalEntry,
  ConversationSession,
  SavedSummary,
  SavedWeeklyInsight,
} from "../types";

// 1. Initialize Firebase App and Services
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// 2. Standardized Error Handling specification
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 3. Test Connection on Startup
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore client is offline. Verify network or credentials.");
      return false;
    }
    // Permission denied on /test/connection is normal and expected due to default-deny catch-all rule
    return true;
  }
}

// Run connection check in background
testConnection();

// 4. Data Access Layer (Strict path isolation: users/{uid}/...)

/**
 * Fetch all journals for the authenticated user
 */
export async function fetchUserJournals(uid: string): Promise<JournalEntry[]> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Unauthorized: Identity mismatch. Access denied.");
  }
  const path = `users/${uid}/journals`;
  try {
    const q = query(collection(db, path), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const results: JournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      results.push(docSnap.data() as JournalEntry);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Save or update a journal entry
 */
export async function saveJournalEntry(
  uid: string,
  entry: JournalEntry
): Promise<void> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Unauthorized: Identity mismatch. Access denied.");
  }
  const path = `users/${uid}/journals/${entry.id}`;
  try {
    await setDoc(doc(db, "users", uid, "journals", entry.id), {
      ...entry,
      userId: uid, // Enforce server/auth UID ownership
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Update user notes on a journal entry
 */
export async function updateJournalNotes(
  uid: string,
  journalId: string,
  userNotes: string
): Promise<void> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Unauthorized: Identity mismatch. Access denied.");
  }
  const path = `users/${uid}/journals/${journalId}`;
  try {
    const docRef = doc(db, "users", uid, "journals", journalId);
    await updateDoc(docRef, {
      userNotes,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Update title and user notes on a journal entry
 */
export async function updateJournalTitleAndNotes(
  uid: string,
  journalId: string,
  title: string,
  userNotes: string
): Promise<void> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Unauthorized: Identity mismatch. Access denied.");
  }
  const path = `users/${uid}/journals/${journalId}`;
  try {
    const docRef = doc(db, "users", uid, "journals", journalId);
    await updateDoc(docRef, {
      title: title.trim(),
      userNotes: userNotes.trim(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete a specific journal entry
 */
export async function deleteJournalEntry(
  uid: string,
  journalId: string
): Promise<void> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Unauthorized: Identity mismatch. Access denied.");
  }
  const path = `users/${uid}/journals/${journalId}`;
  try {
    await deleteDoc(doc(db, "users", uid, "journals", journalId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Delete all journals and data for the user
 */
export async function deleteAllUserData(uid: string): Promise<number> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Unauthorized: Identity mismatch. Access denied.");
  }
  let deletedCount = 0;
  try {
    // Delete journals
    const journalsPath = `users/${uid}/journals`;
    const jSnap = await getDocs(collection(db, journalsPath));
    for (const docSnap of jSnap.docs) {
      await deleteDoc(docSnap.ref);
      deletedCount++;
    }

    // Delete conversations
    const convsPath = `users/${uid}/conversations`;
    const cSnap = await getDocs(collection(db, convsPath));
    for (const docSnap of cSnap.docs) {
      await deleteDoc(docSnap.ref);
      deletedCount++;
    }

    // Delete summaries
    const summariesPath = `users/${uid}/summaries`;
    const sSnap = await getDocs(collection(db, summariesPath));
    for (const docSnap of sSnap.docs) {
      await deleteDoc(docSnap.ref);
      deletedCount++;
    }

    // Delete weekly insights
    const insightsPath = `users/${uid}/weeklyInsights`;
    const wSnap = await getDocs(collection(db, insightsPath));
    for (const docSnap of wSnap.docs) {
      await deleteDoc(docSnap.ref);
      deletedCount++;
    }

    return deletedCount;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
}

/**
 * Save an executive summary to Firestore
 */
export async function saveSummary(
  uid: string,
  summary: SavedSummary
): Promise<void> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Unauthorized: Identity mismatch. Access denied.");
  }
  const path = `users/${uid}/summaries/${summary.id}`;
  try {
    await setDoc(doc(db, "users", uid, "summaries", summary.id), {
      ...summary,
      userId: uid,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch all summaries for user
 */
export async function fetchUserSummaries(
  uid: string
): Promise<SavedSummary[]> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Unauthorized: Identity mismatch. Access denied.");
  }
  const path = `users/${uid}/summaries`;
  try {
    const q = query(collection(db, path), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const results: SavedSummary[] = [];
    snapshot.forEach((docSnap) => {
      results.push(docSnap.data() as SavedSummary);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Save weekly life intelligence to Firestore
 */
export async function saveWeeklyInsight(
  uid: string,
  insight: SavedWeeklyInsight
): Promise<void> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Unauthorized: Identity mismatch. Access denied.");
  }
  const path = `users/${uid}/weeklyInsights/${insight.id}`;
  try {
    await setDoc(doc(db, "users", uid, "weeklyInsights", insight.id), {
      ...insight,
      userId: uid,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch all weekly insights for user
 */
export async function fetchUserWeeklyInsights(
  uid: string
): Promise<SavedWeeklyInsight[]> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Unauthorized: Identity mismatch. Access denied.");
  }
  const path = `users/${uid}/weeklyInsights`;
  try {
    const q = query(collection(db, path), orderBy("generatedAt", "desc"));
    const snapshot = await getDocs(q);
    const results: SavedWeeklyInsight[] = [];
    snapshot.forEach((docSnap) => {
      results.push(docSnap.data() as SavedWeeklyInsight);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Save active conversation session
 */
export async function saveConversationSession(
  uid: string,
  session: ConversationSession
): Promise<void> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Unauthorized: Identity mismatch. Access denied.");
  }
  const path = `users/${uid}/conversations/${session.id}`;
  try {
    await setDoc(doc(db, "users", uid, "conversations", session.id), {
      ...session,
      userId: uid,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch all conversation sessions for user
 */
export async function fetchUserConversations(
  uid: string
): Promise<ConversationSession[]> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Unauthorized: Identity mismatch. Access denied.");
  }
  const path = `users/${uid}/conversations`;
  try {
    const q = query(collection(db, path), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const results: ConversationSession[] = [];
    snapshot.forEach((docSnap) => {
      results.push(docSnap.data() as ConversationSession);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Delete a conversation session
 */
export async function deleteConversationSession(
  uid: string,
  conversationId: string
): Promise<void> {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error("Unauthorized: Identity mismatch. Access denied.");
  }
  const path = `users/${uid}/conversations/${conversationId}`;
  try {
    await deleteDoc(doc(db, "users", uid, "conversations", conversationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export { signInWithPopup, signOut };
export type { User };
