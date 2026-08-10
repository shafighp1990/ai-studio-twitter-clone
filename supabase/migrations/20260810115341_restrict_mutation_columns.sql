-- Row-level security limits which rows a user can reach. These grants also limit
-- which operations and columns the browser-facing Data API roles can use.

revoke all privileges on table
  public.profiles,
  public.posts,
  public.post_likes,
  public.reposts,
  public.bookmarks,
  public.follows,
  public.notifications
from anon, authenticated;

grant select on table
  public.profiles,
  public.posts,
  public.post_likes,
  public.reposts,
  public.follows
to anon;

grant select on table
  public.profiles,
  public.posts,
  public.post_likes,
  public.reposts,
  public.bookmarks,
  public.follows,
  public.notifications
to authenticated;

grant update (name, bio, location, website, avatar_url, banner_url)
  on table public.profiles to authenticated;

grant insert (author_id, content, image_url, reply_to_id)
  on table public.posts to authenticated;
grant delete on table public.posts to authenticated;
drop policy if exists "Authors update their own posts" on public.posts;

grant insert (post_id, user_id)
  on table public.post_likes to authenticated;
grant delete on table public.post_likes to authenticated;

drop policy if exists "Users create their own reposts" on public.reposts;
drop policy if exists "Users delete their own reposts" on public.reposts;

grant insert (post_id, user_id)
  on table public.bookmarks to authenticated;
grant delete on table public.bookmarks to authenticated;

grant insert (follower_id, following_id)
  on table public.follows to authenticated;
grant delete on table public.follows to authenticated;

grant update (read)
  on table public.notifications to authenticated;
drop policy if exists "Users delete their own notifications" on public.notifications;
