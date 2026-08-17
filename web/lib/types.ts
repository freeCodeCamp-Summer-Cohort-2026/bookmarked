export type UserRole = "member" | "moderator";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface Reaction {
  id: string;
  emoji: string;
  user?: User;
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  description: string;
  tags: string[];
  createdAt: string;
  submittedBy?: User;
  reactions: Reaction[];
  confirmDuplicate?: boolean;
}

export interface AuthState {
  token: string;
  user: User;
}
