import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useFavorites(userId: string | null) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: err } = await supabase.from('favorites').select('title').eq('user_id', userId);
    if (err) {
      setError('Impossible de charger votre liste.');
    } else {
      setFavorites((data ?? []).map((row: { title: string }) => row.title));
      setError(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleFavorite = useCallback(
    async (title: string) => {
      if (!userId) {
        setError('Connectez-vous pour créer votre liste.');
        return;
      }

      const isFavorite = favorites.includes(title);
      setFavorites((current) => (isFavorite ? current.filter((item) => item !== title) : [...current, title]));

      const { error: err } = isFavorite
        ? await supabase.from('favorites').delete().eq('title', title).eq('user_id', userId)
        : await supabase.from('favorites').insert({ title });

      if (err) {
        setFavorites((current) => (isFavorite ? [...current, title] : current.filter((item) => item !== title)));
        setError("Impossible d'enregistrer ce titre.");
      } else {
        setError(null);
      }
    },
    [favorites, userId]
  );

  return { favorites, loading, error, toggleFavorite, refresh };
}
