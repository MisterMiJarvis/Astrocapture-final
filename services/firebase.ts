// Stub for Firebase services - original service not available
export async function uploadFile(file: File, path: string): Promise<string> {
  console.warn('Firebase uploadFile called but not configured');
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export function subscribeToCollection(collection: string, callback: (data: any[]) => void): () => void {
  console.warn('Firebase subscribeToCollection called but not configured for collection:', collection);
  callback([]);
  return () => {};
}

export async function saveCollectionItem(collection: string, id: string, data: any): Promise<void> {
  console.warn('Firebase saveCollectionItem called but not configured for collection:', collection);
}

export async function deleteCollectionItem(collection: string, id: string): Promise<void> {
  console.warn('Firebase deleteCollectionItem called but not configured for collection:', collection);
}
