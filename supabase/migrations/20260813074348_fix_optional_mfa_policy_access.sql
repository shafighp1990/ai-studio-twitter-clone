-- Keep Auth's TOTP secrets inaccessible while allowing RLS to check whether
-- the current user has enrolled a verified factor.

create or replace function private.mfa_access_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    array[(select auth.jwt()->>'aal')] <@
    case
      when exists (
        select 1
        from auth.mfa_factors
        where user_id = (select auth.uid())
          and status = 'verified'
      ) then array['aal2']
      else array['aal1', 'aal2']
    end;
$function$;

alter function private.mfa_access_allowed() owner to postgres;
revoke all on function private.mfa_access_allowed() from public;
revoke all on function private.mfa_access_allowed() from anon;
grant usage on schema private to authenticated;
grant execute on function private.mfa_access_allowed() to authenticated;

alter policy "MFA users require AAL2 for profiles" on public.profiles
  using ((select private.mfa_access_allowed()))
  with check ((select private.mfa_access_allowed()));

alter policy "MFA users require AAL2 for posts" on public.posts
  using ((select private.mfa_access_allowed()))
  with check ((select private.mfa_access_allowed()));

alter policy "MFA users require AAL2 for likes" on public.post_likes
  using ((select private.mfa_access_allowed()))
  with check ((select private.mfa_access_allowed()));

alter policy "MFA users require AAL2 for reposts" on public.reposts
  using ((select private.mfa_access_allowed()))
  with check ((select private.mfa_access_allowed()));

alter policy "MFA users require AAL2 for bookmarks" on public.bookmarks
  using ((select private.mfa_access_allowed()))
  with check ((select private.mfa_access_allowed()));

alter policy "MFA users require AAL2 for follows" on public.follows
  using ((select private.mfa_access_allowed()))
  with check ((select private.mfa_access_allowed()));

alter policy "MFA users require AAL2 for notifications" on public.notifications
  using ((select private.mfa_access_allowed()))
  with check ((select private.mfa_access_allowed()));

alter policy "MFA users require AAL2 for social media" on storage.objects
  using (bucket_id <> 'social-media' or (select private.mfa_access_allowed()))
  with check (bucket_id <> 'social-media' or (select private.mfa_access_allowed()));
