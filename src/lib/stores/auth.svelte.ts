// src/lib/stores/auth.svelte.ts
import { supabase } from '$lib/supabase';
import type { User } from '@supabase/supabase-js';

class AuthStore {
  user = $state<User | null>(null);
  loading = $state(true);

  constructor() {
    this.init();
  }

  async init() {
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    this.user = session?.user ?? null;
    this.loading = false;

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      this.user = session?.user ?? null;
    });
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  get isAuthenticated() {
    return !!this.user;
  }
}

export const authStore = new AuthStore();