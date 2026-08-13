-- Users who opt in to MFA must reach AAL2 before their authenticated session
-- can read or mutate application data. Anonymous public reads remain unchanged.

create policy "MFA users require AAL2 for profiles"
on public.profiles
as restrictive
for all
to authenticated
using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case
      when count(id) > 0 then array['aal2']
      else array['aal1', 'aal2']
    end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
)
with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case
      when count(id) > 0 then array['aal2']
      else array['aal1', 'aal2']
    end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
);

create policy "MFA users require AAL2 for posts"
on public.posts
as restrictive
for all
to authenticated
using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
)
with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
);

create policy "MFA users require AAL2 for likes"
on public.post_likes
as restrictive
for all
to authenticated
using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
)
with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
);

create policy "MFA users require AAL2 for reposts"
on public.reposts
as restrictive
for all
to authenticated
using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
)
with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
);

create policy "MFA users require AAL2 for bookmarks"
on public.bookmarks
as restrictive
for all
to authenticated
using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
)
with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
);

create policy "MFA users require AAL2 for follows"
on public.follows
as restrictive
for all
to authenticated
using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
)
with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
);

create policy "MFA users require AAL2 for notifications"
on public.notifications
as restrictive
for all
to authenticated
using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
)
with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
);

create policy "MFA users require AAL2 for social media"
on storage.objects
as restrictive
for all
to authenticated
using (
  bucket_id <> 'social-media'
  or array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
)
with check (
  bucket_id <> 'social-media'
  or array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
    from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  )
);
