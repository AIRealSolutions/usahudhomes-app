-- Let anyone viewing a listing page play its finished video.
-- Only completed jobs are visible; queued/processing/error jobs stay admin-only.
-- The video files are already public in the USAHUDhomes storage bucket.
drop policy if exists "Public can view finished videos" on public.video_jobs;
create policy "Public can view finished videos" on public.video_jobs
  for select to anon, authenticated
  using (status = 'done' and s3_url is not null);
