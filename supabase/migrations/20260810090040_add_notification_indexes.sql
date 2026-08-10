create index notifications_actor_idx
  on public.notifications (actor_id, created_at desc);

create index notifications_post_idx
  on public.notifications (post_id)
  where post_id is not null;
