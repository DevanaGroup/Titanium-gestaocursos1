export type HierarchyLevel = 
  | "Nível 0"
  | "Nível 1"
  | "Nível 2"
  | "Nível 3"
  | "Nível 4"
  | "Nível 5"
  | "Nível 6";

export interface User {
  uid: string;
  /** Firebase Auth UID - use para impersonation quando disponível */
  firebaseUid?: string;
  email: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  hierarchyLevel: HierarchyLevel;
  photoURL: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserData {
  name: string;
  role: HierarchyLevel;
  avatar: string;
} 