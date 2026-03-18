import { db, currentUser, doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where, serverTimestamp } from './firebase-config.js';

export async function saveStoryToFirestore(storyData, passwordHash) {
  if (!db) return null;
  const storyId = crypto.randomUUID();
  try {
    const isPublic = storyData.isPublic !== undefined ? storyData.isPublic : true;
    await setDoc(doc(db, 'stories', storyId), {
      ...storyData,
      passwordHash: passwordHash || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isPublic,
      ownerUid: currentUser?.uid || null,
    });
    return storyId;
  } catch (e) {
    console.error('Story save failed:', e);
    return null;
  }
}

export async function loadStoryFromFirestore(storyId) {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'stories', storyId));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error('Story load failed:', e);
    return null;
  }
}

export async function updateStoryInFirestore(storyId, storyData, passwordHash) {
  if (!db) return false;
  try {
    await updateDoc(doc(db, 'stories', storyId), {
      ...storyData,
      passwordHash,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.error('Story update failed:', e);
    return false;
  }
}

export async function loadPublicPresets() {
  if (!db) return [];
  try {
    const q = query(collection(db, 'presets'), where('isDefault', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Preset load failed:', e);
    return [];
  }
}
