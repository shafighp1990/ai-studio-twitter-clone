alter table public.posts
  drop constraint posts_external_fields,
  drop constraint posts_external_post_id_format,
  drop constraint posts_external_url_provider,
  drop constraint posts_content_length;

alter table public.posts
  add constraint posts_external_fields check (
    (external_platform is null and external_url is null and external_post_id is null)
    or (external_platform is not null and external_url is not null and external_post_id is null)
  ),
  add constraint posts_external_url_provider check (
    external_url is null
    or (
      external_platform = 'x'
      and external_url ~ '^https://x\.com/([A-Za-z0-9_]{1,50}|i/web)/status/[0-9]{1,200}$'
    )
    or (
      external_platform = 'instagram'
      and external_url ~ '^https://www\.instagram\.com/(p|reel|tv)/[A-Za-z0-9_-]{1,200}/$'
    )
    or (
      external_platform = 'facebook'
      and (
        external_url ~ '^https://www\.facebook\.com/[A-Za-z0-9._-]{1,100}/(posts|videos)/[A-Za-z0-9_-]{1,200}$'
        or external_url ~ '^https://www\.facebook\.com/(reel|share/(p|r|v))/[A-Za-z0-9_-]{1,200}$'
        or external_url ~ '^https://www\.facebook\.com/(story|permalink)\.php\?story_fbid=[A-Za-z0-9_-]{1,200}(&id=[A-Za-z0-9_-]{1,200})?$'
        or external_url ~ '^https://www\.facebook\.com/photo\.php\?fbid=[A-Za-z0-9_-]{1,200}(&id=[A-Za-z0-9_-]{1,200})?$'
        or external_url ~ '^https://www\.facebook\.com/watch\?v=[A-Za-z0-9_-]{1,200}$'
        or external_url ~ '^https://fb\.watch/[A-Za-z0-9_-]{1,200}/$'
      )
    )
  ),
  add constraint posts_content_length check (
    char_length(btrim(content)) <= 280
    and (
      char_length(btrim(content)) >= 1
      or external_url is not null
    )
  );

revoke insert (external_post_id)
  on table public.posts from authenticated;

comment on column public.posts.external_url is
  'Canonical HTTPS permalink to a validated public post on X, Instagram, or Facebook.';
comment on column public.posts.external_post_id is
  'Reserved legacy field. Provider action IDs are derived from the validated canonical URL.';
