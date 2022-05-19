--
-- PostgreSQL database dump
--

-- Dumped from database version 11.6
-- Dumped by pg_dump version 12.2 (Ubuntu 12.2-4)

-- Started on 2020-07-18 13:44:41 UTC

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 17070)
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";


--
-- TOC entry 4335 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "citext"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "citext" IS 'data type for case-insensitive character strings';


SET default_tablespace = '';

--
-- TOC entry 197 (class 1259 OID 17173)
-- Name: admin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."admin_users" (
    "userId" integer NOT NULL,
    "name" character varying,
    "lastName" character varying,
    "email" character varying NOT NULL,
    "password" character varying NOT NULL
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";

--
-- TOC entry 198 (class 1259 OID 17179)
-- Name: admin_users_userId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."admin_users_userId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."admin_users_userId_seq" OWNER TO "postgres";

--
-- TOC entry 4336 (class 0 OID 0)
-- Dependencies: 198
-- Name: admin_users_userId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."admin_users_userId_seq" OWNED BY "public"."admin_users"."userId";


--
-- TOC entry 199 (class 1259 OID 17181)
-- Name: alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."alerts" (
    "alertId" integer NOT NULL,
    "action" character varying,
    "userId" integer,
    "actorId" integer,
    "postId" integer,
    "commentId" integer,
    "isRead" boolean DEFAULT false,
    "ts" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alerts" OWNER TO "postgres";

--
-- TOC entry 200 (class 1259 OID 17189)
-- Name: alerts_alertId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."alerts_alertId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."alerts_alertId_seq" OWNER TO "postgres";

--
-- TOC entry 4337 (class 0 OID 0)
-- Dependencies: 200
-- Name: alerts_alertId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."alerts_alertId_seq" OWNED BY "public"."alerts"."alertId";


--
-- TOC entry 201 (class 1259 OID 17191)
-- Name: app_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."app_versions" (
    "id" integer NOT NULL,
    "platform" character varying,
    "version" character varying,
    "forcedUpdate" boolean DEFAULT false
);


ALTER TABLE "public"."app_versions" OWNER TO "postgres";

--
-- TOC entry 202 (class 1259 OID 17198)
-- Name: app_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."app_versions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."app_versions_id_seq" OWNER TO "postgres";

--
-- TOC entry 4338 (class 0 OID 0)
-- Dependencies: 202
-- Name: app_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."app_versions_id_seq" OWNED BY "public"."app_versions"."id";


--
-- TOC entry 203 (class 1259 OID 17200)
-- Name: user_blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."user_blocks" (
    "blockId" integer NOT NULL,
    "userId" integer NOT NULL,
    "blockedUserId" integer NOT NULL
);


ALTER TABLE "public"."user_blocks" OWNER TO "postgres";

--
-- TOC entry 204 (class 1259 OID 17203)
-- Name: blocks_blockId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."blocks_blockId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."blocks_blockId_seq" OWNER TO "postgres";

--
-- TOC entry 4339 (class 0 OID 0)
-- Dependencies: 204
-- Name: blocks_blockId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."blocks_blockId_seq" OWNED BY "public"."user_blocks"."blockId";


--
-- TOC entry 205 (class 1259 OID 17205)
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."categories" (
    "categoryId" integer NOT NULL,
    "categoryName" "public"."citext" NOT NULL,
    "totalPosts" integer DEFAULT 0,
    "rules" character varying[] DEFAULT '{}'::character varying[],
    "videoUrl" character varying,
    "imageUrl" character varying,
    "priority" integer,
    "isDeleted" boolean DEFAULT false,
    "subcategories" integer[],
    "keywords" integer[]
);


ALTER TABLE "public"."categories" OWNER TO "postgres";

--
-- TOC entry 206 (class 1259 OID 17214)
-- Name: categories_categoryId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."categories_categoryId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."categories_categoryId_seq" OWNER TO "postgres";

--
-- TOC entry 4340 (class 0 OID 0)
-- Dependencies: 206
-- Name: categories_categoryId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."categories_categoryId_seq" OWNED BY "public"."categories"."categoryId";


--
-- TOC entry 207 (class 1259 OID 17216)
-- Name: comment_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."comment_likes" (
    "likeId" integer NOT NULL,
    "commentId" integer,
    "userId" integer,
    "ts" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comment_likes" OWNER TO "postgres";

--
-- TOC entry 208 (class 1259 OID 17220)
-- Name: comment_likes_likeId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."comment_likes_likeId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."comment_likes_likeId_seq" OWNER TO "postgres";

--
-- TOC entry 4341 (class 0 OID 0)
-- Dependencies: 208
-- Name: comment_likes_likeId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."comment_likes_likeId_seq" OWNED BY "public"."comment_likes"."likeId";


--
-- TOC entry 209 (class 1259 OID 17222)
-- Name: general_info; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."general_info" (
    "infoId" integer NOT NULL,
    "type" character varying NOT NULL,
    "description" "text" NOT NULL
);


ALTER TABLE "public"."general_info" OWNER TO "postgres";

--
-- TOC entry 210 (class 1259 OID 17228)
-- Name: general_info_infoId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."general_info_infoId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."general_info_infoId_seq" OWNER TO "postgres";

--
-- TOC entry 4342 (class 0 OID 0)
-- Dependencies: 210
-- Name: general_info_infoId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."general_info_infoId_seq" OWNED BY "public"."general_info"."infoId";


--
-- TOC entry 211 (class 1259 OID 17230)
-- Name: hashtags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."hashtags" (
    "tagId" integer NOT NULL,
    "hashtag" "public"."citext" NOT NULL
);


ALTER TABLE "public"."hashtags" OWNER TO "postgres";

--
-- TOC entry 212 (class 1259 OID 17236)
-- Name: hashtags_tagId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."hashtags_tagId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."hashtags_tagId_seq" OWNER TO "postgres";

--
-- TOC entry 4343 (class 0 OID 0)
-- Dependencies: 212
-- Name: hashtags_tagId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."hashtags_tagId_seq" OWNED BY "public"."hashtags"."tagId";


--
-- TOC entry 213 (class 1259 OID 17238)
-- Name: keywords; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."keywords" (
    "id" integer NOT NULL,
    "keyword" character varying
);


ALTER TABLE "public"."keywords" OWNER TO "postgres";

--
-- TOC entry 214 (class 1259 OID 17244)
-- Name: keywords_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."keywords_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."keywords_id_seq" OWNER TO "postgres";

--
-- TOC entry 4344 (class 0 OID 0)
-- Dependencies: 214
-- Name: keywords_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."keywords_id_seq" OWNED BY "public"."keywords"."id";


--
-- TOC entry 215 (class 1259 OID 17246)
-- Name: legal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."legal" (
    "id" integer NOT NULL,
    "appName" character varying,
    "bundleId" character varying,
    "appVersion" character varying,
    "info" character varying,
    "ts" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."legal" OWNER TO "postgres";

--
-- TOC entry 216 (class 1259 OID 17253)
-- Name: legal_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."legal_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."legal_id_seq" OWNER TO "postgres";

--
-- TOC entry 4345 (class 0 OID 0)
-- Dependencies: 216
-- Name: legal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."legal_id_seq" OWNED BY "public"."legal"."id";


--
-- TOC entry 260 (class 1259 OID 17727)
-- Name: moderation_jobs; Type: TABLE; Schema: public; Owner: sohel
--

CREATE TABLE "public"."moderation_jobs" (
    "id" integer NOT NULL,
    "postId" integer,
    "region" character varying,
    "jobId" character varying,
    "result" "jsonb",
    "created" timestamp with time zone DEFAULT "now"(),
    "updated" timestamp with time zone
);


ALTER TABLE "public"."moderation_jobs" OWNER TO "sohel";

--
-- TOC entry 259 (class 1259 OID 17725)
-- Name: moderation_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: sohel
--

CREATE SEQUENCE "public"."moderation_jobs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."moderation_jobs_id_seq" OWNER TO "sohel";

--
-- TOC entry 4346 (class 0 OID 0)
-- Dependencies: 259
-- Name: moderation_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sohel
--

ALTER SEQUENCE "public"."moderation_jobs_id_seq" OWNED BY "public"."moderation_jobs"."id";


--
-- TOC entry 217 (class 1259 OID 17255)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."notifications" (
    "id" integer NOT NULL,
    "action" character varying,
    "userId" integer,
    "authorId" integer,
    "postId" integer,
    "commentId" integer,
    "isRead" boolean DEFAULT false,
    "description" character varying,
    "ts" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";

--
-- TOC entry 218 (class 1259 OID 17263)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."notifications_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."notifications_id_seq" OWNER TO "postgres";

--
-- TOC entry 4347 (class 0 OID 0)
-- Dependencies: 218
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."notifications_id_seq" OWNED BY "public"."notifications"."id";


--
-- TOC entry 219 (class 1259 OID 17265)
-- Name: password_reset_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."password_reset_requests" (
    "requestId" integer NOT NULL,
    "userId" integer NOT NULL,
    "resetToken" "uuid" NOT NULL,
    "added" timestamp with time zone DEFAULT "now"(),
    "expires" timestamp with time zone DEFAULT ("now"() + '12:00:00'::interval)
);


ALTER TABLE "public"."password_reset_requests" OWNER TO "postgres";

--
-- TOC entry 220 (class 1259 OID 17270)
-- Name: password_reset_requests_requestId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."password_reset_requests_requestId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."password_reset_requests_requestId_seq" OWNER TO "postgres";

--
-- TOC entry 4348 (class 0 OID 0)
-- Dependencies: 220
-- Name: password_reset_requests_requestId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."password_reset_requests_requestId_seq" OWNED BY "public"."password_reset_requests"."requestId";


--
-- TOC entry 221 (class 1259 OID 17272)
-- Name: post_blessings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."post_blessings" (
    "blessingId" integer NOT NULL,
    "postId" integer,
    "userId" integer,
    "ts" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_blessings" OWNER TO "postgres";

--
-- TOC entry 222 (class 1259 OID 17276)
-- Name: post_blessings_blessingId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."post_blessings_blessingId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."post_blessings_blessingId_seq" OWNER TO "postgres";

--
-- TOC entry 4349 (class 0 OID 0)
-- Dependencies: 222
-- Name: post_blessings_blessingId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."post_blessings_blessingId_seq" OWNED BY "public"."post_blessings"."blessingId";


--
-- TOC entry 223 (class 1259 OID 17278)
-- Name: post_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."post_comments" (
    "commentId" integer NOT NULL,
    "postId" integer,
    "userId" integer NOT NULL,
    "comment" "text",
    "replyTo" integer,
    "hashtags" integer[],
    "mentions" integer[],
    "ts" timestamp with time zone DEFAULT "now"(),
    "editedTs" timestamp with time zone,
    "isDeleted" boolean DEFAULT false,
    "likes" integer DEFAULT 0
);


ALTER TABLE "public"."post_comments" OWNER TO "postgres";

--
-- TOC entry 224 (class 1259 OID 17287)
-- Name: post_comments_commentId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."post_comments_commentId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."post_comments_commentId_seq" OWNER TO "postgres";

--
-- TOC entry 4350 (class 0 OID 0)
-- Dependencies: 224
-- Name: post_comments_commentId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."post_comments_commentId_seq" OWNED BY "public"."post_comments"."commentId";


--
-- TOC entry 225 (class 1259 OID 17289)
-- Name: post_favourites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."post_favourites" (
    "favouriteId" integer NOT NULL,
    "postId" integer,
    "userId" integer,
    "ts" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_favourites" OWNER TO "postgres";

--
-- TOC entry 226 (class 1259 OID 17293)
-- Name: post_favourites_favouriteId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."post_favourites_favouriteId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."post_favourites_favouriteId_seq" OWNER TO "postgres";

--
-- TOC entry 4351 (class 0 OID 0)
-- Dependencies: 226
-- Name: post_favourites_favouriteId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."post_favourites_favouriteId_seq" OWNED BY "public"."post_favourites"."favouriteId";


--
-- TOC entry 227 (class 1259 OID 17295)
-- Name: post_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."post_likes" (
    "likeId" integer NOT NULL,
    "postId" integer,
    "userId" integer,
    "ts" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_likes" OWNER TO "postgres";

--
-- TOC entry 228 (class 1259 OID 17299)
-- Name: post_likes_likeId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."post_likes_likeId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."post_likes_likeId_seq" OWNER TO "postgres";

--
-- TOC entry 4352 (class 0 OID 0)
-- Dependencies: 228
-- Name: post_likes_likeId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."post_likes_likeId_seq" OWNED BY "public"."post_likes"."likeId";


--
-- TOC entry 229 (class 1259 OID 17301)
-- Name: post_views; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."post_views" (
    "viewId" integer NOT NULL,
    "postId" integer,
    "userId" integer,
    "ts" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_views" OWNER TO "postgres";

--
-- TOC entry 230 (class 1259 OID 17305)
-- Name: post_views_viewId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."post_views_viewId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."post_views_viewId_seq" OWNER TO "postgres";

--
-- TOC entry 4353 (class 0 OID 0)
-- Dependencies: 230
-- Name: post_views_viewId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."post_views_viewId_seq" OWNED BY "public"."post_views"."viewId";


--
-- TOC entry 231 (class 1259 OID 17307)
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."posts" (
    "postId" integer NOT NULL,
    "userId" integer NOT NULL,
    "categoryId" integer,
    "videoUrl" character varying,
    "description" "text",
    "hashtags" integer[],
    "mentions" integer[],
    "views" integer DEFAULT 0,
    "likes" integer DEFAULT 0,
    "comments" integer DEFAULT 0,
    "blessings" integer DEFAULT 0,
    "createdTs" timestamp with time zone DEFAULT "now"(),
    "updatedTs" timestamp with time zone,
    "isActive" boolean DEFAULT true,
    "isDeleted" boolean DEFAULT false,
    "imageUrl" character varying,
    "isLandscape" boolean DEFAULT false,
    "videoStreamUrl" character varying,
    "sponsored" boolean DEFAULT false,
    "status" character varying DEFAULT 'draft'::character varying,
    "soundId" integer,
    "isOpen" boolean DEFAULT false,
    "publishedTs" timestamp with time zone,
    "duetWith" character varying,
    "iOSFront" character varying
);


ALTER TABLE "public"."posts" OWNER TO "postgres";

--
-- TOC entry 232 (class 1259 OID 17324)
-- Name: posts_postId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."posts_postId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."posts_postId_seq" OWNER TO "postgres";

--
-- TOC entry 4354 (class 0 OID 0)
-- Dependencies: 232
-- Name: posts_postId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."posts_postId_seq" OWNED BY "public"."posts"."postId";


--
-- TOC entry 233 (class 1259 OID 17326)
-- Name: reported_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."reported_posts" (
    "reportId" integer NOT NULL,
    "userId" integer,
    "reportedPostId" integer,
    "ts" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reported_posts" OWNER TO "postgres";

--
-- TOC entry 234 (class 1259 OID 17330)
-- Name: reported_posts_reportId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."reported_posts_reportId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."reported_posts_reportId_seq" OWNER TO "postgres";

--
-- TOC entry 4355 (class 0 OID 0)
-- Dependencies: 234
-- Name: reported_posts_reportId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."reported_posts_reportId_seq" OWNED BY "public"."reported_posts"."reportId";


--
-- TOC entry 235 (class 1259 OID 17332)
-- Name: reported_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."reported_users" (
    "reportId" integer NOT NULL,
    "userId" integer,
    "reportedUserId" integer,
    "ts" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reported_users" OWNER TO "postgres";

--
-- TOC entry 236 (class 1259 OID 17336)
-- Name: reported_users_reportId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."reported_users_reportId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."reported_users_reportId_seq" OWNER TO "postgres";

--
-- TOC entry 4356 (class 0 OID 0)
-- Dependencies: 236
-- Name: reported_users_reportId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."reported_users_reportId_seq" OWNED BY "public"."reported_users"."reportId";


--
-- TOC entry 237 (class 1259 OID 17338)
-- Name: skipped_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."skipped_categories" (
    "id" integer NOT NULL,
    "userId" integer,
    "categoryId" integer
);


ALTER TABLE "public"."skipped_categories" OWNER TO "postgres";

--
-- TOC entry 238 (class 1259 OID 17341)
-- Name: skipped_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."skipped_categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."skipped_categories_id_seq" OWNER TO "postgres";

--
-- TOC entry 4357 (class 0 OID 0)
-- Dependencies: 238
-- Name: skipped_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."skipped_categories_id_seq" OWNED BY "public"."skipped_categories"."id";


--
-- TOC entry 239 (class 1259 OID 17343)
-- Name: sound_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."sound_categories" (
    "id" integer NOT NULL,
    "categoryName" "public"."citext" NOT NULL,
    "imageUrl" character varying,
    "countries" character varying[],
    "isDeleted" boolean DEFAULT false
);


ALTER TABLE "public"."sound_categories" OWNER TO "postgres";

--
-- TOC entry 240 (class 1259 OID 17350)
-- Name: sound_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."sound_categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sound_categories_id_seq" OWNER TO "postgres";

--
-- TOC entry 4358 (class 0 OID 0)
-- Dependencies: 240
-- Name: sound_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."sound_categories_id_seq" OWNED BY "public"."sound_categories"."id";


--
-- TOC entry 241 (class 1259 OID 17352)
-- Name: sounds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."sounds" (
    "id" integer NOT NULL,
    "title" character varying,
    "duration" integer,
    "url" character varying,
    "streamUrl" character varying,
    "createdAt" timestamp with time zone DEFAULT "now"(),
    "imageUrl" character varying,
    "soundCategoryIds" integer[],
    "postCount" integer DEFAULT 0,
    "isDeleted" boolean DEFAULT false,
    "videoCategoryIds" integer[],
    "userId" integer,
    "isPopular" boolean DEFAULT false
);


ALTER TABLE "public"."sounds" OWNER TO "postgres";

--
-- TOC entry 242 (class 1259 OID 17362)
-- Name: sounds_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."sounds_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sounds_id_seq" OWNER TO "postgres";

--
-- TOC entry 4359 (class 0 OID 0)
-- Dependencies: 242
-- Name: sounds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."sounds_id_seq" OWNED BY "public"."sounds"."id";


--
-- TOC entry 243 (class 1259 OID 17364)
-- Name: subcategories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."subcategories" (
    "id" integer NOT NULL,
    "subcategory" character varying
);


ALTER TABLE "public"."subcategories" OWNER TO "postgres";

--
-- TOC entry 244 (class 1259 OID 17370)
-- Name: subcategories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."subcategories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."subcategories_id_seq" OWNER TO "postgres";

--
-- TOC entry 4360 (class 0 OID 0)
-- Dependencies: 244
-- Name: subcategories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."subcategories_id_seq" OWNED BY "public"."subcategories"."id";


--
-- TOC entry 245 (class 1259 OID 17372)
-- Name: user_countries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."user_countries" (
    "id" integer NOT NULL,
    "userId" integer,
    "country" character varying,
    "defaultCountry" boolean DEFAULT false
);


ALTER TABLE "public"."user_countries" OWNER TO "postgres";

--
-- TOC entry 246 (class 1259 OID 17379)
-- Name: user_countries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."user_countries_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."user_countries_id_seq" OWNER TO "postgres";

--
-- TOC entry 4361 (class 0 OID 0)
-- Dependencies: 246
-- Name: user_countries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."user_countries_id_seq" OWNED BY "public"."user_countries"."id";


--
-- TOC entry 247 (class 1259 OID 17381)
-- Name: user_feedbacks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."user_feedbacks" (
    "id" integer NOT NULL,
    "userId" integer,
    "email" character varying,
    "type" character varying,
    "description" "text",
    "isBug" boolean DEFAULT false,
    "ts" timestamp with time zone DEFAULT "now"(),
    "isRead" boolean DEFAULT false
);


ALTER TABLE "public"."user_feedbacks" OWNER TO "postgres";

--
-- TOC entry 248 (class 1259 OID 17390)
-- Name: user_feedbacks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."user_feedbacks_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."user_feedbacks_id_seq" OWNER TO "postgres";

--
-- TOC entry 4362 (class 0 OID 0)
-- Dependencies: 248
-- Name: user_feedbacks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."user_feedbacks_id_seq" OWNED BY "public"."user_feedbacks"."id";


--
-- TOC entry 249 (class 1259 OID 17392)
-- Name: user_follows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."user_follows" (
    "followId" integer NOT NULL,
    "userId" integer NOT NULL,
    "followedUserId" integer NOT NULL,
    "ts" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_follows" OWNER TO "postgres";

--
-- TOC entry 250 (class 1259 OID 17396)
-- Name: user_follows_followId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."user_follows_followId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."user_follows_followId_seq" OWNER TO "postgres";

--
-- TOC entry 4363 (class 0 OID 0)
-- Dependencies: 250
-- Name: user_follows_followId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."user_follows_followId_seq" OWNED BY "public"."user_follows"."followId";


--
-- TOC entry 251 (class 1259 OID 17398)
-- Name: user_location_info; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."user_location_info" (
    "detailId" bigint NOT NULL,
    "userId" bigint,
    "ip" character varying NOT NULL,
    "city" character varying,
    "region" character varying,
    "region_code" character varying,
    "country_code" character varying,
    "country_name" character varying,
    "country" character varying,
    "continent_code" character varying,
    "postal" character varying,
    "in_eu" boolean DEFAULT false,
    "latitude" double precision,
    "longitude" double precision,
    "timezone" character varying,
    "utc_offset" character varying,
    "country_calling_code" character varying,
    "currency" character varying,
    "languages" character varying,
    "asn" character varying,
    "org" character varying,
    "ts" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_location_info" OWNER TO "postgres";

--
-- TOC entry 252 (class 1259 OID 17406)
-- Name: user_location_info_detailId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."user_location_info_detailId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."user_location_info_detailId_seq" OWNER TO "postgres";

--
-- TOC entry 4364 (class 0 OID 0)
-- Dependencies: 252
-- Name: user_location_info_detailId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."user_location_info_detailId_seq" OWNED BY "public"."user_location_info"."detailId";


--
-- TOC entry 253 (class 1259 OID 17408)
-- Name: user_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."user_locations" (
    "id" bigint NOT NULL,
    "ip" character varying NOT NULL,
    "city" character varying,
    "region" character varying,
    "region_code" character varying,
    "country_code" character varying,
    "country_name" character varying,
    "country" character varying,
    "continent_code" character varying,
    "postal" character varying,
    "in_eu" boolean DEFAULT false,
    "latitude" double precision,
    "longitude" double precision,
    "timezone" character varying,
    "utc_offset" character varying,
    "country_calling_code" character varying,
    "currency" character varying,
    "languages" character varying,
    "asn" character varying,
    "org" character varying,
    "ts" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_locations" OWNER TO "postgres";

--
-- TOC entry 254 (class 1259 OID 17416)
-- Name: user_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."user_locations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."user_locations_id_seq" OWNER TO "postgres";

--
-- TOC entry 4365 (class 0 OID 0)
-- Dependencies: 254
-- Name: user_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."user_locations_id_seq" OWNED BY "public"."user_locations"."id";


--
-- TOC entry 255 (class 1259 OID 17418)
-- Name: user_sounds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."user_sounds" (
    "id" bigint NOT NULL,
    "soundId" integer,
    "userId" integer
);


ALTER TABLE "public"."user_sounds" OWNER TO "postgres";

--
-- TOC entry 256 (class 1259 OID 17421)
-- Name: user_sounds_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."user_sounds_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."user_sounds_id_seq" OWNER TO "postgres";

--
-- TOC entry 4366 (class 0 OID 0)
-- Dependencies: 256
-- Name: user_sounds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."user_sounds_id_seq" OWNED BY "public"."user_sounds"."id";


--
-- TOC entry 257 (class 1259 OID 17423)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."users" (
    "userId" integer NOT NULL,
    "fullName" character varying,
    "userName" "public"."citext",
    "email" character varying,
    "password" character varying,
    "gender" character varying(16),
    "authToken" character varying,
    "deviceToken" character varying,
    "fbId" character varying,
    "imageUrl" "text",
    "imageThumbUrl" "text",
    "postViewCount" integer DEFAULT 0,
    "followersCount" integer DEFAULT 0,
    "followingsCount" integer DEFAULT 0,
    "blessingsCount" integer DEFAULT 0,
    "alertsEnabled" boolean DEFAULT true,
    "deviceType" character varying,
    "country" character varying,
    "timezone" character varying,
    "isActive" boolean DEFAULT true,
    "joinedTs" timestamp with time zone DEFAULT "now"(),
    "lastActiveTs" timestamp with time zone,
    "isDeleted" boolean DEFAULT false,
    "active" smallint DEFAULT 1,
    "publicKey" "text",
    "sponsored" boolean DEFAULT false,
    "soundSponsored" boolean DEFAULT false,
    "description" character varying,
    "postCount" integer DEFAULT 0
);


ALTER TABLE "public"."users" OWNER TO "postgres";

--
-- TOC entry 258 (class 1259 OID 17441)
-- Name: users_userId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."users_userId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."users_userId_seq" OWNER TO "postgres";

--
-- TOC entry 4367 (class 0 OID 0)
-- Dependencies: 258
-- Name: users_userId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."users_userId_seq" OWNED BY "public"."users"."userId";


--
-- TOC entry 3977 (class 2604 OID 17443)
-- Name: admin_users userId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."admin_users" ALTER COLUMN "userId" SET DEFAULT "nextval"('"public"."admin_users_userId_seq"'::"regclass");


--
-- TOC entry 3980 (class 2604 OID 17444)
-- Name: alerts alertId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."alerts" ALTER COLUMN "alertId" SET DEFAULT "nextval"('"public"."alerts_alertId_seq"'::"regclass");


--
-- TOC entry 3982 (class 2604 OID 17445)
-- Name: app_versions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."app_versions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."app_versions_id_seq"'::"regclass");


--
-- TOC entry 3987 (class 2604 OID 17446)
-- Name: categories categoryId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."categories" ALTER COLUMN "categoryId" SET DEFAULT "nextval"('"public"."categories_categoryId_seq"'::"regclass");


--
-- TOC entry 3989 (class 2604 OID 17447)
-- Name: comment_likes likeId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."comment_likes" ALTER COLUMN "likeId" SET DEFAULT "nextval"('"public"."comment_likes_likeId_seq"'::"regclass");


--
-- TOC entry 3990 (class 2604 OID 17448)
-- Name: general_info infoId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."general_info" ALTER COLUMN "infoId" SET DEFAULT "nextval"('"public"."general_info_infoId_seq"'::"regclass");


--
-- TOC entry 3991 (class 2604 OID 17449)
-- Name: hashtags tagId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."hashtags" ALTER COLUMN "tagId" SET DEFAULT "nextval"('"public"."hashtags_tagId_seq"'::"regclass");


--
-- TOC entry 3992 (class 2604 OID 17450)
-- Name: keywords id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."keywords" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."keywords_id_seq"'::"regclass");


--
-- TOC entry 3994 (class 2604 OID 17451)
-- Name: legal id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."legal" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."legal_id_seq"'::"regclass");


--
-- TOC entry 4066 (class 2604 OID 17730)
-- Name: moderation_jobs id; Type: DEFAULT; Schema: public; Owner: sohel
--

ALTER TABLE ONLY "public"."moderation_jobs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."moderation_jobs_id_seq"'::"regclass");


--
-- TOC entry 3997 (class 2604 OID 17452)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."notifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."notifications_id_seq"'::"regclass");


--
-- TOC entry 4000 (class 2604 OID 17453)
-- Name: password_reset_requests requestId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."password_reset_requests" ALTER COLUMN "requestId" SET DEFAULT "nextval"('"public"."password_reset_requests_requestId_seq"'::"regclass");


--
-- TOC entry 4002 (class 2604 OID 17454)
-- Name: post_blessings blessingId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_blessings" ALTER COLUMN "blessingId" SET DEFAULT "nextval"('"public"."post_blessings_blessingId_seq"'::"regclass");


--
-- TOC entry 4006 (class 2604 OID 17455)
-- Name: post_comments commentId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_comments" ALTER COLUMN "commentId" SET DEFAULT "nextval"('"public"."post_comments_commentId_seq"'::"regclass");


--
-- TOC entry 4008 (class 2604 OID 17456)
-- Name: post_favourites favouriteId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_favourites" ALTER COLUMN "favouriteId" SET DEFAULT "nextval"('"public"."post_favourites_favouriteId_seq"'::"regclass");


--
-- TOC entry 4010 (class 2604 OID 17457)
-- Name: post_likes likeId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_likes" ALTER COLUMN "likeId" SET DEFAULT "nextval"('"public"."post_likes_likeId_seq"'::"regclass");


--
-- TOC entry 4012 (class 2604 OID 17458)
-- Name: post_views viewId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_views" ALTER COLUMN "viewId" SET DEFAULT "nextval"('"public"."post_views_viewId_seq"'::"regclass");


--
-- TOC entry 4024 (class 2604 OID 17459)
-- Name: posts postId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."posts" ALTER COLUMN "postId" SET DEFAULT "nextval"('"public"."posts_postId_seq"'::"regclass");


--
-- TOC entry 4026 (class 2604 OID 17460)
-- Name: reported_posts reportId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reported_posts" ALTER COLUMN "reportId" SET DEFAULT "nextval"('"public"."reported_posts_reportId_seq"'::"regclass");


--
-- TOC entry 4028 (class 2604 OID 17461)
-- Name: reported_users reportId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reported_users" ALTER COLUMN "reportId" SET DEFAULT "nextval"('"public"."reported_users_reportId_seq"'::"regclass");


--
-- TOC entry 4029 (class 2604 OID 17462)
-- Name: skipped_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."skipped_categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."skipped_categories_id_seq"'::"regclass");


--
-- TOC entry 4031 (class 2604 OID 17463)
-- Name: sound_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."sound_categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sound_categories_id_seq"'::"regclass");


--
-- TOC entry 4036 (class 2604 OID 17464)
-- Name: sounds id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."sounds" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sounds_id_seq"'::"regclass");


--
-- TOC entry 4037 (class 2604 OID 17465)
-- Name: subcategories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subcategories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."subcategories_id_seq"'::"regclass");


--
-- TOC entry 3983 (class 2604 OID 17466)
-- Name: user_blocks blockId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_blocks" ALTER COLUMN "blockId" SET DEFAULT "nextval"('"public"."blocks_blockId_seq"'::"regclass");


--
-- TOC entry 4039 (class 2604 OID 17467)
-- Name: user_countries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_countries" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_countries_id_seq"'::"regclass");


--
-- TOC entry 4043 (class 2604 OID 17468)
-- Name: user_feedbacks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_feedbacks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_feedbacks_id_seq"'::"regclass");


--
-- TOC entry 4045 (class 2604 OID 17469)
-- Name: user_follows followId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_follows" ALTER COLUMN "followId" SET DEFAULT "nextval"('"public"."user_follows_followId_seq"'::"regclass");


--
-- TOC entry 4048 (class 2604 OID 17470)
-- Name: user_location_info detailId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_location_info" ALTER COLUMN "detailId" SET DEFAULT "nextval"('"public"."user_location_info_detailId_seq"'::"regclass");


--
-- TOC entry 4051 (class 2604 OID 17471)
-- Name: user_locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_locations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_locations_id_seq"'::"regclass");


--
-- TOC entry 4052 (class 2604 OID 17472)
-- Name: user_sounds id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_sounds" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_sounds_id_seq"'::"regclass");


--
-- TOC entry 4065 (class 2604 OID 17473)
-- Name: users userId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."users" ALTER COLUMN "userId" SET DEFAULT "nextval"('"public"."users_userId_seq"'::"regclass");


--
-- TOC entry 4069 (class 2606 OID 17475)
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_email_key" UNIQUE ("email");


--
-- TOC entry 4071 (class 2606 OID 17477)
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("userId");


--
-- TOC entry 4073 (class 2606 OID 17479)
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_pkey" PRIMARY KEY ("alertId");


--
-- TOC entry 4075 (class 2606 OID 17481)
-- Name: app_versions app_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."app_versions"
    ADD CONSTRAINT "app_versions_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4077 (class 2606 OID 17483)
-- Name: user_blocks blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "blocks_pkey" PRIMARY KEY ("blockId");


--
-- TOC entry 4081 (class 2606 OID 17485)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("categoryId");


--
-- TOC entry 4083 (class 2606 OID 17487)
-- Name: categories category_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "category_name_unique" UNIQUE ("categoryName");


--
-- TOC entry 4085 (class 2606 OID 17489)
-- Name: comment_likes comment_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("likeId");


--
-- TOC entry 4087 (class 2606 OID 17491)
-- Name: comment_likes comment_likes_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_unique" UNIQUE ("commentId", "userId");


--
-- TOC entry 4089 (class 2606 OID 17493)
-- Name: general_info general_info_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."general_info"
    ADD CONSTRAINT "general_info_pkey" PRIMARY KEY ("infoId");


--
-- TOC entry 4091 (class 2606 OID 17495)
-- Name: general_info general_info_type_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."general_info"
    ADD CONSTRAINT "general_info_type_unique" UNIQUE ("type");


--
-- TOC entry 4093 (class 2606 OID 17497)
-- Name: hashtags hashtags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."hashtags"
    ADD CONSTRAINT "hashtags_pkey" PRIMARY KEY ("tagId");


--
-- TOC entry 4095 (class 2606 OID 17499)
-- Name: hashtags hashtags_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."hashtags"
    ADD CONSTRAINT "hashtags_unique" UNIQUE ("hashtag");


--
-- TOC entry 4097 (class 2606 OID 17501)
-- Name: keywords keywords_keyword_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."keywords"
    ADD CONSTRAINT "keywords_keyword_key" UNIQUE ("keyword");


--
-- TOC entry 4099 (class 2606 OID 17503)
-- Name: keywords keywords_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."keywords"
    ADD CONSTRAINT "keywords_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4101 (class 2606 OID 17505)
-- Name: legal legal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."legal"
    ADD CONSTRAINT "legal_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4184 (class 2606 OID 17736)
-- Name: moderation_jobs moderation_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: sohel
--

ALTER TABLE ONLY "public"."moderation_jobs"
    ADD CONSTRAINT "moderation_jobs_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4103 (class 2606 OID 17507)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4106 (class 2606 OID 17509)
-- Name: password_reset_requests password_reset_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."password_reset_requests"
    ADD CONSTRAINT "password_reset_requests_pkey" PRIMARY KEY ("requestId");


--
-- TOC entry 4108 (class 2606 OID 17511)
-- Name: password_reset_requests password_reset_requests_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."password_reset_requests"
    ADD CONSTRAINT "password_reset_requests_token_key" UNIQUE ("resetToken");


--
-- TOC entry 4110 (class 2606 OID 17513)
-- Name: post_blessings post_blessings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_blessings"
    ADD CONSTRAINT "post_blessings_pkey" PRIMARY KEY ("blessingId");


--
-- TOC entry 4112 (class 2606 OID 17515)
-- Name: post_blessings post_blessings_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_blessings"
    ADD CONSTRAINT "post_blessings_unique" UNIQUE ("postId", "userId");


--
-- TOC entry 4114 (class 2606 OID 17517)
-- Name: post_comments post_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_pkey" PRIMARY KEY ("commentId");


--
-- TOC entry 4116 (class 2606 OID 17519)
-- Name: post_favourites post_favourites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_favourites"
    ADD CONSTRAINT "post_favourites_pkey" PRIMARY KEY ("favouriteId");


--
-- TOC entry 4118 (class 2606 OID 17521)
-- Name: post_favourites post_favourites_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_favourites"
    ADD CONSTRAINT "post_favourites_unique" UNIQUE ("postId", "userId");


--
-- TOC entry 4122 (class 2606 OID 17523)
-- Name: post_likes post_like_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_like_unique" UNIQUE ("postId", "userId");


--
-- TOC entry 4124 (class 2606 OID 17525)
-- Name: post_likes post_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_pkey" PRIMARY KEY ("likeId");


--
-- TOC entry 4128 (class 2606 OID 17527)
-- Name: post_views post_views_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_views"
    ADD CONSTRAINT "post_views_pkey" PRIMARY KEY ("viewId");


--
-- TOC entry 4130 (class 2606 OID 17529)
-- Name: post_views post_views_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_views"
    ADD CONSTRAINT "post_views_unique" UNIQUE ("postId", "userId");


--
-- TOC entry 4132 (class 2606 OID 17531)
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("postId");


--
-- TOC entry 4134 (class 2606 OID 17533)
-- Name: reported_posts reported_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reported_posts"
    ADD CONSTRAINT "reported_posts_pkey" PRIMARY KEY ("reportId");


--
-- TOC entry 4136 (class 2606 OID 17535)
-- Name: reported_posts reported_posts_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reported_posts"
    ADD CONSTRAINT "reported_posts_unique" UNIQUE ("userId", "reportedPostId");


--
-- TOC entry 4140 (class 2606 OID 17537)
-- Name: reported_users reported_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reported_users"
    ADD CONSTRAINT "reported_users_pkey" PRIMARY KEY ("reportId");


--
-- TOC entry 4142 (class 2606 OID 17539)
-- Name: reported_users reported_users_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reported_users"
    ADD CONSTRAINT "reported_users_unique" UNIQUE ("userId", "reportedUserId");


--
-- TOC entry 4144 (class 2606 OID 17541)
-- Name: skipped_categories skipped_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."skipped_categories"
    ADD CONSTRAINT "skipped_categories_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4146 (class 2606 OID 17543)
-- Name: skipped_categories skipped_categories_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."skipped_categories"
    ADD CONSTRAINT "skipped_categories_user_id_unique" UNIQUE ("userId", "categoryId");


--
-- TOC entry 4148 (class 2606 OID 17545)
-- Name: sound_categories sound_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."sound_categories"
    ADD CONSTRAINT "sound_categories_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4150 (class 2606 OID 17547)
-- Name: sounds sounds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."sounds"
    ADD CONSTRAINT "sounds_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4152 (class 2606 OID 17549)
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4079 (class 2606 OID 17551)
-- Name: user_blocks user_blocks_blocker_blocked_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_blocked_unique" UNIQUE ("userId", "blockedUserId");


--
-- TOC entry 4154 (class 2606 OID 17553)
-- Name: user_countries user_countries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_countries"
    ADD CONSTRAINT "user_countries_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4156 (class 2606 OID 17555)
-- Name: user_countries user_countries_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_countries"
    ADD CONSTRAINT "user_countries_unique" UNIQUE ("userId", "country");


--
-- TOC entry 4158 (class 2606 OID 17557)
-- Name: user_feedbacks user_feedbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_feedbacks"
    ADD CONSTRAINT "user_feedbacks_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4162 (class 2606 OID 17559)
-- Name: user_follows user_follows_follower_following_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_follower_following_unique" UNIQUE ("userId", "followedUserId");


--
-- TOC entry 4164 (class 2606 OID 17561)
-- Name: user_follows user_follows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_pkey" PRIMARY KEY ("followId");


--
-- TOC entry 4166 (class 2606 OID 17563)
-- Name: user_location_info user_location_info_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_location_info"
    ADD CONSTRAINT "user_location_info_pkey" PRIMARY KEY ("detailId");


--
-- TOC entry 4168 (class 2606 OID 17565)
-- Name: user_locations user_location_ip_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_locations"
    ADD CONSTRAINT "user_location_ip_unique" UNIQUE ("ip");


--
-- TOC entry 4170 (class 2606 OID 17567)
-- Name: user_locations user_location_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_locations"
    ADD CONSTRAINT "user_location_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4172 (class 2606 OID 17569)
-- Name: user_sounds user_sounds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_sounds"
    ADD CONSTRAINT "user_sounds_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4174 (class 2606 OID 17571)
-- Name: user_sounds user_sounds_un; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_sounds"
    ADD CONSTRAINT "user_sounds_un" UNIQUE ("soundId", "userId");


--
-- TOC entry 4176 (class 2606 OID 17573)
-- Name: users username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "username_unique" UNIQUE ("userName");


--
-- TOC entry 4178 (class 2606 OID 17575)
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_unique" UNIQUE ("email");


--
-- TOC entry 4180 (class 2606 OID 17577)
-- Name: users users_fb_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_fb_id_unique" UNIQUE ("fbId");


--
-- TOC entry 4182 (class 2606 OID 17579)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("userId");


--
-- TOC entry 4104 (class 1259 OID 17580)
-- Name: fki_password_reset_requests_users_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_password_reset_requests_users_fk" ON "public"."password_reset_requests" USING "btree" ("userId");


--
-- TOC entry 4119 (class 1259 OID 17581)
-- Name: fki_post_likes_post_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_post_likes_post_fk" ON "public"."post_likes" USING "btree" ("postId");


--
-- TOC entry 4120 (class 1259 OID 17582)
-- Name: fki_post_likes_user_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_post_likes_user_fk" ON "public"."post_likes" USING "btree" ("userId");


--
-- TOC entry 4125 (class 1259 OID 17583)
-- Name: fki_post_views_post_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_post_views_post_fk" ON "public"."post_views" USING "btree" ("postId");


--
-- TOC entry 4126 (class 1259 OID 17584)
-- Name: fki_post_views_user_id_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_post_views_user_id_fk" ON "public"."post_views" USING "btree" ("userId");


--
-- TOC entry 4137 (class 1259 OID 17585)
-- Name: fki_reported_users_reported_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_reported_users_reported_fk" ON "public"."reported_users" USING "btree" ("reportedUserId");


--
-- TOC entry 4138 (class 1259 OID 17586)
-- Name: fki_reported_users_user_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_reported_users_user_fk" ON "public"."reported_users" USING "btree" ("userId");


--
-- TOC entry 4159 (class 1259 OID 17587)
-- Name: fki_user_follows_followed_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_user_follows_followed_fk" ON "public"."user_follows" USING "btree" ("followedUserId");


--
-- TOC entry 4160 (class 1259 OID 17588)
-- Name: fki_user_follows_user_fk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_user_follows_user_fk" ON "public"."user_follows" USING "btree" ("userId");


--
-- TOC entry 4187 (class 2606 OID 17589)
-- Name: comment_likes comment_likes_comment_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_comment_fk" FOREIGN KEY ("commentId") REFERENCES "public"."post_comments"("commentId");


--
-- TOC entry 4188 (class 2606 OID 17594)
-- Name: comment_likes comment_likes_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_user_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId");


--
-- TOC entry 4189 (class 2606 OID 17599)
-- Name: password_reset_requests password_reset_requests_users_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."password_reset_requests"
    ADD CONSTRAINT "password_reset_requests_users_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE;


--
-- TOC entry 4190 (class 2606 OID 17604)
-- Name: post_blessings post_blessings_post_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_blessings"
    ADD CONSTRAINT "post_blessings_post_fk" FOREIGN KEY ("postId") REFERENCES "public"."posts"("postId");


--
-- TOC entry 4191 (class 2606 OID 17609)
-- Name: post_blessings post_blessings_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_blessings"
    ADD CONSTRAINT "post_blessings_user_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId");


--
-- TOC entry 4192 (class 2606 OID 17614)
-- Name: post_comments post_comments_post_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_post_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."posts"("postId");


--
-- TOC entry 4193 (class 2606 OID 17619)
-- Name: post_comments post_comments_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId");


--
-- TOC entry 4194 (class 2606 OID 17624)
-- Name: post_favourites post_favourites_post_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_favourites"
    ADD CONSTRAINT "post_favourites_post_fk" FOREIGN KEY ("postId") REFERENCES "public"."posts"("postId");


--
-- TOC entry 4195 (class 2606 OID 17629)
-- Name: post_favourites post_favourites_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_favourites"
    ADD CONSTRAINT "post_favourites_user_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId");


--
-- TOC entry 4196 (class 2606 OID 17634)
-- Name: post_likes post_likes_post_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_fk" FOREIGN KEY ("postId") REFERENCES "public"."posts"("postId");


--
-- TOC entry 4197 (class 2606 OID 17639)
-- Name: post_likes post_likes_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_user_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId");


--
-- TOC entry 4198 (class 2606 OID 17644)
-- Name: post_views post_views_post_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_views"
    ADD CONSTRAINT "post_views_post_fk" FOREIGN KEY ("postId") REFERENCES "public"."posts"("postId");


--
-- TOC entry 4199 (class 2606 OID 17649)
-- Name: post_views post_views_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."post_views"
    ADD CONSTRAINT "post_views_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId");


--
-- TOC entry 4200 (class 2606 OID 17654)
-- Name: posts posts_users_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_users_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId");


--
-- TOC entry 4202 (class 2606 OID 17659)
-- Name: reported_posts reported_posts_post_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reported_posts"
    ADD CONSTRAINT "reported_posts_post_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId");


--
-- TOC entry 4203 (class 2606 OID 17664)
-- Name: reported_posts reported_posts_reported_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reported_posts"
    ADD CONSTRAINT "reported_posts_reported_fk" FOREIGN KEY ("reportedPostId") REFERENCES "public"."posts"("postId");


--
-- TOC entry 4204 (class 2606 OID 17669)
-- Name: reported_users reported_users_reported_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reported_users"
    ADD CONSTRAINT "reported_users_reported_fk" FOREIGN KEY ("reportedUserId") REFERENCES "public"."users"("userId");


--
-- TOC entry 4205 (class 2606 OID 17674)
-- Name: reported_users reported_users_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reported_users"
    ADD CONSTRAINT "reported_users_user_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId");


--
-- TOC entry 4185 (class 2606 OID 17679)
-- Name: user_blocks user_blocks_blocked_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocked_fk" FOREIGN KEY ("blockedUserId") REFERENCES "public"."users"("userId");


--
-- TOC entry 4186 (class 2606 OID 17684)
-- Name: user_blocks user_blocks_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_user_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId");


--
-- TOC entry 4206 (class 2606 OID 17689)
-- Name: user_follows user_follows_followed_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_followed_fk" FOREIGN KEY ("followedUserId") REFERENCES "public"."users"("userId");


--
-- TOC entry 4207 (class 2606 OID 17694)
-- Name: user_follows user_follows_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_user_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId");


--
-- TOC entry 4208 (class 2606 OID 17699)
-- Name: user_location_info user_meta_userId_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_location_info"
    ADD CONSTRAINT "user_meta_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId");


--
-- TOC entry 4201 (class 2606 OID 17704)
-- Name: posts users_categories_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "users_categories_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("categoryId");


-- Completed on 2020-07-18 13:44:44 UTC

--
-- PostgreSQL database dump complete
--

