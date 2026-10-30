import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { historyCol, householdRef, itemsCol, listsCol, Me } from './api';
import { firebaseAuth } from './firebase';
import type { HistoryEntry, Household, Item, ShoppingList } from './types';

const PROFILE_KEY = 'shoppal:profile:v1';
const ACTIVE_LIST_KEY = 'shoppal:activeList:v1';

/** What this phone remembers locally: who I am and which household I'm in. */
export interface Profile {
  name: string;
  code: string | null;
}

interface Session {
  ready: boolean;
  uid: string | null;
  profile: Profile | null;
  me: Me | null;
  household: Household | null;
  lists: ShoppingList[];
  items: Item[];
  history: HistoryEntry[];
  error: string | null;
  activeListId: string | null;
  setActiveListId: (id: string) => void;
  saveProfile: (p: Profile) => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeListId, setActiveListIdState] = useState<string | null>(null);

  // Anonymous sign-in: the uid is what Firestore rules use to recognise household members.
  useEffect(() => {
    const auth = firebaseAuth();
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        setAuthReady(true);
      } else {
        signInAnonymously(auth).catch((e) => {
          setError(`Prijava nije uspjela: ${e instanceof Error ? e.message : String(e)}`);
          setAuthReady(true);
        });
      }
    });
  }, []);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(PROFILE_KEY), AsyncStorage.getItem(ACTIVE_LIST_KEY)])
      .then(([p, l]) => {
        if (p) setProfile(JSON.parse(p));
        if (l) setActiveListIdState(l);
      })
      .catch(() => {})
      .finally(() => setProfileLoaded(true));
  }, []);

  const saveProfile = useCallback(async (p: Profile) => {
    setProfile(p);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  }, []);

  const setActiveListId = useCallback((id: string) => {
    setActiveListIdState(id);
    AsyncStorage.setItem(ACTIVE_LIST_KEY, id).catch(() => {});
  }, []);

  const code = profile?.code ?? null;

  // Live subscriptions to everything in the household.
  useEffect(() => {
    if (!code || !uid) {
      setHousehold(null);
      setLists([]);
      setItems([]);
      setHistory([]);
      return;
    }
    const fail = (e: Error) => setError(`Sinkronizacija nije uspjela: ${e.message}`);
    const unsubs = [
      onSnapshot(
        householdRef(code),
        (snap) => {
          const data = snap.data() as Omit<Household, 'code'> | undefined;
          if (!data || !data.members?.[uid]) {
            // Removed from the household (or it no longer exists): back to onboarding.
            setHousehold(null);
            if (profile) saveProfile({ ...profile, code: null });
            return;
          }
          setError(null);
          setHousehold({ ...data, code });
        },
        fail,
      ),
      onSnapshot(query(listsCol(code), orderBy('order')), (snap) => {
        setLists(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ShoppingList, 'id'>) })));
      }, fail),
      onSnapshot(itemsCol(code), (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Item, 'id'>) })));
      }, fail),
      onSnapshot(historyCol(code), (snap) => {
        setHistory(snap.docs.map((d) => ({ key: d.id, ...(d.data() as Omit<HistoryEntry, 'key'>) })));
      }, fail),
    ];
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, uid]);

  // Fall back to the first list when the remembered one is gone.
  useEffect(() => {
    if (lists.length && !lists.some((l) => l.id === activeListId)) setActiveListIdState(lists[0].id);
  }, [lists, activeListId]);

  const me = useMemo(() => (uid && profile ? { uid, name: profile.name } : null), [uid, profile]);

  const value = useMemo<Session>(
    () => ({
      ready: authReady && profileLoaded,
      uid,
      profile,
      me,
      household,
      lists,
      items,
      history,
      error,
      activeListId,
      setActiveListId,
      saveProfile,
    }),
    [authReady, profileLoaded, uid, profile, me, household, lists, items, history, error, activeListId, setActiveListId, saveProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession must be used inside SessionProvider');
  return s;
}

/** For screens shown only once the user is in a household. */
export function useHousehold() {
  const s = useSession();
  if (!s.me || !s.profile?.code) throw new Error('Not in a household');
  return { ...s, me: s.me, code: s.profile.code };
}
