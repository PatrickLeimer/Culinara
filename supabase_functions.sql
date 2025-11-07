-- ============================================
-- SUPABASE FUNCTIONS AND TRIGGERS FOR CULINARA
-- ============================================

-- 1. Function to create user profile when new user signs up
-- This should be triggered on INSERT to auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, name, lastname)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'lastname'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user when a new user is created in auth.users
-- Note: This trigger needs to be created in the auth schema
-- You may need to create this via Supabase Dashboard or with proper permissions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FRIENDSHIP FUNCTIONS
-- ============================================

-- 2. Function to prevent duplicate friendships
-- This ensures users can't send multiple friend requests to the same person
CREATE OR REPLACE FUNCTION public.prevent_duplicate_friendships()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a friendship already exists (in any status) between these two users
  IF EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (
      (requester_id = NEW.requester_id AND addressee_id = NEW.addressee_id)
      OR
      (requester_id = NEW.addressee_id AND addressee_id = NEW.requester_id)
    )
  ) THEN
    RAISE EXCEPTION 'Friendship already exists between these users';
  END IF;
  
  -- Prevent users from sending friend requests to themselves
  IF NEW.requester_id = NEW.addressee_id THEN
    RAISE EXCEPTION 'Users cannot send friend requests to themselves';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent duplicate friendships
DROP TRIGGER IF EXISTS check_duplicate_friendships ON public.friendships;
CREATE TRIGGER check_duplicate_friendships
  BEFORE INSERT ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_friendships();

-- 3. Function to auto-update responded_at when status changes
CREATE OR REPLACE FUNCTION public.update_friendship_responded_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed from pending to accepted or rejected, set responded_at
  IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
    NEW.responded_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update responded_at
DROP TRIGGER IF EXISTS update_responded_at ON public.friendships;
CREATE TRIGGER update_responded_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_friendship_responded_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile and their friends' profiles
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can view profiles of their accepted friends
CREATE POLICY "Users can view friends' profiles"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = users.id)
        OR
        (addressee_id = auth.uid() AND requester_id = users.id)
      )
    )
  );

-- Enable RLS on friendships table
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view friendships they're involved in
CREATE POLICY "Users can view own friendships"
  ON public.friendships FOR SELECT
  USING (
    auth.uid() = requester_id OR auth.uid() = addressee_id
  );

-- Policy: Users can create friend requests (as requester)
CREATE POLICY "Users can create friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Policy: Users can update friendships where they are the addressee (to accept/reject)
CREATE POLICY "Users can respond to friend requests"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

-- ============================================
-- HELPER FUNCTIONS (Optional but useful)
-- ============================================

-- Function to get user's friends count
CREATE OR REPLACE FUNCTION public.get_friends_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.friendships
    WHERE status = 'accepted'
    AND (requester_id = user_uuid OR addressee_id = user_uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(user1_uuid UUID, user2_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = user1_uuid AND addressee_id = user2_uuid)
      OR
      (requester_id = user2_uuid AND addressee_id = user1_uuid)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

