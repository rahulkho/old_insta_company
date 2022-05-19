import db from '../db';
import config from '../config';

export const categoriesWithPostsByCountry = (userId, country, paging) => {
  let conditions = [''];

  if (paging) {
    conditions.push(`c."priority" > ${paging}`);
  }

  conditions = conditions.join(' AND ');
  const rows = db.raw(
    `SELECT
      c."categoryId",
      c."priority",
      c."categoryName",
      c."imageUrl",
      c."isDeleted",
      (
        SELECT
          p."postId"
        FROM posts p
        WHERE p."userId" = ?
          AND p."categoryId" = c."categoryId" AND p."status" IN ('published', 'draft') 
        ORDER BY p."postId" DESC LIMIT 1
      ) "uploadedPostId",
      c."totalPosts",
      c."videoUrl",
      c."imageUrl",
      EXISTS(
        SELECT "id"
        FROM skipped_categories sc WHERE sc."categoryId" = c."categoryId" AND sc."userId" = ?
      ) "skipped",
      EXISTS(
        SELECT "postId"
        FROM posts p
        WHERE p."categoryId" = c."categoryId"
          AND p."userId" = ?
          AND p."status" = 'pubslished'
          
      ) "uploaded",
      (
        select array_to_json(array_agg(row_to_json(s)))
        from (
          select id, subcategory
          from subcategories
          where id = any(c.subcategories)
        ) s
      ) "subcategories",
      (
        select array_to_json(array_agg(row_to_json(k)))
        from (
          select id, keyword
          from keywords
          where id = any(c.keywords)
        ) k
      ) "keywords",
      c."rules",
      (
        SELECT(array_to_json(array_agg(row_to_json(p))))
        FROM (
          SELECT  p."postId",
            p."videoUrl",
            p."videoStreamUrl",
            p."imageUrl",
            p."userId",
            p."description",
            p."status",
            p."createdTs" ,
            p."updatedTs",
            p."isLandscape",
            p."soundId",
            p."iOSFront",
            p."duetWith",
            array_to_json(ARRAY(
              SELECT "userName"
              FROM users WHERE "userId" = ANY(p.mentions) AND "isActive" = TRUE AND "isDeleted" = FALSE
                AND "userId" NOT IN (
                  SELECT "userId" from user_blocks ub
                  WHERE ub."blockedUserId" = ?
                )
            )) "mentions",
            (
              SELECT
                COUNT("commentId")::INTEGER
              FROM post_comments pc
              WHERE pc."postId" = p."postId" AND pc."isDeleted" = FALSE
            ) "comments",
            (
              SELECT
                COUNT("likeId")::INTEGER
              FROM post_likes pl
              WHERE pl."postId" = p."postId"
            ) "likes",
            (
              SELECT
                COUNT("blessingId")::INTEGER
              FROM post_blessings pb
              WHERE pb."postId" = p."postId"
            ) "blessings",
            (
              SELECT
                COUNT("viewId")::INTEGER
              FROM post_views pv
              WHERE pv."postId" = p."postId"
            ) "views",
            EXISTS(
              SELECT
                "viewId"
              FROM post_views pv
              WHERE pv."postId" = p."postId" AND pv."userId" = ?
            ) "isViewed",
            EXISTS(
              SELECT
                "likeId"
              FROM post_likes l
              WHERE l."postId" = p."postId" AND l."userId" = ?
            ) "isLiked",
            EXISTS(
              SELECT
                "blessingId"
              FROM post_blessings b
              WHERE b."postId" = p."postId" AND b."userId" = ?
            ) "isBlessed",
            EXISTS(
              SELECT
                "reportId"
              FROM reported_users ru
              WHERE ru."reportedUserId" = p."userId" AND ru."userId" = ?
            ) "isUserReported",
            EXISTS(
              SELECT
                "reportId"
              FROM reported_posts rp
              WHERE rp."reportedPostId" = p."postId" AND rp."userId" = ?
            ) "isPostReported",
            EXISTS(
              SELECT
                "followId"
              FROM user_follows uf
              WHERE uf."followedUserId" = p."userId" AND uf."userId" = ?
            ) "isFollowed",
            (
              SELECT row_to_json(u)
                FROM(
                  SELECT
                    u."userId",
                    u."userName",
                    u."fullName",
                    u."imageUrl",
                    u."isActive",
                    u."isDeleted",
                    EXISTS(
                      SELECT
                        "blockId"
                      FROM user_blocks ub
                      WHERE ub."blockedUserId" = p."userId" AND ub."userId" = ?
                    ) "isBlocked",
                    EXISTS(
                      SELECT "blockId"
                      FROM user_blocks "ub"
                      WHERE ub."userId" = p."userId" AND ub."blockedUserId" = ?
                    ) "iAmBlocked",
                    EXISTS(
                      SELECT
                        "followId"
                      FROM user_follows uf
                      WHERE uf."followedUserId" = p."userId" AND uf."userId" = ?
                    ) "isFollowing",
                    EXISTS(
                      SELECT
                        "reportId"
                      FROM reported_users ru
                      WHERE ru."reportedUserId" = p."userId" AND ru."userId" = ?
                    ) "isReported",
                    (
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."userId"
                      WHERE uf."followedUserId" = p."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                    ) "followersCount",
                    (
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."followedUserId"
                      WHERE uf."userId" = p."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                    ) "followingsCount",
                    (
                      SELECT
                        COUNT("viewId")::INTEGER
                      FROM post_views v
                      JOIN posts p ON p."postId" = v."postId"
                      WHERE p."userId" = u."userId"
                        AND p."status" = 'published'
                    ) "postViewCount",
                    (
                      SELECT
                        COUNT("blessingId")::INTEGER
                      FROM post_blessings b
                      INNER JOIN posts p2 ON p2."userId" = u."userId"
                      WHERE b."postId" = p2."postId"
                    ) "blessCount",
                    (
                      SELECT
                        COUNT("postId")::INTEGER
                      FROM posts p
                      WHERE p."userId" = u."userId"
                        AND p."status" = 'published' 
                    ) "postCount"
                  FROM users u
                  WHERE u."userId" = p."userId"
                ) u
            ) "postedBy"
          FROM posts p
          WHERE p."categoryId" = c."categoryId" AND p."status" = 'published'
          ORDER BY views DESC
          LIMIT 4
        ) p
      ) "posts"
    FROM
    categories c
     JOIN posts p ON p."categoryId" = c."categoryId"
     JOIN users u ON u."userId" = p."userId"
     JOIN user_location_info uloc ON uloc."userId" = u."userId"
    WHERE c."isDeleted" = false AND c."totalPosts" > 0 AND p.status = 'published' AND uloc.country = ? ${conditions}

    GROUP BY c."categoryId" 
    ORDER BY priority ASC
    LIMIT ${config.paging.ROWS_PER_PAGE_20 + 1}
        `,
    [
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      country,
    ]
  );
  return rows;
};

