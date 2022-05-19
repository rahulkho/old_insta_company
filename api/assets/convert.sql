


ALTER TABLE public.user_follows ALTER COLUMN "followId" TYPE int8 USING "followId"::int8;
ALTER TABLE public.user_follows ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;
ALTER TABLE public.user_follows ALTER COLUMN "followedUserId" TYPE int8 USING "followedUserId"::int8;

ALTER TABLE public.user_locations ALTER COLUMN "id" TYPE int8 USING "id"::int8;

ALTER TABLE public.user_location_info ALTER COLUMN "detailId" TYPE int8 USING "detailId"::int8;
ALTER TABLE public.user_location_info ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;

ALTER TABLE public.user_feedbacks ALTER COLUMN "id" TYPE int8 USING "id"::int8;
ALTER TABLE public.user_feedbacks ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;

ALTER TABLE public.user_countries ALTER COLUMN "id" TYPE int8 USING "id"::int8;
ALTER TABLE public.user_countries ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;

ALTER TABLE public.user_blocks ALTER COLUMN "blockId" TYPE int8 USING "blockId"::int8;
ALTER TABLE public.user_blocks ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;
ALTER TABLE public.user_blocks ALTER COLUMN "blockedUserId" TYPE int8 USING "blockedUserId"::int8;

ALTER TABLE public.subcategories ALTER COLUMN "id" TYPE int8 USING "id"::int8;

ALTER TABLE public.sounds ALTER COLUMN "id" TYPE int8 USING "id"::int8;
ALTER TABLE public.sounds ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;

ALTER TABLE public.user_sounds ALTER COLUMN "id" TYPE int8 USING "id"::int8;
ALTER TABLE public.user_sounds ALTER COLUMN "soundId" TYPE int8 USING "soundId"::int8;
ALTER TABLE public.user_sounds ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;

ALTER TABLE public.sound_categories ALTER COLUMN "id" TYPE int8 USING "id"::int8;

ALTER TABLE public.skipped_categories ALTER COLUMN "id" TYPE int8 USING "id"::int8;
ALTER TABLE public.skipped_categories ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;
ALTER TABLE public.skipped_categories ALTER COLUMN "categoryId" TYPE int8 USING "categoryId"::int8;

ALTER TABLE public.posts ALTER COLUMN "categoryId" TYPE int8 USING "categoryId"::int8;
ALTER TABLE public.posts ALTER COLUMN "postId" TYPE int8 USING "postId"::int8;
ALTER TABLE public.posts ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;
ALTER TABLE public.posts ALTER COLUMN "soundId" TYPE int8 USING "soundId"::int8;

ALTER TABLE public.post_views ALTER COLUMN "viewId" TYPE int8 USING "viewId"::int8;
ALTER TABLE public.post_views ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;
ALTER TABLE public.post_views ALTER COLUMN "postId" TYPE int8 USING "postId"::int8;

ALTER TABLE public.post_likes ALTER COLUMN "likeId" TYPE int8 USING "likeId"::int8;
ALTER TABLE public.post_likes ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;
ALTER TABLE public.post_likes ALTER COLUMN "postId" TYPE int8 USING "postId"::int8;

ALTER TABLE public.post_favourites ALTER COLUMN "favouriteId" TYPE int8 USING "favouriteId"::int8;
ALTER TABLE public.post_favourites ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;
ALTER TABLE public.post_favourites ALTER COLUMN "postId" TYPE int8 USING "postId"::int8;

ALTER TABLE public.post_comments ALTER COLUMN "commentId" TYPE int8 USING "commentId"::int8;
ALTER TABLE public.post_comments ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;
ALTER TABLE public.post_comments ALTER COLUMN "postId" TYPE int8 USING "postId"::int8;
ALTER TABLE public.post_comments ALTER COLUMN "replyTo" TYPE int8 USING "replyTo"::int8;

ALTER TABLE public.post_blessings ALTER COLUMN "blessingId" TYPE int8 USING "blessingId"::int8;
ALTER TABLE public.post_blessings ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;
ALTER TABLE public.post_blessings ALTER COLUMN "postId" TYPE int8 USING "postId"::int8;

ALTER TABLE public.notifications ALTER COLUMN "id" TYPE int8 USING "id"::int8;
ALTER TABLE public.notifications ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;
ALTER TABLE public.notifications ALTER COLUMN "postId" TYPE int8 USING "postId"::int8;
ALTER TABLE public.notifications ALTER COLUMN "authorId" TYPE int8 USING "authorId"::int8;
ALTER TABLE public.notifications ALTER COLUMN "commentId" TYPE int8 USING "commentId"::int8;

ALTER TABLE public.comment_likes ALTER COLUMN "likeId" TYPE int8 USING "likeId"::int8;
ALTER TABLE public.comment_likes ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;
ALTER TABLE public.comment_likes ALTER COLUMN "commentId" TYPE int8 USING "commentId"::int8;

ALTER TABLE public.categories ALTER COLUMN "categoryId" TYPE int8 USING "categoryId"::int8;

ALTER TABLE public.users ALTER COLUMN "userId" TYPE int8 USING "userId"::int8;


alter sequence "notifications_id_seq" as bigint;
alter sequence "skipped_categories_id_seq" as bigint;
alter sequence "subcategories_id_seq" as bigint;
alter sequence "keywords_id_seq" as bigint;
alter sequence "bucket_locations_id_seq" as bigint;
alter sequence "sounds_id_seq" as bigint;
alter sequence "user_sounds_id_seq" as bigint;
alter sequence "sound_categories_id_seq" as bigint;
alter sequence "legal_id_seq" as bigint;
alter sequence "comment_likes_likeId_seq" as bigint;
alter sequence "user_countries_id_seq" as bigint;
alter sequence "user_locations_id_seq" as bigint;
alter sequence "user_location_info_detailId_seq" as bigint;
alter sequence "admin_users_userId_seq" as bigint;
alter sequence "alerts_alertId_seq" as bigint;
alter sequence "app_versions_id_seq" as bigint;
alter sequence "blocks_blockId_seq" as bigint;
alter sequence "categories_categoryId_seq" as bigint;
alter sequence "general_info_infoId_seq" as bigint;
alter sequence "hashtags_tagId_seq" as bigint;
alter sequence "password_reset_requests_requestId_seq" as bigint;
alter sequence "post_blessings_blessingId_seq" as bigint;
alter sequence "post_comments_commentId_seq" as bigint;
alter sequence "post_favourites_favouriteId_seq" as bigint;
alter sequence "post_likes_likeId_seq" as bigint;
alter sequence "post_views_viewId_seq" as bigint;
alter sequence "posts_postId_seq" as bigint;
alter sequence "reported_posts_reportId_seq" as bigint;
alter sequence "reported_users_reportId_seq" as bigint;
alter sequence "user_feedbacks_id_seq" as bigint;
alter sequence "user_follows_followId_seq" as bigint;
alter sequence "users_userId_seq" as bigint;