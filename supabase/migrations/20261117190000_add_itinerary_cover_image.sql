-- Optional dedicated cover photo for the first page of a travel itinerary.
-- If null, the application automatically uses the first uploaded daily itinerary photo.
alter table public.itineraries
  add column if not exists cover_image_path text;
