/**
 * File storage service — Firebase Storage when configured, otherwise
 * returns a base64 data URL so the app still works locally.
 */
import { storage, isFirebaseConfigured } from "@/config/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

async function fileToDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function compressImage(file: File, max = 512, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob | null = await new Promise((res) =>
    canvas.toBlob((b) => res(b), file.type === "image/png" ? "image/png" : "image/jpeg", quality)
  );
  return blob || file;
}

export const storageService = {
  isRemote: isFirebaseConfigured,

  /** Upload a file and return its accessible URL. */
  async upload(path: string, file: File, opts?: { compress?: boolean; maxSize?: number }): Promise<string> {
    const finalFile: Blob = opts?.compress ? await compressImage(file, opts.maxSize || 512) : file;
    if (isFirebaseConfigured && storage) {
      const r = ref(storage, path);
      await uploadBytes(r, finalFile, { contentType: file.type });
      return await getDownloadURL(r);
    }
    // Fallback — inline base64 data URL
    return await fileToDataURL(finalFile);
  },

  async remove(pathOrUrl: string): Promise<void> {
    if (!pathOrUrl) return;
    if (isFirebaseConfigured && storage && !pathOrUrl.startsWith("data:")) {
      try {
        const r = ref(storage, pathOrUrl);
        await deleteObject(r);
      } catch { /* file may not exist */ }
    }
    // For data URLs, nothing to delete (they live in Firestore user record).
  },

  async uploadAvatar(uid: string, file: File): Promise<string> {
    return this.upload(`avatars/${uid}/${Date.now()}_${file.name}`, file, { compress: true, maxSize: 400 });
  },

  async uploadChatAttachment(chatId: string, file: File): Promise<string> {
    const isImage = file.type.startsWith("image/");
    return this.upload(`chat/${chatId}/${Date.now()}_${file.name}`, file, { compress: isImage, maxSize: 1200 });
  },

  async uploadNotificationImage(file: File): Promise<string> {
    return this.upload(`notifications/${Date.now()}_${file.name}`, file, { compress: true, maxSize: 800 });
  },
};
