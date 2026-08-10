-- Keep updated objects inside the authenticated owner's namespace. Public image
-- delivery remains unchanged because the bucket itself is public.

drop policy if exists "Users update their own media" on storage.objects;

create policy "Users update their own media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'social-media'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'social-media'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
