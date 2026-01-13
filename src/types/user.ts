export type HierarchyLevel = 
  | "Nível 1"
  | "Nível 2"
  | "Nível 3"
  | "Nível 4"
  | "Nível 5";

export interface User {
  uid: string;
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