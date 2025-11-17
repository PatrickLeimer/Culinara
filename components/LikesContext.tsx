import React, { createContext, useContext, useState } from 'react';

export type RecipeLike = {
  id: string | number;
  name: string;
  desc?: string;
};

type LikesContextValue = {
  likes: RecipeLike[];
  like: (r: RecipeLike) => void;
  unlike: (id: string | number) => void;
  isLiked: (id: string | number) => boolean;
};

const LikesContext = createContext<LikesContextValue | undefined>(undefined);

export const LikesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [likes, setLikes] = useState<RecipeLike[]>([]);

  const like = (r: RecipeLike) => {
    setLikes((prev) => {
      if (prev.find((p) => p.id === r.id)) return prev;
      return [r, ...prev];
    });
  };

  const unlike = (id: string | number) => {
    setLikes((prev) => prev.filter((p) => p.id !== id));
  };

  const isLiked = (id: string | number) => likes.some((p) => p.id === id);

  return (
    <LikesContext.Provider value={{ likes, like, unlike, isLiked }}>{children}</LikesContext.Provider>
  );
};

export function useLikes() {
  const ctx = useContext(LikesContext);
  if (!ctx) throw new Error('useLikes must be used within LikesProvider');
  return ctx;
}
