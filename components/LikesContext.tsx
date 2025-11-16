import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type RecipeLike = {
  id: string; // id of the like row
  recipe_id: string;
  name?: string;
  description?: string;
  desc?: string; // kept for compatibility with existing UI
  created_at?: string;
};

type LikesContextValue = {
  likes: RecipeLike[];
  like: (payload: { recipe_id: string }) => Promise<void>;
  unlike: (recipe_id: string) => Promise<void>;
  isLiked: (recipe_id: string) => boolean;
  refresh: () => Promise<void>;
};

const LikesContext = createContext<LikesContextValue | undefined>(undefined);

export const LikesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [likes, setLikes] = useState<RecipeLike[]>([]);

  // Load likes for the current user
  const loadLikes = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLikes([]);
        return;
      }

      // old table name uses capital letters: Recipe_Likes
      const { data, error } = await supabase
        .from('Recipe_Likes')
        .select('id, recipe_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Common reason: table not created yet. Provide a helpful hint instead of noisy stack.
        const msg = String(error.message || error);
        if (/relation .*recipe_likes.*does not exist/i.test(msg) || /unknown table/i.test(msg)) {
          console.warn('Recipe likes table not found in Supabase. Run the SQL migration in supabase_functions.sql to create `Recipe_Likes`.');
        } else {
          console.error('Error loading likes from Supabase:', error);
        }
        // Fail gracefully with empty likes
        setLikes([]);
        return;
      }

      // Map DB rows to include `desc` for compatibility with UI that expects `desc`.
      const mapped = (data ?? []).map((r: any) => ({ ...r })) as RecipeLike[];
      setLikes(mapped);
    } catch (e) {
      console.error('Unexpected error loading likes:', e);
      // In case of unexpected runtime issues, keep app usable
      setLikes([]);
    }
  };

  useEffect(() => {
    // load likes on mount and whenever auth state changes
    loadLikes();

    // subscribe to auth changes to reload likes
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      loadLikes();
    });

    return () => {
      try {
        subscription?.subscription?.unsubscribe();
      } catch (err) {
        // ignore
      }
    };
  }, []);

  // Like a recipe (uses RPC to respect RLS)
  const like = async (payload: { recipe_id: string }) => {
    const { recipe_id } = payload;

    // optimistic update: add a temporary local entry
    if (likes.find((l) => l.recipe_id === recipe_id)) return;
    const temp: RecipeLike = {
      id: `temp-${recipe_id}-${Date.now()}`,
      recipe_id,
      created_at: new Date().toISOString(),
    };
    setLikes((s) => [temp, ...s]);

    try {
      // Validate recipe_id is a UUID before attempting to insert into a UUID FK column.
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipe_id);
      if (!isUuid) {
        console.warn(`Not persisting like: recipe_id "${recipe_id}" is not a valid UUID.`);
        // keep the optimistic local like only
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert directly into the old table name
      const { error: insertError } = await supabase.from('Recipe_Likes').insert({ user_id: user.id, recipe_id });
      if (insertError) throw insertError;

      await loadLikes();
    } catch (e) {
      console.error('Error liking recipe', e);
      // rollback optimistic update
      setLikes((s) => s.filter((l) => l.id !== temp.id));
    }
  };

  // Unlike a recipe
  const unlike = async (recipe_id: string) => {
    // optimistic remove
    const prev = likes;
    setLikes((s) => s.filter((l) => l.recipe_id !== recipe_id));

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipe_id);
      if (!isUuid) {
        console.warn(`Not persisting unlike: recipe_id "${recipe_id}" is not a valid UUID.`);
        // local state already updated, nothing more to do
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: delError } = await supabase
        .from('Recipe_Likes')
        .delete()
        .eq('user_id', user.id)
        .eq('recipe_id', recipe_id);
      if (delError) throw delError;

      await loadLikes();
    } catch (e) {
      console.error('Error unliking recipe', e);
      // rollback
      setLikes(prev);
    }
  };

  const isLiked = (recipe_id: string) => likes.some((l) => l.recipe_id === recipe_id);

  return (
    <LikesContext.Provider value={{ likes, like, unlike, isLiked, refresh: loadLikes }}>{children}</LikesContext.Provider>
  );
};

export function useLikes() {
  const ctx = useContext(LikesContext);
  if (!ctx) throw new Error('useLikes must be used within LikesProvider');
  return ctx;
}
