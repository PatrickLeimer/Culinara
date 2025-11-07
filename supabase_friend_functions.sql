-- ============================================
-- FRIEND-RELATED DATABASE FUNCTIONS FOR CULINARA
-- ============================================

-- Function to get all accepted friends with expanded user information
-- This function returns friends where the current user is either requester or addressee
-- and the friendship status is 'accepted'
-- Matches schema: friendships.id is int8 (bigint), users table structure
CREATE OR REPLACE FUNCTION public.my_friends_expanded()
RETURNS TABLE (
  friendship_id BIGINT,
  friend_id UUID,
  friend_username TEXT,
  friend_name TEXT,
  friend_email TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id AS friendship_id,
    CASE 
      WHEN f.requester_id = auth.uid() THEN f.addressee_id
      ELSE f.requester_id
    END AS friend_id,
    u.username AS friend_username,
    CASE 
      WHEN u.name IS NOT NULL AND u.lastname IS NOT NULL AND u.name != '' AND u.lastname != '' 
        THEN TRIM(u.name || ' ' || u.lastname)
      WHEN u.name IS NOT NULL AND u.name != '' 
        THEN u.name
      WHEN u.lastname IS NOT NULL AND u.lastname != '' 
        THEN u.lastname
      ELSE NULL
    END AS friend_name,
    u.email AS friend_email,
    f.created_at
  FROM public.friendships f
  INNER JOIN public.users u ON (
    (f.requester_id = auth.uid() AND u.id = f.addressee_id)
    OR
    (f.addressee_id = auth.uid() AND u.id = f.requester_id)
  )
  WHERE f.status = 'accepted'
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  ORDER BY f.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.my_friends_expanded() TO authenticated;

