-- New uploads are limited at Storage too. Previously stored files remain readable.
update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'wish-photos';
