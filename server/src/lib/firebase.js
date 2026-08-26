import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

let app = null;

export function getFirebaseApp() {
  if (app) return app;

  const hasCredentials =
    config.FIREBASE_PROJECT_ID &&
    config.FIREBASE_CLIENT_EMAIL &&
    config.FIREBASE_PRIVATE_KEY;

  if (!hasCredentials) {
    logger.warn('Firebase credentials missing (FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY)');
    return null;
  }

  app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: config.FIREBASE_PROJECT_ID,
          clientEmail: config.FIREBASE_CLIENT_EMAIL,
          privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        storageBucket: config.FIREBASE_STORAGE_BUCKET || undefined
      });

  return app;
}

export function getMessaging_() {
  const firebaseApp = getFirebaseApp();
  return firebaseApp ? getMessaging(firebaseApp) : null;
}

export function getBucket() {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp || !config.FIREBASE_STORAGE_BUCKET) return null;
  return getStorage(firebaseApp).bucket(config.FIREBASE_STORAGE_BUCKET);
}
