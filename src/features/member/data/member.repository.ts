import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getActiveDb } from '../../../firebase';
import type { Member, Service } from '../domain/member.types';

type MembersListener = (members: Member[]) => void;
type ServicesListener = (services: Service[]) => void;
type ErrorListener = (error: Error) => void;

function mapDocWithId<T extends Record<string, unknown>>(docData: Record<string, unknown>, id: string): T & { id: string } {
  return {
    id,
    ...(docData as T),
  };
}

export const memberRepository = {
  subscribeToMembers(churchId: string | undefined | null, onData: MembersListener, onError: ErrorListener): () => void {
    if (!churchId) return () => {};
    const membersQuery = query(collection(getActiveDb(), 'users'), where('churchId', '==', churchId));
    return onSnapshot(
      membersQuery,
      (snapshot) => {
        const members = snapshot.docs.map((docSnap) =>
          mapDocWithId<Member>(docSnap.data() as Record<string, unknown>, docSnap.id)
        );
        onData(members);
      },
      onError
    );
  },

  subscribeToServices(churchId: string | undefined | null, onData: ServicesListener, onError: ErrorListener): () => void {
    if (!churchId) return () => {};
    const servicesQuery = query(collection(getActiveDb(), 'services'), where('churchId', '==', churchId));
    return onSnapshot(
      servicesQuery,
      (snapshot) => {
        const services = snapshot.docs.map((docSnap) =>
          mapDocWithId<Service>(docSnap.data() as Record<string, unknown>, docSnap.id)
        );
        onData(services);
      },
      onError
    );
  },
};

