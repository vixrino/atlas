"use client";

import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";
import { subscribeToProfile } from "./profiles";
import type { Profile } from "./types";

export function useAuth() {
  // Without Firebase there is no one to wait for, so start signed out rather
  // than loading forever.
  const [user, setUser] = useState<User | null | undefined>(
    isFirebaseConfigured ? undefined : null,
  );

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth, setUser);
  }, []);

  return {
    user,
    loading: user === undefined,
  };
}

/** Auth user + their profile (null if signed in but no username yet). */
export function useAuthProfile() {
  const { user, loading: authLoading } = useAuth();
  // Keyed by uid so a profile from a previous account is never shown for the
  // next one: until the new snapshot lands, the profile reads as loading.
  const [snapshot, setSnapshot] = useState<{
    uid: string;
    profile: Profile | null;
  } | null>(null);

  const uid = user?.uid;
  useEffect(() => {
    if (authLoading || !uid) return;
    return subscribeToProfile(uid, (profile) => setSnapshot({ uid, profile }));
  }, [uid, authLoading]);

  const profile: Profile | null | undefined = authLoading
    ? undefined
    : !user
      ? null
      : snapshot?.uid === user.uid
        ? snapshot.profile
        : undefined;

  return {
    user,
    profile,
    loading: authLoading || (Boolean(user) && profile === undefined),
    needsUsername: Boolean(user && profile === null),
  };
}

/** Google creates the Firebase Auth account automatically on first use. */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  /**
   * The popup backgrounds this tab, so Firebase's default IndexedDB persistence
   * closes its connection and rejects the write-back with "Database is
   * closing/hidden". localStorage has no such page-lifecycle handling.
   */
  await setPersistence(auth, browserLocalPersistence);

  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

/** Turn Firebase auth failures into something the user can act on. */
export function describeAuthError(err: unknown, fallback: string) {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/popup-blocked":
      return "Your browser blocked the popup. Allow popups for this site, then try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "The Google window closed before finishing. Try again.";
    case "auth/unauthorized-domain":
      return "This domain isn’t listed under Firebase Auth → Settings → Authorized domains.";
    case "auth/operation-not-allowed":
      return "Enable Google as a sign-in provider in the Firebase console.";
    case "auth/network-request-failed":
      return "Couldn’t reach Firebase. Check your connection and try again.";
    default:
      break;
  }

  if (err instanceof Error && err.message.includes("closing/hidden")) {
    return "Sign-in was interrupted while the tab was in the background. Try again.";
  }
  return err instanceof Error && err.message ? err.message : fallback;
}

export async function signOut() {
  return firebaseSignOut(auth);
}
