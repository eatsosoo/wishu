import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createEmptySnapshot } from '../services/empty-snapshot';
import { privatePreparations } from '../services/wish-actions';
import { partnerName, personalizePartnerText } from '../features/couple/selectors';
import { cloudCommand, deleteCloudAccount, loadCloudCouple, supabase, type CloudCouple } from '../services/cloud';
import type { CheckInInput, CompletionInput, WishSnapshot, PersonId, WishCommand, WishInput, PersonalProfileInput } from '../types/domain';
import { completeProfile, readProfile } from '../features/auth/profile';

function useStoreValue() {
  const [snapshot, setSnapshot] = useState(createEmptySnapshot);
  const snapshotRevision = useRef(0);
  const [actor, setActor] = useState<PersonId>('minh');
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [cloudCouple, setCloudCouple] = useState<CloudCouple | null>(null);
  const [storageError, setStorageError] = useState(supabase ? '' : 'Chưa cấu hình kết nối Supabase.');
  const commands = useRef(Promise.resolve(true));
  const generation = useRef(0);
  const deletingAccount = useRef(false);
  const apply = useCallback((next: WishSnapshot) => { snapshotRevision.current++; setSnapshot(next); }, []);
  const applyCloud = useCallback((next: CloudCouple) => {
    setCloudCouple(next); setActor(next.actor); apply(next.snapshot);
  }, [apply]);
  const refresh = useCallback(async () => {
    if (deletingAccount.current) return;
    const revision = generation.current;
    const startedAt = snapshotRevision.current;
    let userId = sessionRef.current?.user.id ?? null;
    try {
      const current = await supabase?.auth.getSession();
      if (current?.error) throw current.error;
      userId = current?.data.session?.user.id ?? null;
      let next = await loadCloudCouple();
      if (generation.current !== revision || snapshotRevision.current !== startedAt) return;
      if (next && supabase) {
        const loadedActor = next.actor;
        const member = next.snapshot.couple.members.find(item => item.id === loadedActor);
        const profile = current?.data.session?.user.user_metadata.initialProfile;
        if (!completeProfile(member) && completeProfile(profile)) {
          try { next = await cloudCommand({ kind: 'personalProfile', input: profile }); }
          catch { setStorageError('Chưa đồng bộ được thông tin cá nhân. Bạn thử lưu lại nhé.'); }
        }
      }
      if (generation.current !== revision || snapshotRevision.current !== startedAt) return;
      if (next) applyCloud(next);
      else { setCloudCouple(null); apply(createEmptySnapshot()); }
    } catch { if (generation.current === revision) setStorageError('Chưa đồng bộ được với người ấy. Bạn kiểm tra kết nối nhé.'); }
    finally { if (generation.current === revision) setProfileUserId(userId); }
  }, [applyCloud, apply]);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const onboardedValue = await AsyncStorage.getItem('ourwish:onboarded');
        if (!active) return;
        setOnboarded(onboardedValue === 'yes');
        if (supabase) {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!active) return;
          sessionRef.current = data.session;
          setSession(data.session); setSignedIn(!!data.session);
          if (data.session) await refresh();
        }
      } catch { if (active) setStorageError('Chưa đọc được dữ liệu đã lưu. Bạn thử lại nhé.'); }
      finally { if (active) setReady(true); }
    }
    void restore();
    const listener = supabase?.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      if (sessionRef.current?.user.id !== next?.user.id) {
        generation.current++; setProfileUserId(null); setCloudCouple(null); apply(createEmptySnapshot());
      }
      sessionRef.current = next;
      setSession(next); setSignedIn(!!next);
      if (!next) { generation.current++; setProfileUserId(null); setCloudCouple(null); apply(createEmptySnapshot()); }
    });
    return () => { active = false; listener?.data.subscription.unsubscribe(); };
  }, [apply, refresh]);

  useEffect(() => {
    if (!supabase || !session) return;
    const client = supabase;
    void Promise.resolve().then(refresh);
    const channel = client.channel(`gifts:${session.user.id}`).on('postgres_changes', {
      event: '*', schema: 'public', table: 'gift_notifications', filter: `recipient_id=eq.${session.user.id}`,
    }, () => void refresh()).subscribe();
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') { client.auth.startAutoRefresh(); void refresh(); }
      else client.auth.stopAutoRefresh();
    });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 15000);
    return () => { clearInterval(timer); foreground.remove(); void client.removeChannel(channel); };
  }, [session, refresh]);

  async function finishOnboarding() {
    try { await AsyncStorage.setItem('ourwish:onboarded', 'yes'); } catch { setStorageError('Không thể ghi nhớ màn chào trên thiết bị này.'); }
    setOnboarded(true);
  }
  async function logout() {
    try {
      if (supabase) {
        const { unregisterPush } = await import('../services/push');
        await unregisterPush();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      generation.current++; setSignedIn(false); setActor('minh'); setCloudCouple(null);
      apply(createEmptySnapshot());
    } catch { setStorageError('Chưa đăng xuất được. Bạn thử lại nhé.'); }
  }
  async function deleteAccount() {
    if (deletingAccount.current) throw new Error('Tài khoản đang được xoá.');
    deletingAccount.current = true;
    generation.current++;
    try {
      await commands.current;
      await deleteCloudAccount();
      // The user no longer exists: local cleanup must not depend on a remote logout.
      try { await supabase?.auth.signOut({ scope: 'local' }); }
      catch { /* Account deletion already succeeded; clear the in-memory session below. */ }
      finally {
        generation.current++; sessionRef.current = null; setSession(null); setSignedIn(false); setActor('minh');
        setCloudCouple(null); apply(createEmptySnapshot()); setStorageError('');
      }
      await AsyncStorage.removeItem('ourwish:push-token').catch(() => {});
    } finally { deletingAccount.current = false; }
  }
  function dispatch(command: WishCommand): Promise<boolean> {
    if (deletingAccount.current) return Promise.resolve(false);
    const revision = generation.current;
    const result = commands.current.then(async () => {
      if (generation.current !== revision) return false;
      try {
        setStorageError('');
        const next = await cloudCommand(command);
        if (generation.current !== revision) return false;
        applyCloud(next);
        setStorageError(''); return true;
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : 'Chưa lưu được thay đổi. Bạn thử lại nhé.');
        return false;
      }
    });
    commands.current = result;
    return result;
  }
  const partner = partnerName(snapshot.couple, actor);
  const personalProfile = readProfile(cloudCouple
    ? snapshot.couple.members.find(item => item.id === actor)
    : session?.user.user_metadata.initialProfile);
  async function saveInitialProfile(input: PersonalProfileInput) {
    if (!supabase || !completeProfile(input)) return false;
    if (cloudCouple) return dispatch({ kind: 'personalProfile', input });
    const revision = generation.current;
    try {
      setStorageError('');
      const { data, error } = await supabase.auth.updateUser({ data: { initialProfile: input } });
      if (error) throw error;
      if (revision !== generation.current) return false;
      if (sessionRef.current?.user.id === data.user.id) sessionRef.current = { ...sessionRef.current, user: data.user };
      setSession(current => current && data.user.id === current.user.id ? { ...current, user: data.user } : current);
      setStorageError('');
      return true;
    } catch { setStorageError('Chưa lưu được thông tin cá nhân. Bạn thử lại nhé.'); return false; }
  }
  return {
    ...snapshot, actor, ready, onboarded, signedIn, finishOnboarding, logout, deleteAccount,
    checkIns: snapshot.checkIns ?? [],
    saveCheckIn: (input: CheckInInput) => dispatch({ kind: 'checkIn', input }),
    deleteCheckIn: (id: string) => dispatch({ kind: 'deleteCheckIn', id }),
    partnerName: partner,
    personalProfile, profileComplete: completeProfile(personalProfile), saveInitialProfile,
    accountReady: !session || profileUserId === session.user.id,
    storageError: personalizePartnerText(storageError, partner),
    cloudEnabled: !!supabase, paired: !!cloudCouple, cloudCouple, session, refresh,
    preparations: privatePreparations(snapshot, actor),
    notifications: snapshot.notifications.filter(item => item.recipient === actor),
    addWish: (input: WishInput) => dispatch({ kind: 'add', input }),
    setWishActive: (id: string, active: boolean) => dispatch({ kind: 'wishActive', id, active }),
    updatePersonalProfile: (input: PersonalProfileInput) => dispatch({ kind: 'personalProfile', input }),
    prepareWish: (id: string) => dispatch({ kind: 'prepare', id }),
    deleteWish: (id: string) => dispatch({ kind: 'delete', id }),
    completeWish: (input: CompletionInput) => dispatch({ kind: 'complete', input }),
    markGiftRead: (id: string) => dispatch({ kind: 'read', id }),
    toggleWishFavorite: (id: string) => dispatch({ kind: 'wishFavorite', id }),
    toggleMemoryFavorite: (id: string) => dispatch({ kind: 'memoryFavorite', id }),
    updateCouple: (name: string, anniversaryDate: string) => dispatch({ kind: 'couple', name, anniversaryDate }),
  };
}
const StoreContext = createContext<ReturnType<typeof useStoreValue> | null>(null);
export function WishStoreProvider({ children }: { children: ReactNode }) {
  return <StoreContext.Provider value={useStoreValue()}>{children}</StoreContext.Provider>;
}
export function useWishStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('WishStoreProvider is required.');
  return store;
}
