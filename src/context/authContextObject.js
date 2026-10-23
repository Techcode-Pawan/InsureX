import { createContext } from 'react'

// The auth context object lives in its own dependency-free module so it keeps the same identity
// when Vite hot-reloads AuthContext.jsx or the services it imports. If it were re-created on hot
// reload, already-mounted consumers would stop seeing the provider ("useAuth must be used within
// an AuthProvider") and the app would go blank until a manual refresh.
export const AuthContext = createContext(null)
