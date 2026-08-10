create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  name text not null,
  bio text not null default '',
  location text not null default '',
  website text not null default '',
  avatar_url text,
  banner_url text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username = lower(username)
    and username ~ '^[a-z0-9_]{3,30}$'
  ),
  constraint profiles_name_length check (char_length(name) between 1 and 50),
  constraint profiles_bio_length check (char_length(bio) <= 160)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_url text,
  reply_to_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_content_length check (
    char_length(btrim(content)) between 1 and 280
  )
);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.reposts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  type text not null check (type in ('like', 'reply', 'repost', 'follow')),
  read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notifications_not_self check (recipient_id <> actor_id)
);

create unique index notifications_post_action_unique
  on public.notifications (recipient_id, actor_id, post_id, type)
  where post_id is not null;

create unique index notifications_follow_unique
  on public.notifications (recipient_id, actor_id, type)
  where post_id is null and type = 'follow';

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_author_created_idx on public.posts (author_id, created_at desc);
create index posts_reply_to_idx on public.posts (reply_to_id) where reply_to_id is not null;
create index post_likes_user_idx on public.post_likes (user_id, created_at desc);
create index reposts_user_idx on public.reposts (user_id, created_at desc);
create index bookmarks_user_idx on public.bookmarks (user_id, created_at desc);
create index follows_following_idx on public.follows (following_id, created_at desc);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger posts_set_updated_at
before update on public.posts
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
  final_username text;
  display_name text;
begin
  requested_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'user'),
    '[^a-z0-9_]', '', 'g'
  ));

  if char_length(requested_username) < 3 then
    requested_username := 'user_' || substring(new.id::text, 1, 8);
  end if;

  requested_username := left(requested_username, 30);
  final_username := requested_username;

  if exists (select 1 from public.profiles where username = final_username) then
    final_username := left(requested_username, 21) || '_' || substring(new.id::text, 1, 8);
  end if;

  display_name := left(
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), final_username),
    50
  );

  insert into public.profiles (id, username, name)
  values (new.id, final_username, display_name);

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.create_social_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_recipient uuid;
  target_post uuid;
  notification_type text;
  notification_actor uuid;
begin
  if tg_table_name = 'post_likes' then
    select author_id into target_recipient from public.posts where id = new.post_id;
    target_post := new.post_id;
    notification_type := 'like';
    notification_actor := new.user_id;
  elsif tg_table_name = 'reposts' then
    select author_id into target_recipient from public.posts where id = new.post_id;
    target_post := new.post_id;
    notification_type := 'repost';
    notification_actor := new.user_id;
  elsif tg_table_name = 'posts' and new.reply_to_id is not null then
    select author_id into target_recipient from public.posts where id = new.reply_to_id;
    target_post := new.reply_to_id;
    notification_type := 'reply';
    notification_actor := new.author_id;
  elsif tg_table_name = 'follows' then
    target_recipient := new.following_id;
    target_post := null;
    notification_type := 'follow';
    notification_actor := new.follower_id;
  else
    return new;
  end if;

  if target_recipient is not null and target_recipient <> notification_actor then
    insert into public.notifications (recipient_id, actor_id, post_id, type)
    values (
      target_recipient,
      notification_actor,
      target_post,
      notification_type
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.create_social_notification() from public, anon, authenticated;

create trigger notify_on_like
after insert on public.post_likes
for each row execute function private.create_social_notification();

create trigger notify_on_repost
after insert on public.reposts
for each row execute function private.create_social_notification();

create trigger notify_on_reply
after insert on public.posts
for each row execute function private.create_social_notification();

create trigger notify_on_follow
after insert on public.follows
for each row execute function private.create_social_notification();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.reposts enable row level security;
alter table public.bookmarks enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.posts, public.post_likes, public.reposts, public.follows to anon, authenticated;
grant insert, update, delete on public.profiles, public.posts, public.post_likes, public.reposts, public.follows to authenticated;
grant select, insert, delete on public.bookmarks to authenticated;
grant select, update, delete on public.notifications to authenticated;

create policy "Public profiles are visible"
on public.profiles for select
to anon, authenticated
using (true);

create policy "Users update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Posts are publicly visible"
on public.posts for select
to anon, authenticated
using (true);

create policy "Authenticated users create their own posts"
on public.posts for insert
to authenticated
with check ((select auth.uid()) = author_id);

create policy "Authors update their own posts"
on public.posts for update
to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);

create policy "Authors delete their own posts"
on public.posts for delete
to authenticated
using ((select auth.uid()) = author_id);

create policy "Likes are publicly visible"
on public.post_likes for select
to anon, authenticated
using (true);

create policy "Users create their own likes"
on public.post_likes for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users delete their own likes"
on public.post_likes for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Reposts are publicly visible"
on public.reposts for select
to anon, authenticated
using (true);

create policy "Users create their own reposts"
on public.reposts for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users delete their own reposts"
on public.reposts for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users view their own bookmarks"
on public.bookmarks for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users create their own bookmarks"
on public.bookmarks for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users delete their own bookmarks"
on public.bookmarks for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Follows are publicly visible"
on public.follows for select
to anon, authenticated
using (true);

create policy "Users create their own follows"
on public.follows for insert
to authenticated
with check ((select auth.uid()) = follower_id);

create policy "Users delete their own follows"
on public.follows for delete
to authenticated
using ((select auth.uid()) = follower_id);

create policy "Users view their own notifications"
on public.notifications for select
to authenticated
using ((select auth.uid()) = recipient_id);

create policy "Users update their own notifications"
on public.notifications for update
to authenticated
using ((select auth.uid()) = recipient_id)
with check ((select auth.uid()) = recipient_id);

create policy "Users delete their own notifications"
on public.notifications for delete
to authenticated
using ((select auth.uid()) = recipient_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'social-media',
  'social-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Social images are publicly visible"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'social-media');

create policy "Users upload to their own media folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'social-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users update their own media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'social-media'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'social-media'
  and owner_id = (select auth.uid()::text)
);

create policy "Users delete their own media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'social-media'
  and owner_id = (select auth.uid()::text)
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;
end;
$$;
