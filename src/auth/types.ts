// Browser wire shapes from the backend's versioned contracts/authentication.md.
// Credentials never appear in browser response types or page props.
export interface Account {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "BLOCKED" | "DELETED";
  createdAt: string;
}

export interface BrowserGrant {
  user: Account;
  accessExpiresAt: string;
  sessionExpiresAt: string;
}
