'use client';

import { createContext, useContext } from 'react';

// Minimal stub for Supabase context - returns unauthenticated state
const SupabaseContext = createContext({
  supabase: null,
  user: null,
  loading: false,
});

export const useSupabase = () => useContext(SupabaseContext);
export default SupabaseContext;