export const categoriesWithPosts = (userId, paging) => {
  let conditions = [''];

  if (paging) {
    conditions.push(`c."priority" > ${paging}`);
  }

  conditions = conditions.join(' AND ');
  const rows = db.raw(
    `SELECT
      c."categoryId",
      c."priority",
      c."categoryName",
      c."imageUrl",
      c."isDeleted",
      (
        SELECT
          p."postId"
        FROM posts p
        WHERE p."userId" = ?
          AND p."categoryId" = c."categoryId" AND p."status" IN ('published', 'draft') 
        ORDER BY p."postId" DESC LIMIT 1
      ) "uploadedPostId",
      c."totalPosts",
      c."videoUrl",
      c."imageUrl",
      EXISTS(
        SELECT "id"
        FROM skipped_categories sc WHERE sc."categoryId" = c."categoryId" AND sc."userId" = ?
      ) "skipped",
      EXISTS(
        SELECT "postId"
        FROM posts p
        WHERE p."categoryId" = c."categoryId"
          AND p."userId" = ?
          AND p."status" = 'published'
          
      ) "uploaded",
      (
        select array_to_json(array_agg(row_to_json(s)))
        from (
          select id, subcategory
          from subcategories
          where id = any(c.subcategories)
        ) s
      ) "subcategories",
      (
        select array_to_json(array_agg(row_to_json(k)))
        from (
          select id, keyword
          from keywords
          where id = any(c.keywords)
        ) k
      ) "keywords",
      c."rules",
      (
        SELECT(array_to_json(array_agg(row_to_json(p))))
        FROM (
          SELECT  
            p."postId",
            p."videoUrl",
            p."videoStreamUrl",
            p."imageUrl",
            p."userId",
            p."description",
            p."status",
            p."createdTs" ,
            p."updatedTs",
            p."isLandscape",
            p."soundId",
            p."iOSFront",
            p."duetWith",
            array_to_json(ARRAY(
              SELECT "userName"
              FROM users WHERE "userId" = ANY(p.mentions) AND "isActive" = TRUE AND "isDeleted" = FALSE
                AND "userId" NOT IN (
                  SELECT "userId" from user_blocks ub
                  WHERE ub."blockedUserId" = ?
                )
            )) "mentions",
            (
              SELECT
                COUNT("commentId")::INTEGER
              FROM post_comments pc
              WHERE pc."postId" = p."postId" AND pc."isDeleted" = FALSE
            ) "comments",
            (
              SELECT
                COUNT("likeId")::INTEGER
              FROM post_likes pl
              WHERE pl."postId" = p."postId"
            ) "likes",
            (
              SELECT
                COUNT("blessingId")::INTEGER
              FROM post_blessings pb
              WHERE pb."postId" = p."postId"
            ) "blessings",
            (
              SELECT
                COUNT("viewId")::INTEGER
              FROM post_views pv
              WHERE pv."postId" = p."postId"
            ) "views",
            EXISTS(
              SELECT
                "viewId"
              FROM post_views pv
              WHERE pv."postId" = p."postId" AND pv."userId" = ?
            ) "isViewed",
            EXISTS(
              SELECT
                "likeId"
              FROM post_likes l
              WHERE l."postId" = p."postId" AND l."userId" = ?
            ) "isLiked",
            EXISTS(
              SELECT
                "blessingId"
              FROM post_blessings b
              WHERE b."postId" = p."postId" AND b."userId" = ?
            ) "isBlessed",
            EXISTS(
              SELECT
                "reportId"
              FROM reported_users ru
              WHERE ru."reportedUserId" = p."userId" AND ru."userId" = ?
            ) "isUserReported",
            EXISTS(
              SELECT
                "reportId"
              FROM reported_posts rp
              WHERE rp."reportedPostId" = p."postId" AND rp."userId" = ?
            ) "isPostReported",
            EXISTS(
              SELECT
                "followId"
              FROM user_follows uf
              WHERE uf."followedUserId" = p."userId" AND uf."userId" = ?
            ) "isFollowed",
            (
              SELECT row_to_json(u)
                FROM(
                  SELECT
                    u."userId",
                    u."userName",
                    u."fullName",
                    u."imageUrl",
                    u."isActive",
                    u."isDeleted",
                    EXISTS(
                      SELECT
                        "blockId"
                      FROM user_blocks ub
                      WHERE ub."blockedUserId" = p."userId" AND ub."userId" = ?
                    ) "isBlocked",
                    EXISTS(
                      SELECT "blockId"
                      FROM user_blocks "ub"
                      WHERE ub."userId" = p."userId" AND ub."blockedUserId" = ?
                    ) "iAmBlocked",
                    EXISTS(
                      SELECT
                        "followId"
                      FROM user_follows uf
                      WHERE uf."followedUserId" = p."userId" AND uf."userId" = ?
                    ) "isFollowing",
                    EXISTS(
                      SELECT
                        "reportId"
                      FROM reported_users ru
                      WHERE ru."reportedUserId" = p."userId" AND ru."userId" = ?
                    ) "isReported",
                    (
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."userId"
                      WHERE uf."followedUserId" = p."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                    ) "followersCount",
                    (
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."followedUserId"
                      WHERE uf."userId" = p."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                    ) "followingsCount",
                    (
                      SELECT
                        COUNT("viewId")::INTEGER
                      FROM post_views v
                      JOIN posts p ON p."postId" = v."postId"
                      WHERE p."userId" = u."userId"
                        AND p."status" = 'published'
                    ) "postViewCount",
                    (
                      SELECT
                        COUNT("blessingId")::INTEGER
                      FROM post_blessings b
                      INNER JOIN posts p2 ON p2."userId" = u."userId"
                      WHERE b."postId" = p2."postId"
                    ) "blessCount",
                    (
                      SELECT
                        COUNT("postId")::INTEGER
                      FROM posts p
                      WHERE p."userId" = u."userId"
                        AND p."status" = 'published' 
                    ) "postCount"
                  FROM users u
                  WHERE u."userId" = p."userId"
                ) u
            ) "postedBy"
          FROM posts p
          WHERE p."categoryId" = c."categoryId" AND p."status" = 'published'
          ORDER BY views DESC
          LIMIT 4
        ) p
      ) posts
    FROM
    categories c
    JOIN posts p ON p."categoryId" = c."categoryId"
    WHERE c."isDeleted" = false AND c."totalPosts" > 0 AND p.status = 'published' AND ${conditions}
    ORDER BY priority ASC
    LIMIT ${config.paging.ROWS_PER_PAGE_20 + 1}
        `,
    [
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
    ]
  );
  return rows;
};
