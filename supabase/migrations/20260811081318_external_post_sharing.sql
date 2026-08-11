alter table public.posts
  add column external_platform text,
  add column external_url text,
  add column external_post_id text;

alter table public.posts
  add constraint posts_external_platform check (
    external_platform is null
    or external_platform in ('x', 'instagram', 'facebook')
  ),
  add constraint posts_external_fields check (
    (external_platform is null and external_url is null and external_post_id is null)
    or (external_platform is not null and external_url is not null)
  ),
  add constraint posts_external_url_length check (
    external_url is null or char_length(external_url) <= 2048
  ),
  add constraint posts_external_post_id_format check (
    external_post_id is null
    or external_post_id ~ '^[A-Za-z0-9_-]{1,200}$'
  ),
  add constraint posts_external_url_provider check (
    external_url is null
    or (
      external_platform = 'x'
      and external_url ~ '^https://x\.com/([A-Za-z0-9_]+|i/web)/status/[0-9]+$'
    )
    or (
      external_platform = 'instagram'
      and external_url ~ '^https://www\.instagram\.com/(p|reel|tv)/[A-Za-z0-9_-]+/$'
    )
    or (
      external_platform = 'facebook'
      and (
        external_url ~ '^https://www\.facebook\.com/[^[:space:]#]+$'
        or external_url ~ '^https://fb\.watch/[A-Za-z0-9_-]+/$'
      )
    )
  );

create index posts_external_platform_idx
  on public.posts (external_platform, created_at desc)
  where external_platform is not null;

grant insert (external_platform, external_url, external_post_id)
  on table public.posts to authenticated;

comment on column public.posts.external_platform is
  'Validated origin of a quoted public social post: x, instagram, or facebook.';
comment on column public.posts.external_url is
  'Canonical HTTPS permalink supplied by the AI Studio post author.';
comment on column public.posts.external_post_id is
  'Provider post ID or shortcode used only to initialize an official embed.';
