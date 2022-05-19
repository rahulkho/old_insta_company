import db from '../db';

const formatDates = (result) => {
  //console.log(result);
  return result.map((r) => {
    r.ts = new Date(r.ts).toISOString();
    if (r.replies) {
      r.replies = r.replies.map((rp) => {
        rp.ts = new Date(rp.ts).toISOString();
        return rp;
      });
    }
    return r;
  });
};
export const getBlessingsQuery = async (postId, userId, condition, limit) => {
  const query = `
      SELECT
        b."blessingId",
        u."userId",
        "userName",
        "fullName",
        "imageUrl",
        "country",
        "isActive",
        "isDeleted",
        EXISTS(
          SELECT "blockId"
          FROM user_blocks ub WHERE ub."blockedUserId" = u."userId"
          AND ub."userId" = ?
        ) "isBlocked",
        EXISTS(
          SELECT "blockId"
          FROM user_blocks "ub" WHERE ub."userId" = u."userId"
          AND ub."blockedUserId" = ?
        ) "iAmBlocked",
        EXISTS(
          SELECT
            "userId"
          FROM user_follows uf
          WHERE uf."followedUserId" = u."userId" AND uf."userId" = ?
        ) "isFollowing",
        EXISTS(
          SELECT
            "reportId"
          FROM reported_users ru
          WHERE ru."reportedUserId" = u."userId" AND ru."userId" = ?
        ) "isReported",
        (
          SELECT COUNT("followId")::INTEGER
          FROM user_follows uf
          JOIN users usr ON usr."userId" = uf."userId"
          WHERE uf."followedUserId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
        ) "followersCount",
        (
          SELECT COUNT("followId")::INTEGER
          FROM user_follows uf
          JOIN users usr ON usr."userId" = uf."followedUserId"
          WHERE uf."userId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
        ) "followingsCount",
        (
          SELECT COUNT("viewId")::INTEGER
          FROM post_views v
          JOIN posts p ON p."postId" = v."postId"
          WHERE p."userId" = u."userId"
            AND p."status" = 'published'
        ) "postViewCount",
        (
          SELECT COUNT("blessingId")::INTEGER
          FROM post_blessings b
          WHERE b."postId" IN (SELECT "postId" FROM posts p2 WHERE p2."userId" = u."userId")
        ) "blessCount",
        (
          SELECT
            COUNT(DISTINCT "categoryId")::integer
          FROM
            posts p
          WHERE
            p."userId" = u."userId"
            AND p."status" = 'published'
        ) "postCount"
      FROM users u
      JOIN post_blessings b
          ON b."userId" = u."userId"
      WHERE
        b."postId" = ?
        AND u."userId" NOT IN (
          SELECT ub."userId"
          FROM user_blocks ub
          WHERE ub."blockedUserId" = ?
        )
        AND u."isActive" = TRUE ${condition}
      ORDER BY "blessingId" DESC
      LIMIT ?
    `;

  //console.log(`[getBlessings] query: ${query}`);
  const result = await db.raw(query, [
    userId,
    userId,
    userId,
    userId,
    postId,
    userId,
    limit,
  ]);
  return result;
};
export const getLikesQuery = async (postId, userId, condition, limit) => {
  const query = `
      SELECT
        l."likeId",
        u."userId",
        "userName",
        "fullName",
        "imageUrl",
        "country",
        "isActive",
        "isDeleted",
        EXISTS(
          SELECT "blockId"
          FROM user_blocks ub WHERE ub."blockedUserId" = u."userId"
          AND ub."userId" = ?
        ) "isBlocked",
        EXISTS(
          SELECT "blockId"
          FROM user_blocks "ub" WHERE ub."userId" = u."userId"
          AND ub."blockedUserId" = ?
        ) "iAmBlocked",
        EXISTS(
          SELECT
            "userId"
          FROM user_follows uf
          WHERE uf."followedUserId" = u."userId" AND uf."userId" = ?
        ) "isFollowing",
        EXISTS(
          SELECT
            "reportId"
          FROM reported_users ru
          WHERE ru."reportedUserId" = u."userId" AND ru."userId" = ?
        ) "isReported",
        (
          SELECT COUNT("followId")::INTEGER
          FROM user_follows uf
          JOIN users usr ON usr."userId" = uf."userId"
          WHERE uf."followedUserId" = u."userId"  AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
        ) "followersCount",
        (
          SELECT COUNT("followId")::INTEGER
          FROM user_follows uf
          JOIN users usr ON usr."userId" = uf."followedUserId"
          WHERE uf."userId" = u."userId"  AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
        ) "followingsCount",
        (
          SELECT COUNT("viewId")::INTEGER
          FROM post_views v
          JOIN posts p ON p."postId" = v."postId"
          WHERE p."userId" = u."userId"
            AND p."status" = 'published'
        ) "postViewCount",
        (
          SELECT COUNT("blessingId")::INTEGER
          FROM post_blessings b
          WHERE b."postId" IN (SELECT "postId" FROM posts p2 WHERE p2."userId" = u."userId")
        ) "blessCount",
        (
          SELECT
            COUNT(DISTINCT "categoryId")::integer
          FROM
            posts p
          WHERE
            p."userId" = u."userId"
            AND p."status" = 'published'
        ) "postCount"
      FROM users u
      JOIN post_likes l
          ON l."userId" = u."userId"
      WHERE
        l."postId" = ?
        ${condition}
      ORDER BY "likeId" DESC
      LIMIT ?
    `;

  const result = await db.raw(query, [
    userId,
    userId,
    userId,
    userId,
    postId,
    limit,
  ]);
  return result;
};

export const getSingleComment = async (commentId, userId) => {
  try {
    const query = `
        SELECT
          c."commentId",
          c."comment",
          c.likes,
          EXISTS(
            SELECT
              "likeId"
            FROM comment_likes cl
            WHERE cl."commentId" = c."commentId" AND cl."userId" = ?
          ) "isLiked",
          array_to_json(ARRAY(
            SELECT "userName"
            FROM users WHERE "userId" = ANY(c.mentions) AND "isActive" = TRUE AND "isDeleted" = FALSE
              AND "userId" NOT IN (
                SELECT "userId" from user_blocks ub
                WHERE ub."blockedUserId" = ?
              )
          )) "mentions",
          c."ts",
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
                  u."description",
                  EXISTS(
                    SELECT "blockId"
                    FROM user_blocks ub WHERE ub."blockedUserId" = c."userId"
                    AND ub."userId" = ?
                  ) "isBlocked",
                  EXISTS(
                    SELECT "blockId"
                    FROM user_blocks "ub" WHERE ub."userId" = c."userId"
                    AND ub."blockedUserId" = ?
                  ) "iAmBlocked",
                  EXISTS(
                    SELECT "followId"
                    FROM user_follows uf WHERE uf."followedUserId" = c."userId"
                    AND uf."userId" = ?
                  ) "isFollowing",
                  EXISTS(
                    SELECT "reportId"
                    FROM reported_users ru
                    WHERE ru."reportedUserId" = c."userId" AND ru."userId" = ?
                  ) "isReported",
                  (
                    SELECT COUNT("followId")::INTEGER
                    FROM user_follows uf
                    JOIN users usr ON usr."userId" = uf."userId"
                    WHERE uf."followedUserId" = c."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                  ) "followersCount",
                  (
                    SELECT COUNT("followId")::INTEGER
                    FROM user_follows uf
                    JOIN users usr ON usr."userId" = uf."followedUserId"
                    WHERE uf."userId" = c."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                  ) "followingsCount",
                  (
                    SELECT COUNT("viewId")::INTEGER
                    FROM post_views v
                    JOIN posts p ON p."postId" = v."postId"
                    WHERE p."userId" = u."userId"
                      AND p."status" = 'published'
                  ) "postViewCount",
                  (
                    SELECT COUNT("blessingId")::INTEGER
                    FROM post_blessings b
                    INNER JOIN posts p2 ON p2."userId" = c."userId"
                    WHERE b."postId" = p2."postId"
                  ) "blessCount",
                  (
                    SELECT
                      COUNT(DISTINCT "categoryId")::integer
                    FROM
                      posts p
                    WHERE
                      p."userId" = u."userId" AND p."status" = 'published'
                  ) "postCount"
                FROM users u WHERE u."userId" = c."userId"
            ) u
          ) "postedBy",
          (
            SELECT array_to_json(array_agg(row_to_json(t)))
              FROM (
                SELECT
                  r."commentId",
                  r."comment",
                  r.likes,
                  EXISTS(
                    SELECT
                      "likeId"
                    FROM comment_likes cl
                    WHERE cl."commentId" = r."commentId" AND cl."userId" = ?
                  ) "isLiked",
                  array_to_json(ARRAY(
                    SELECT "userName"
                    FROM users WHERE "userId" = ANY(r.mentions) AND "isActive" = TRUE AND "isDeleted" = FALSE
                      AND "userId" NOT IN (
                        SELECT "userId" from user_blocks ub
                        WHERE ub."blockedUserId" = ?
                      )
                  )) "mentions",
                  r."ts",
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
                          u."description",
                          EXISTS(
                            SELECT "blockId"
                            FROM user_blocks ub WHERE ub."blockedUserId" = r."userId"
                            AND ub."userId" = ?
                          ) "isBlocked",
                          EXISTS(
                            SELECT "blockId"
                            FROM user_blocks "ub" WHERE ub."userId" = r."userId"
                            AND ub."blockedUserId" = ?
                          ) "iAmBlocked",
                          EXISTS(
                            SELECT "followId"
                            FROM user_follows uf WHERE uf."followedUserId" = r."userId"
                            AND uf."userId" = ?
                          ) "isFollowing",
                          EXISTS(
                            SELECT "reportId"
                            FROM reported_users ru
                            WHERE ru."reportedUserId" = r."userId" AND ru."userId" = ?
                          ) "isReported",
                          (
                            SELECT COUNT("followId")::INTEGER
                            FROM user_follows uf
                            JOIN users usr ON usr."userId" = uf."userId"
                            WHERE uf."followedUserId" = r."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                          ) "followersCount",
                          (
                            SELECT COUNT("followId")::INTEGER
                            FROM user_follows uf
                            JOIN users usr ON usr."userId" = uf."followedUserId"
                            WHERE uf."userId" = r."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                          ) "followingsCount",
                          (
                            SELECT COUNT("viewId")::INTEGER
                            FROM post_views v
                            JOIN posts p ON p."postId" = v."postId"
                            WHERE p."userId" = u."userId"
                              AND p."status" = 'published'
                          ) "postViewCount",
                          (
                            SELECT COUNT("blessingId")::INTEGER
                            FROM post_blessings b
                            INNER JOIN posts p2 ON p2."userId" = r."userId"
                            WHERE b."postId" = p2."postId"
                          ) "blessCount",
                          (
                            SELECT
                              COUNT(DISTINCT "categoryId")::integer
                            FROM
                              posts p
                            WHERE
                              p."userId" = u."userId" AND p."status" = 'published'
                          ) "postCount"
                        FROM users u WHERE u."userId" = r."userId"
                      ) u
                    ) "postedBy"
                FROM post_comments r
                WHERE r."replyTo" = c."commentId"
                  AND r."userId" NOT IN(
                    SELECT ub."userId"
                    FROM user_blocks ub
                    WHERE ub."blockedUserId" = ?
                  )
                ORDER BY r."commentId" DESC
              ) t
          ) replies
        FROM post_comments c
        WHERE c."commentId" = ?
     `;

    const result = await db.raw(query, [
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
      commentId,
    ]);
    return formatDates(result.rows);
  } catch (error) {
    console.log(`[getSingleComment] error: ${error.stack}`);
    return null;
  }
};

export const getCommentsQuery = async (postId, userId, condition, limit) => {
  let requesterId = userId;

  const result = await db.raw(
    `
      SELECT
        c."commentId",
        c."comment",
        c.likes,
        EXISTS(
          SELECT
             "likeId"
          FROM comment_likes cl
          WHERE cl."commentId" = c."commentId" AND cl."userId" = ?
        ) "isLiked",
        array_to_json(ARRAY(
          SELECT "userName"
          FROM users WHERE "userId" = ANY(c.mentions) AND "isActive" = TRUE AND "isDeleted" = FALSE
            AND "userId" NOT IN (
              SELECT "userId" from user_blocks ub
              WHERE ub."blockedUserId" = ?
            )
        )) "mentions",
        c."ts",
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
                u."description",
                EXISTS(
                  SELECT "blockId"
                  FROM user_blocks ub WHERE ub."blockedUserId" = c."userId"
                  AND ub."userId" = ?
                ) "isBlocked",
                EXISTS(
                  SELECT "blockId"
                  FROM user_blocks "ub" WHERE ub."userId" = c."userId"
                  AND ub."blockedUserId" = ?
                ) "iAmBlocked",
                EXISTS(
                  SELECT "followId"
                  FROM user_follows uf WHERE uf."followedUserId" = c."userId"
                  AND uf."userId" = ?
                ) "isFollowing",
                EXISTS(
                  SELECT "reportId"
                  FROM reported_users ru
                  WHERE ru."reportedUserId" = c."userId" AND ru."userId" = ?
                ) "isReported",
                (
                  SELECT COUNT("followId")::INTEGER
                  FROM user_follows uf
                  JOIN users usr ON usr."userId" = uf."userId"
                  WHERE uf."followedUserId" = c."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                ) "followersCount",
                (
                  SELECT COUNT("followId")::INTEGER
                  FROM user_follows uf
                  JOIN users usr ON usr."userId" = uf."followedUserId"
                  WHERE uf."userId" = c."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                ) "followingsCount",
                (
                  SELECT COUNT("viewId")::INTEGER
                  FROM post_views v
                  JOIN posts p ON p."postId" = v."postId"
                  WHERE p."userId" = u."userId"
                    AND p."status" = 'published'
                ) "postViewCount",
                (
                  SELECT COUNT("blessingId")::INTEGER
                  FROM post_blessings b
                  INNER JOIN posts p2 ON p2."userId" = c."userId"
                  WHERE b."postId" = p2."postId"
                ) "blessCount",
                (
                  SELECT
                    COUNT(DISTINCT "categoryId")::integer
                  FROM
                    posts p
                  WHERE
                    p."userId" = u."userId" AND p."status" = 'published'
                ) "postCount"
              FROM users u WHERE u."userId" = c."userId"
          ) u
        ) "postedBy",
        (
          SELECT array_to_json(array_agg(row_to_json(t)))
            FROM (
              SELECT
                r."commentId",
                r."comment",
                r.likes,
                EXISTS(
                  SELECT
                    "likeId"
                  FROM comment_likes cl
                  WHERE cl."commentId" = r."commentId" AND cl."userId" = ?
                ) "isLiked",
                array_to_json(ARRAY(
                  SELECT "userName"
                  FROM users WHERE "userId" = ANY(r.mentions) AND "isActive" = TRUE AND "isDeleted" = FALSE
                    AND "userId" NOT IN (
                      SELECT "userId" from user_blocks ub
                      WHERE ub."blockedUserId" = ?
                    )
                )) "mentions",
                r."ts",
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
                        u."description",
                        EXISTS(
                          SELECT "blockId"
                          FROM user_blocks ub WHERE ub."blockedUserId" = r."userId"
                          AND ub."userId" = ?
                        ) "isBlocked",
                        EXISTS(
                          SELECT "blockId"
                          FROM user_blocks "ub" WHERE ub."userId" = r."userId"
                          AND ub."blockedUserId" = ?
                        ) "iAmBlocked",
                        EXISTS(
                          SELECT "followId"
                          FROM user_follows uf WHERE uf."followedUserId" = r."userId"
                          AND uf."userId" = ?
                        ) "isFollowing",
                        EXISTS(
                          SELECT "reportId"
                          FROM reported_users ru
                          WHERE ru."reportedUserId" = r."userId" AND ru."userId" = ?
                        ) "isReported",
                        (
                          SELECT COUNT("followId")::INTEGER
                          FROM user_follows uf
                          JOIN users usr ON usr."userId" = uf."userId"
                          WHERE uf."followedUserId" = r."userId"  AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                        ) "followersCount",
                        (
                          SELECT COUNT("followId")::INTEGER
                          FROM user_follows uf
                          JOIN users usr ON usr."userId" = uf."followedUserId"
                          WHERE uf."userId" = r."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                        ) "followingsCount",
                        (
                          SELECT COUNT("viewId")::INTEGER
                          FROM post_views v
                          JOIN posts p ON p."postId" = v."postId"
                          WHERE p."userId" = u."userId"
                            AND p."status" = 'published'
                        ) "postViewCount",
                        (
                          SELECT COUNT("blessingId")::INTEGER
                          FROM post_blessings b
                          INNER JOIN posts p2 ON p2."userId" = r."userId"
                          WHERE b."postId" = p2."postId"
                        ) "blessCount",
                        (
                          SELECT
                            COUNT(DISTINCT "categoryId")::integer
                          FROM
                            posts p
                          WHERE
                            p."userId" = u."userId"
                            AND p."status" = 'published'
                        ) "postCount"
                      FROM users u WHERE u."userId" = r."userId"
                    ) u
                  ) "postedBy"
              FROM post_comments r
              WHERE r."replyTo" = c."commentId"
                AND r."isDeleted" = FALSE
              ORDER BY r."commentId" DESC
            ) t
        ) replies
      FROM post_comments c
      WHERE c."postId" = ?
        AND c."isDeleted" = FALSE
        AND c."replyTo" IS NULL ${condition}
      ORDER BY "commentId" DESC
      LIMIT ?
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
      postId,
      limit,
    ]
  );

  return formatDates(result.rows);
};

export const getSinglePost = async (postId, userId) => {
  //console.log(`[getSinglePost] postId: ${postId}`);
  const query = `
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
        p."duetWith",
        p."soundId",
        p."isOpen",
        p."iOSFront",
        array_to_json(ARRAY(
          SELECT "userName"
          FROM users
          WHERE "userId" = ANY(p.mentions) AND "isActive" = TRUE AND "isDeleted" = FALSE
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
                u."description",
                EXISTS(
                  SELECT
                    "blockId"
                  FROM user_blocks ub
                  WHERE ub."blockedUserId" = p."userId" AND ub."userId" = ?
                ) "isBlocked",
                EXISTS(
                  SELECT "blockId"
                  FROM user_blocks "ub" WHERE ub."userId" = p."userId"
                  AND ub."blockedUserId" = ?
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
                    COUNT(DISTINCT "categoryId")::integer
                  FROM
                    posts p
                  WHERE
                    p."userId" = u."userId"
                    AND p."status" = 'published'
                ) "postCount"
              FROM users u
              WHERE u."userId" = p."userId"
            ) u
        ) "postedBy",
        (
          SELECT row_to_json(c)
            FROM(
              SELECT
                c."categoryId",
                c."categoryName",
                c."isDeleted",
                c."imageUrl",
                EXISTS(
                  SELECT
                    "postId"
                  FROM posts as p
                  WHERE p."categoryId" = c."categoryId" AND p."userId" = ? AND p."status" IN ('published', 'draft')
                ) as "postAdded",
                c."totalPosts"
              FROM categories as c
              WHERE c."categoryId" = p."categoryId"
            ) c
        ) "category",
        (
          SELECT row_to_json(s)
            FROM(
              SELECT
                s."id",
                s."title",
                s."duration",
                s."streamUrl",
                s."createdAt"
              FROM sounds s
              WHERE s."id" = p."soundId"
            ) s
        ) "sound"
      FROM posts as p
      WHERE
        p."postId" = ?
        AND p."userId" NOT IN(
          SELECT ub."userId"
          FROM user_blocks ub
          WHERE ub."blockedUserId" = ? 
        )`;
  //console.log(`[getSinglePost] query: ${query}`);
  const result = await db.raw(query, [
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
    postId,
    userId,
  ]);
  return result.rows;
};

const baseQuery = (userId) => {
  const query = db('posts as p').select([
    'p.postId',
    'p.videoUrl',
    'p.videoStreamUrl',
    'p.imageUrl',
    'p.userId',
    'p.description',
    'p.status',
    'p.createdTs',
    'p.updatedTs',
    'p.isLandscape',
    'p.isOpen',
    'p.soundId',
    'p.iOSFront',
    'p.duetWith',
    db.raw(
      `
      array_to_json(ARRAY(
        SELECT "userName"
        FROM users WHERE "userId" = ANY(p.mentions) AND "isActive" = TRUE AND "isDeleted" = FALSE
          AND "userId" NOT IN (
            SELECT "userId" from user_blocks ub
            WHERE ub."blockedUserId" = ?
          )
      )) "mentions"
    `,
      [userId]
    ),
    db.raw(`(
      SELECT
          COUNT("commentId")::INTEGER
        FROM post_comments pc
        WHERE pc."postId" = p."postId" AND pc."isDeleted" = FALSE
      ) "comments"
    `),
    db.raw(`(
      SELECT
        COUNT("likeId")::INTEGER
        FROM post_likes pl
        WHERE pl."postId" = p."postId"
      ) "likes"
    `),
    db.raw(`
     (
        SELECT
          COUNT("blessingId")::INTEGER
        FROM post_blessings pb
        WHERE pb."postId" = p."postId"
      ) "blessings"
    `),
    db.raw(`
    (
      SELECT
        COUNT("viewId")::INTEGER
      FROM post_views pv
      WHERE pv."postId" = p."postId"
    ) "views"
    `),
    db.raw(
      `
      EXISTS(
        SELECT
          "viewId"
        FROM post_views pv
        WHERE pv."postId" = p."postId" AND pv."userId" = ?
      ) "isViewed"
    `,
      [userId]
    ),
    db.raw(
      `
     EXISTS(
        SELECT
          "likeId"
        FROM post_likes l
        WHERE l."postId" = p."postId" AND l."userId" = ?
      ) "isLiked"
    `,
      [userId]
    ),
    db.raw(
      `
      EXISTS(
          SELECT
            "blessingId"
          FROM post_blessings b
          WHERE b."postId" = p."postId" AND b."userId" = ?
        ) "isBlessed"
    `,
      [userId]
    ),
    db.raw(
      `
      EXISTS(
        SELECT
          "reportId"
        FROM reported_users ru
        WHERE ru."reportedUserId" = p."userId" AND ru."userId" = ?
      ) "isUserReported"
    `,
      [userId]
    ),
    db.raw(
      `
      EXISTS(
        SELECT
          "reportId"
        FROM reported_posts rp
        WHERE rp."reportedPostId" = p."postId" AND rp."userId" = ?
      ) "isPostReported"`,
      [userId]
    ),
    db.raw(
      `
      EXISTS(
        SELECT
          "followId"
        FROM user_follows uf
        WHERE uf."followedUserId" = p."userId" AND uf."userId" = ?
      ) "isFollowed"`,
      [userId]
    ),
    db.raw(
      `
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
              u."description",
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
                  COUNT(DISTINCT "categoryId")::integer
                FROM
                  posts p
                WHERE
                  p."userId" = u."userId" AND p."status" = 'published'
              ) "postCount"
            FROM users u
            WHERE u."userId" = p."userId"
          ) u
      ) "postedBy"
    `,
      [userId, userId, userId, userId]
    ),
    db.raw(
      `
      (
        SELECT row_to_json(c)
          FROM(
            SELECT
              c."categoryId",
              c."categoryName",
              c."isDeleted",
              c."imageUrl",
              EXISTS(
                SELECT
                  "postId"
                FROM posts p
                WHERE p."categoryId" = c."categoryId" AND p."userId" = ? AND p."status" IN ('published', 'draft')
              ) "postAdded",
              c."totalPosts"
            FROM categories c
            WHERE c."categoryId" = p."categoryId"
          ) c
      ) category
    `,
      [userId]
    ),
  ]);
  return query;
};

export const searchBySoundId = (soundId, userId, limit, offset) => {
  // const query = db('posts as p')
  //   .select([
  //     'postId',
  //     'videoUrl',
  //     'videoStreamUrl',
  //     'imageUrl',
  //     'userId',
  //     'description',
  //     'status',
  //     'createdTs',
  //     'updatedTs',
  //     'isLandscape',
  //     'isOpen',
  //     'soundId',
  //     'iOSFront',

  //     db.raw(
  //       `
  //     array_to_json(ARRAY(
  //       SELECT "userName"
  //       FROM users WHERE "userId" = ANY(p.mentions) AND "isActive" = TRUE AND "isDeleted" = FALSE
  //         AND "userId" NOT IN (
  //           SELECT "userId" from user_blocks ub
  //           WHERE ub."blockedUserId" = ?
  //         )
  //     )) "mentions"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(`(
  //     SELECT
  //         COUNT("commentId")::INTEGER
  //       FROM post_comments pc
  //       WHERE pc."postId" = p."postId" AND pc."isDeleted" = FALSE
  //     ) "comments"
  //   `),
  //     db.raw(`(
  //     SELECT
  //       COUNT("likeId")::INTEGER
  //       FROM post_likes pl
  //       WHERE pl."postId" = p."postId"
  //     ) "likes"
  //   `),
  //     db.raw(`
  //    (
  //       SELECT
  //         COUNT("blessingId")::INTEGER
  //       FROM post_blessings pb
  //       WHERE pb."postId" = p."postId"
  //     ) "blessings"
  //   `),
  //     db.raw(`
  //   (
  //     SELECT
  //       COUNT("viewId")::INTEGER
  //     FROM post_views pv
  //     WHERE pv."postId" = p."postId"
  //   ) "views"
  //   `),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "viewId"
  //       FROM post_views pv
  //       WHERE pv."postId" = p."postId" AND pv."userId" = ?
  //     ) "isViewed"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //    EXISTS(
  //       SELECT
  //         "likeId"
  //       FROM post_likes l
  //       WHERE l."postId" = p."postId" AND l."userId" = ?
  //     ) "isLiked"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //         SELECT
  //           "blessingId"
  //         FROM post_blessings b
  //         WHERE b."postId" = p."postId" AND b."userId" = ?
  //       ) "isBlessed"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "reportId"
  //       FROM reported_users ru
  //       WHERE ru."reportedUserId" = p."userId" AND ru."userId" = ?
  //     ) "isUserReported"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "reportId"
  //       FROM reported_posts rp
  //       WHERE rp."reportedPostId" = p."postId" AND rp."userId" = ?
  //     ) "isPostReported"`,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "followId"
  //       FROM user_follows uf
  //       WHERE uf."followedUserId" = p."userId" AND uf."userId" = ?
  //     ) "isFollowed"`,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     (
  //       SELECT row_to_json(u)
  //         FROM(
  //           SELECT
  //             u."userId",
  //             u."userName",
  //             u."fullName",
  //             u."imageUrl",
  //             u."isActive",
  //             u."isDeleted",
  //             u."description",
  //             EXISTS(
  //               SELECT
  //                 "blockId"
  //               FROM user_blocks ub
  //               WHERE ub."blockedUserId" = p."userId" AND ub."userId" = ?
  //             ) "isBlocked",
  //             EXISTS(
  //               SELECT "blockId"
  //               FROM user_blocks "ub"
  //               WHERE ub."userId" = p."userId" AND ub."blockedUserId" = ?
  //             ) "iAmBlocked",
  //             EXISTS(
  //               SELECT
  //                 "followId"
  //               FROM user_follows uf
  //               WHERE uf."followedUserId" = p."userId" AND uf."userId" = ?
  //             ) "isFollowing",
  //             EXISTS(
  //               SELECT
  //                 "reportId"
  //               FROM reported_users ru
  //               WHERE ru."reportedUserId" = p."userId" AND ru."userId" = ?
  //             ) "isReported",
  //             (
  //               SELECT
  //                 COUNT("followId")::INTEGER
  //               FROM user_follows uf
  //               JOIN users usr ON usr."userId" = uf."userId"
  //               WHERE uf."followedUserId" = p."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
  //             ) "followersCount",
  //             (
  //               SELECT
  //                 COUNT("followId")::INTEGER
  //               FROM user_follows uf
  //               JOIN users usr ON usr."userId" = uf."followedUserId"
  //               WHERE uf."userId" = p."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
  //             ) "followingsCount",
  //             (
  //               SELECT
  //                 COUNT("viewId")::INTEGER
  //               FROM post_views v
  //               JOIN posts p ON p."postId" = v."postId"
  //               WHERE p."userId" = u."userId"
  //                 AND p."status" = 'published'
  //             ) "postViewCount",
  //             (
  //               SELECT
  //                 COUNT("blessingId")::INTEGER
  //               FROM post_blessings b
  //               INNER JOIN posts p2 ON p2."userId" = u."userId"
  //               WHERE b."postId" = p2."postId"
  //             ) "blessCount",
  //             (
  //                 SELECT
  //                     COUNT(DISTINCT "categoryId")::integer
  //                   FROM
  //                     posts p
  //                   WHERE
  //                     p."userId" = u."userId" AND p."status" = 'published'
  //             ) "postCount"
  //           FROM users u
  //           WHERE u."userId" = p."userId"
  //         ) u
  //     ) "postedBy"
  //   `,
  //       [userId, userId, userId, userId]
  //     ),
  //     db.raw(
  //       `
  //     (
  //       SELECT row_to_json(c)
  //         FROM(
  //           SELECT
  //             c."categoryId",
  //             c."categoryName",
  //             c."isDeleted",
  //             c."imageUrl",
  //             EXISTS(
  //               SELECT
  //                 "postId"
  //               FROM posts p
  //               WHERE p."categoryId" = c."categoryId" AND p."userId" = ? AND p."status" IN ('published', 'draft')
  //             ) "postAdded",
  //             c."totalPosts"
  //           FROM categories c
  //           WHERE c."categoryId" = p."categoryId"
  //         ) c
  //     ) category
  //   `,
  //       [userId]
  //     ),
  //   ]);
  const query = baseQuery(userId);
  query
    .where('p.status', 'published')
    .andWhere('p.soundId', soundId)
    .andWhereRaw(
      `p."userId" NOT IN ( SELECT "userId" FROM user_blocks ub WHERE ub."blockedUserId" = ?)`,
      [userId]
    );

  if (offset) {
    query.andWhere('p.postId', '<=', offset);
  }

  query.orderBy('p.views', 'desc');
  query.limit(limit);

  //console.log(query.toSQL());
  return query;
};
export const searchByCategory = (categoryId, userId, limit, offset) => {
  // const query = db('posts as p')
  //   .select([
  //     'postId',
  //     'videoUrl',
  //     'videoStreamUrl',
  //     'imageUrl',
  //     'userId',
  //     'description',
  //     'status',
  //     'createdTs',
  //     'updatedTs',
  //     'isLandscape',
  //     'isOpen',
  //     'soundId',
  //     'iOSFront',
  //     db.raw(
  //       `
  //     array_to_json(ARRAY(
  //       SELECT "userName"
  //       FROM users WHERE "userId" = ANY(p.mentions) AND "isActive" = TRUE AND "isDeleted" = FALSE
  //         AND "userId" NOT IN (
  //           SELECT "userId" from user_blocks ub
  //           WHERE ub."blockedUserId" = ?
  //         )
  //     )) "mentions"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(`(
  //     SELECT
  //         COUNT("commentId")::INTEGER
  //       FROM post_comments pc
  //       WHERE pc."postId" = p."postId" AND pc."isDeleted" = FALSE
  //     ) "comments"
  //   `),
  //     db.raw(`(
  //     SELECT
  //       COUNT("likeId")::INTEGER
  //       FROM post_likes pl
  //       WHERE pl."postId" = p."postId"
  //     ) "likes"
  //   `),
  //     db.raw(`
  //    (
  //       SELECT
  //         COUNT("blessingId")::INTEGER
  //       FROM post_blessings pb
  //       WHERE pb."postId" = p."postId"
  //     ) "blessings"
  //   `),
  //     db.raw(`
  //   (
  //     SELECT
  //       COUNT("viewId")::INTEGER
  //     FROM post_views pv
  //     WHERE pv."postId" = p."postId"
  //   ) "views"
  //   `),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "viewId"
  //       FROM post_views pv
  //       WHERE pv."postId" = p."postId" AND pv."userId" = ?
  //     ) "isViewed"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //    EXISTS(
  //       SELECT
  //         "likeId"
  //       FROM post_likes l
  //       WHERE l."postId" = p."postId" AND l."userId" = ?
  //     ) "isLiked"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //         SELECT
  //           "blessingId"
  //         FROM post_blessings b
  //         WHERE b."postId" = p."postId" AND b."userId" = ?
  //       ) "isBlessed"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "reportId"
  //       FROM reported_users ru
  //       WHERE ru."reportedUserId" = p."userId" AND ru."userId" = ?
  //     ) "isUserReported"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "reportId"
  //       FROM reported_posts rp
  //       WHERE rp."reportedPostId" = p."postId" AND rp."userId" = ?
  //     ) "isPostReported"`,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "followId"
  //       FROM user_follows uf
  //       WHERE uf."followedUserId" = p."userId" AND uf."userId" = ?
  //     ) "isFollowed"`,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     (
  //       SELECT row_to_json(u)
  //         FROM(
  //           SELECT
  //             u."userId",
  //             u."userName",
  //             u."fullName",
  //             u."imageUrl",
  //             u."isActive",
  //             u."isDeleted",
  //             u."description",
  //             EXISTS(
  //               SELECT
  //                 "blockId"
  //               FROM user_blocks ub
  //               WHERE ub."blockedUserId" = p."userId" AND ub."userId" = ?
  //             ) "isBlocked",
  //             EXISTS(
  //               SELECT "blockId"
  //               FROM user_blocks "ub"
  //               WHERE ub."userId" = p."userId" AND ub."blockedUserId" = ?
  //             ) "iAmBlocked",
  //             EXISTS(
  //               SELECT
  //                 "followId"
  //               FROM user_follows uf
  //               WHERE uf."followedUserId" = p."userId" AND uf."userId" = ?
  //             ) "isFollowing",
  //             EXISTS(
  //               SELECT
  //                 "reportId"
  //               FROM reported_users ru
  //               WHERE ru."reportedUserId" = p."userId" AND ru."userId" = ?
  //             ) "isReported",
  //             (
  //               SELECT
  //                 COUNT("followId")::INTEGER
  //               FROM user_follows uf
  //               JOIN users usr ON usr."userId" = uf."userId"
  //               WHERE uf."followedUserId" = p."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
  //             ) "followersCount",
  //             (
  //               SELECT
  //                 COUNT("followId")::INTEGER
  //               FROM user_follows uf
  //               JOIN users usr ON usr."userId" = uf."followedUserId"
  //               WHERE uf."userId" = p."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
  //             ) "followingsCount",
  //             (
  //               SELECT
  //                 COUNT("viewId")::INTEGER
  //               FROM post_views v
  //               JOIN posts p ON p."postId" = v."postId"
  //               WHERE p."userId" = u."userId"
  //                 AND p."status" = 'published'
  //             ) "postViewCount",
  //             (
  //               SELECT
  //                 COUNT("blessingId")::INTEGER
  //               FROM post_blessings b
  //               INNER JOIN posts p2 ON p2."userId" = u."userId"
  //               WHERE b."postId" = p2."postId"
  //             ) "blessCount",
  //             (
  //               SELECT
  //                 COUNT(DISTINCT "categoryId")::integer
  //               FROM
  //                 posts p
  //               WHERE
  //                 p."userId" = u."userId" AND p."status" = 'published'
  //             ) "postCount"
  //           FROM users u
  //           WHERE u."userId" = p."userId"
  //         ) u
  //     ) "postedBy"
  //   `,
  //       [userId, userId, userId, userId]
  //     ),
  //     db.raw(
  //       `
  //     (
  //       SELECT row_to_json(c)
  //         FROM(
  //           SELECT
  //             c."categoryId",
  //             c."categoryName",
  //             c."isDeleted",
  //             c."imageUrl",
  //             EXISTS(
  //               SELECT
  //                 "postId"
  //               FROM posts p
  //               WHERE p."categoryId" = c."categoryId" AND p."userId" = ? AND p."status" IN ('published', 'draft')
  //             ) "postAdded",
  //             c."totalPosts"
  //           FROM categories c
  //           WHERE c."categoryId" = p."categoryId"
  //         ) c
  //     ) category
  //   `,
  //       [userId]
  //     ),
  //   ]);
  const query = baseQuery(userId);
  query
    .where('p.status', 'published')
    .andWhere('p.categoryId', categoryId)
    .andWhereRaw(
      `p."userId" NOT IN ( SELECT "userId" FROM user_blocks ub WHERE ub."blockedUserId" = ?)`,
      [userId]
    );

  if (offset) {
    query.andWhere('p.views', '<=', offset);
  }

  query.orderBy('p.views', 'desc');
  query.limit(limit);

  //console.log(query.toSQL());
  return query;

  // .andWhereRaw(
  //     `(p."categoryId" IN ( SELECT "categoryId" FROM categories WHERE "categoryName" = '%?%') OR p."description" ILIKE '%?%')`,
  //     [text, text]
  //   )
};

export const postByUserMentioned = (targetUserId, userId, limit, offset) => {
  const query = baseQuery(userId);
  query
    .where('p.status', 'published')
    .whereRaw('? = ANY(mentions)', [targetUserId])
    .andWhereRaw(
      `p."userId" NOT IN ( SELECT "userId" FROM user_blocks ub WHERE ub."blockedUserId" = ?)`,
      [userId]
    );

  if (offset) {
    query.where('p.postId', '<=', offset);
  }

  query.orderBy('p.postId', 'desc').limit(limit);

  //console.log(query.toSQL());
  return query;
};

export const postByUserUploaded = (targetUserId, userId, limit, offset) => {
  const selfUser = targetUserId == userId;
  const query = baseQuery(userId);
  const status = ['published'];

  console.log('[postByUserUploaded] status:', status);
  query
    .whereIn('p.status', status)
    .where('p.userId', targetUserId)
    .andWhereRaw(
      `p."userId" NOT IN ( SELECT "userId" FROM user_blocks ub WHERE ub."blockedUserId" = ?)`,
      [userId]
    );

  if (offset) {
    //offset = new Date(parseInt(offset) * 1000);
    if (selfUser) {
      query.where('p.updatedTs', '<=', new Date(parseInt(offset) * 1000));
    } else {
      query.where('p.postId', '<=', offset);
    }
  }

  if (selfUser) {
    query.orderBy('p.updatedTs', 'desc');
  } else {
    query.orderBy('p.postId', 'desc');
  }

  query.limit(limit);

  //console.log(query.toQuery());
  return query;
};

export const searchByText = (text, userId, limit, offset, byHashtag) => {
  //console.log(text, userId, limit, offset, byHashtag);
  // const query = db('posts as p')
  //   .select([
  //     'postId',
  //     'p.videoUrl',
  //     'videoStreamUrl',
  //     'p.imageUrl',
  //     'userId',
  //     'description',
  //     'status',
  //     'createdTs',
  //     'updatedTs',
  //     'isLandscape',
  //     'isOpen',
  //     'soundId',
  //     'iOSFront',
  //     db.raw(
  //       `
  //     array_to_json(ARRAY(
  //       SELECT "userName"
  //       FROM users WHERE "userId" = ANY(p.mentions) AND "isActive" = TRUE AND "isDeleted" = FALSE
  //         AND "userId" NOT IN (
  //           SELECT "userId" from user_blocks ub
  //           WHERE ub."blockedUserId" = ?
  //         )
  //     )) "mentions"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(`(
  //     SELECT
  //         COUNT("commentId")::INTEGER
  //       FROM post_comments pc
  //       WHERE pc."postId" = p."postId" AND pc."isDeleted" = FALSE
  //     ) "comments"
  //   `),
  //     db.raw(`(
  //     SELECT
  //       COUNT("likeId")::INTEGER
  //       FROM post_likes pl
  //       WHERE pl."postId" = p."postId"
  //     ) "likes"
  //   `),
  //     db.raw(`
  //    (
  //       SELECT
  //         COUNT("blessingId")::INTEGER
  //       FROM post_blessings pb
  //       WHERE pb."postId" = p."postId"
  //     ) "blessings"
  //   `),
  //     db.raw(`
  //   (
  //     SELECT
  //       COUNT("viewId")::INTEGER
  //     FROM post_views pv
  //     WHERE pv."postId" = p."postId"
  //   ) "views"
  //   `),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "viewId"
  //       FROM post_views pv
  //       WHERE pv."postId" = p."postId" AND pv."userId" = ?
  //     ) "isViewed"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //    EXISTS(
  //       SELECT
  //         "likeId"
  //       FROM post_likes l
  //       WHERE l."postId" = p."postId" AND l."userId" = ?
  //     ) "isLiked"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //         SELECT
  //           "blessingId"
  //         FROM post_blessings b
  //         WHERE b."postId" = p."postId" AND b."userId" = ?
  //       ) "isBlessed"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "reportId"
  //       FROM reported_users ru
  //       WHERE ru."reportedUserId" = p."userId" AND ru."userId" = ?
  //     ) "isUserReported"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "reportId"
  //       FROM reported_posts rp
  //       WHERE rp."reportedPostId" = p."postId" AND rp."userId" = ?
  //     ) "isPostReported"`,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "followId"
  //       FROM user_follows uf
  //       WHERE uf."followedUserId" = p."userId" AND uf."userId" = ?
  //     ) "isFollowed"`,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     (
  //       SELECT row_to_json(u)
  //         FROM(
  //           SELECT
  //             u."userId",
  //             u."userName",
  //             u."fullName",
  //             u."imageUrl",
  //             u."isActive",
  //             u."isDeleted",
  //             u."description",
  //             EXISTS(
  //               SELECT
  //                 "blockId"
  //               FROM user_blocks ub
  //               WHERE ub."blockedUserId" = p."userId" AND ub."userId" = ?
  //             ) "isBlocked",
  //             EXISTS(
  //               SELECT "blockId"
  //               FROM user_blocks "ub"
  //               WHERE ub."userId" = p."userId" AND ub."blockedUserId" = ?
  //             ) "iAmBlocked",
  //             EXISTS(
  //               SELECT
  //                 "followId"
  //               FROM user_follows uf
  //               WHERE uf."followedUserId" = p."userId" AND uf."userId" = ?
  //             ) "isFollowing",
  //             EXISTS(
  //               SELECT
  //                 "reportId"
  //               FROM reported_users ru
  //               WHERE ru."reportedUserId" = p."userId" AND ru."userId" = ?
  //             ) "isReported",
  //             (
  //               SELECT
  //                 COUNT("followId")::INTEGER
  //               FROM user_follows uf
  //               JOIN users usr ON usr."userId" = uf."userId"
  //               WHERE uf."followedUserId" = p."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
  //             ) "followersCount",
  //             (
  //               SELECT
  //                 COUNT("followId")::INTEGER
  //               FROM user_follows uf
  //               JOIN users usr ON usr."userId" = uf."followedUserId"
  //               WHERE uf."userId" = p."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
  //             ) "followingsCount",
  //             (
  //               SELECT
  //                 COUNT("viewId")::INTEGER
  //               FROM post_views v
  //               JOIN posts p ON p."postId" = v."postId"
  //               WHERE p."userId" = u."userId"
  //                 AND p."status" = 'published'
  //             ) "postViewCount",
  //             (
  //               SELECT
  //                 COUNT("blessingId")::INTEGER
  //               FROM post_blessings b
  //               INNER JOIN posts p2 ON p2."userId" = u."userId"
  //               WHERE b."postId" = p2."postId"
  //             ) "blessCount",
  //             (
  //               SELECT
  //                 COUNT(DISTINCT "categoryId")::integer
  //               FROM
  //                 posts p
  //               WHERE
  //                 p."userId" = u."userId" AND p."status" = 'published'
  //             ) "postCount"
  //           FROM users u
  //           WHERE u."userId" = p."userId"
  //         ) u
  //     ) "postedBy"
  //   `,
  //       [userId, userId, userId, userId]
  //     ),
  //     db.raw(
  //       `
  //     (
  //       SELECT row_to_json(c)
  //         FROM(
  //           SELECT
  //             c."categoryId",
  //             c."categoryName",
  //             c."isDeleted",
  //             c."imageUrl",
  //             EXISTS(
  //               SELECT
  //                 "postId"
  //               FROM posts p
  //               WHERE p."categoryId" = c."categoryId" AND p."userId" = ? AND p."status" IN ('published', 'draft')
  //             ) "postAdded",
  //             c."totalPosts"
  //           FROM categories c
  //           WHERE c."categoryId" = p."categoryId"
  //         ) c
  //     ) category
  //   `,
  //       [userId]
  //     ),
  //   ]);
  const query = baseQuery(userId);
  query
    .leftJoin('categories', 'categories.categoryId', 'p.categoryId')
    .where('p.status', 'published');

  if (byHashtag) {
    query.andWhereRaw(`? = ANY(p.hashtags)`, text);
  } else {
    query.andWhere(function () {
      this.where('categories.categoryName', 'ILIKE', `%${text}%`).orWhere(
        'p.description',
        'ILIKE',
        `%${text}%`
      );
    });
  }

  query.andWhereRaw(
    `p."userId" NOT IN ( SELECT "userId" FROM user_blocks ub WHERE ub."blockedUserId" = ?)`,
    [userId]
  );

  if (offset && byHashtag) {
    query.offset(offset);
  } else if (offset) {
    query.andWhere('p.postId', '<=', offset);
  }

  if (byHashtag) {
    query.orderBy('p.views', 'desc');
  } else {
    query.orderBy('p.postId', 'desc');
  }
  query.limit(limit);

  //console.log(query.toSQL());
  return query;
};

export const fromUserCircle = (userId, targetUserId, limit, offset) => {
  // const query = db('posts as p')
  //   .select([
  //     'postId',
  //     'videoUrl',
  //     'videoStreamUrl',
  //     'imageUrl',
  //     'userId',
  //     'description',
  //     'status',
  //     'createdTs',
  //     'updatedTs',
  //     'isLandscape',
  //     'isOpen',
  //     'soundId',
  //     'iOSFront',
  //     db.raw(
  //       `
  //     array_to_json(ARRAY(
  //       SELECT "userName"
  //       FROM users WHERE "userId" = ANY(p.mentions) AND "isActive" = TRUE AND "isDeleted" = FALSE
  //         AND "userId" NOT IN (
  //           SELECT "userId" from user_blocks ub
  //           WHERE ub."blockedUserId" = ?
  //         )
  //     )) "mentions"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(`(
  //     SELECT
  //         COUNT("commentId")::INTEGER
  //       FROM post_comments pc
  //       WHERE pc."postId" = p."postId" AND pc."isDeleted" = FALSE
  //     ) "comments"
  //   `),
  //     db.raw(`(
  //     SELECT
  //       COUNT("likeId")::INTEGER
  //       FROM post_likes pl
  //       WHERE pl."postId" = p."postId"
  //     ) "likes"
  //   `),
  //     db.raw(`
  //    (
  //       SELECT
  //         COUNT("blessingId")::INTEGER
  //       FROM post_blessings pb
  //       WHERE pb."postId" = p."postId"
  //     ) "blessings"
  //   `),
  //     db.raw(`
  //   (
  //     SELECT
  //       COUNT("viewId")::INTEGER
  //     FROM post_views pv
  //     WHERE pv."postId" = p."postId"
  //   ) "views"
  //   `),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "viewId"
  //       FROM post_views pv
  //       WHERE pv."postId" = p."postId" AND pv."userId" = ?
  //     ) "isViewed"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //    EXISTS(
  //       SELECT
  //         "likeId"
  //       FROM post_likes l
  //       WHERE l."postId" = p."postId" AND l."userId" = ?
  //     ) "isLiked"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //         SELECT
  //           "blessingId"
  //         FROM post_blessings b
  //         WHERE b."postId" = p."postId" AND b."userId" = ?
  //       ) "isBlessed"
  //   `,
  //       [userId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "reportId"
  //       FROM reported_users ru
  //       WHERE ru."reportedUserId" = p."userId" AND ru."userId" = ?
  //     ) "isUserReported"
  //   `,
  //       [targetUserId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "reportId"
  //       FROM reported_posts rp
  //       WHERE rp."reportedPostId" = p."postId" AND rp."userId" = ?
  //     ) "isPostReported"`,
  //       [targetUserId]
  //     ),
  //     db.raw(
  //       `
  //     EXISTS(
  //       SELECT
  //         "followId"
  //       FROM user_follows uf
  //       WHERE uf."followedUserId" = p."userId" AND uf."userId" = ?
  //     ) "isFollowed"`,
  //       [targetUserId]
  //     ),
  //     db.raw(
  //       `
  //     (
  //       SELECT row_to_json(u)
  //         FROM(
  //           SELECT
  //             u."userId",
  //             u."userName",
  //             u."fullName",
  //             u."imageUrl",
  //             u."isActive",
  //             u."isDeleted",
  //             u."description",
  //             EXISTS(
  //               SELECT
  //                 "blockId"
  //               FROM user_blocks ub
  //               WHERE ub."blockedUserId" = p."userId" AND ub."userId" = ?
  //             ) "isBlocked",
  //             EXISTS(
  //               SELECT "blockId"
  //               FROM user_blocks "ub"
  //               WHERE ub."userId" = p."userId" AND ub."blockedUserId" = ?
  //             ) "iAmBlocked",
  //             EXISTS(
  //               SELECT
  //                 "followId"
  //               FROM user_follows uf
  //               WHERE uf."followedUserId" = p."userId" AND uf."userId" = ?
  //             ) "isFollowing",
  //             EXISTS(
  //               SELECT
  //                 "reportId"
  //               FROM reported_users ru
  //               WHERE ru."reportedUserId" = p."userId" AND ru."userId" = ?
  //             ) "isReported",
  //             (
  //               SELECT
  //                 COUNT("followId")::INTEGER
  //               FROM user_follows uf
  //               JOIN users usr ON usr."userId" = uf."userId"
  //               WHERE uf."followedUserId" = p."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
  //             ) "followersCount",
  //             (
  //               SELECT
  //                 COUNT("followId")::INTEGER
  //               FROM user_follows uf
  //               JOIN users usr ON usr."userId" = uf."followedUserId"
  //               WHERE uf."userId" = p."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
  //             ) "followingsCount",
  //             (
  //               SELECT
  //                 COUNT("viewId")::INTEGER
  //               FROM post_views v
  //               JOIN posts p ON p."postId" = v."postId"
  //               WHERE p."userId" = u."userId"
  //                 AND p."status" = 'published'
  //             ) "postViewCount",
  //             (
  //               SELECT
  //                 COUNT("blessingId")::INTEGER
  //               FROM post_blessings b
  //               INNER JOIN posts p2 ON p2."userId" = u."userId"
  //               WHERE b."postId" = p2."postId"
  //             ) "blessCount",
  //             (
  //               SELECT
  //                 COUNT(DISTINCT "categoryId")::integer
  //               FROM
  //                 posts p
  //               WHERE
  //                 p."userId" = u."userId" AND p."status" = 'published'
  //             ) "postCount"
  //           FROM users u
  //           WHERE u."userId" = p."userId"
  //         ) u
  //     ) "postedBy"
  //   `,
  //       [userId, userId, userId, userId]
  //     ),
  //     db.raw(
  //       `
  //     (
  //       SELECT row_to_json(c)
  //         FROM(
  //           SELECT
  //             c."categoryId",
  //             c."categoryName",
  //             c."isDeleted",
  //             c."imageUrl",
  //             EXISTS(
  //               SELECT
  //                 "postId"
  //               FROM posts p
  //               WHERE p."categoryId" = c."categoryId" AND p."userId" = ? AND p."status" IN ('published', 'draft')
  //             ) "postAdded",
  //             c."totalPosts"
  //           FROM categories c
  //           WHERE c."categoryId" = p."categoryId"
  //         ) c
  //     ) category
  //   `,
  //       [userId]
  //     ),
  //   ]);
  const query = baseQuery(userId);
  query
    .where('p.status', 'published')
    .andWhereRaw(
      `p."userId" = ANY ( SELECT "followedUserId" FROM user_follows WHERE "userId" = ?)`,
      [targetUserId]
    )
    .andWhereRaw(
      `p."userId" NOT IN ( SELECT "userId" FROM user_blocks ub WHERE ub."blockedUserId" = ?)`,
      [userId]
    )
    .andWhereNot('p.userId', userId);

  if (offset) {
    query.andWhere('p.postId', '<=', offset);
  }

  query.orderBy('p.postId', 'desc');
  query.limit(limit);

  //console.log(query.toSQL());
  return query;
};

export const pendingCategries = (
  userId,
  text,
  subcategoryId,
  nextPageId,
  limit
) => {
  const q = db('categories as c')
    .select([
      'c.categoryId',
      'c.priority',
      'c.categoryName',
      'c.videoUrl',
      'c.imageUrl',
      'c.rules',
      'c.totalPosts',
      db.raw(`
        (
          select array_to_json(array_agg(row_to_json(s)))
          from (
            select id, subcategory
            from subcategories
            where id = any(c.subcategories)
          ) s
        ) "subcategories"
    `),
      db.raw(`
      (
        select array_to_json(array_agg(row_to_json(k)))
        from (
          select id, keyword
          from keywords
          where id = any(c.keywords)
        ) k
      ) "keywords"
    `),
    ])
    .where('c.isDeleted', false)
    .where(function () {
      this.whereNotIn(
        'c.categoryId',
        db.raw(
          `SELECT "categoryId" FROM posts WHERE "userId" = ? AND "categoryId" IS NOT NULL AND status = 'published'`,
          [userId]
        )
      ).whereNotIn(
        'c.categoryId',
        db.raw(
          `SELECT "categoryId" FROM skipped_categories WHERE "userId" = ? AND "categoryId" IS NOT NULL`,
          [userId]
        )
      );
    });
  if (text) {
    q.where(function () {
      this.where('c.categoryName', 'ilike', `%${text}%`)
        .orWhereRaw(
          'keywords && (SELECT array_agg(id) FROM keywords WHERE keyword ILIKE ?)',
          [`'%${text}%'`]
        )
        .orWhereRaw(
          'subcategories && (SELECT array_agg(id) FROM subcategories WHERE subcategory ILIKE ?)',
          [`'%${text}%'`]
        );
    });
  }

  if (subcategoryId) {
    q.whereRaw('? = any(subcategories)', subcategoryId);
  }
  q.orderBy('priority').limit(limit);
  if (nextPageId) {
    //q.where('priority', '>=', nextPageId);
    q.offset(nextPageId);
  }
  return q;
};
export const skippedCategories = (userId, nextPageId, limit) => {
  const q = db('categories as c')
    .select([
      'c.categoryId',
      'c.priority',
      'c.categoryName',
      'c.videoUrl',
      'c.imageUrl',
      'c.rules',
      'sc.id as skippedCategoryId',
      'c.totalPosts',
      db.raw(`
        (
          select array_to_json(array_agg(row_to_json(s)))
          from (
            select id, subcategory
            from subcategories
            where id = any(c.subcategories)
          ) s
        ) "subcategories"
    `),
      db.raw(`
      (
        select array_to_json(array_agg(row_to_json(k)))
        from (
          select id, keyword
          from keywords
          where id = any(c.keywords)
        ) k
      ) "keywords"
    `),
    ])
    .join('skipped_categories as sc', 'sc.categoryId', 'c.categoryId')
    .where('c.isDeleted', false)
    .where('sc.userId', userId);

  if (nextPageId) {
    q.where('sc.id', '<=', nextPageId);
  }

  q.orderBy('sc.id', 'desc').limit(limit);
  return q;
};

export const completedCategories = (userId, nextPageId, limit) => {
  const q = db('categories as c')
    .select([
      'c.categoryId',
      'c.priority',
      'c.categoryName',
      'c.videoUrl',
      'c.imageUrl',
      'c.rules',
      'p.postId as uploadedPostId',
      'c.totalPosts',
      db.raw(`
        (
          select array_to_json(array_agg(row_to_json(s)))
          from (
            select id, subcategory
            from subcategories
            where id = any(c.subcategories)
          ) s
        ) "subcategories"
    `),
      db.raw(`
      (
        select array_to_json(array_agg(row_to_json(k)))
        from (
          select id, keyword
          from keywords
          where id = any(c.keywords)
        ) k
      ) "keywords"
    `),
    ])
    .join('posts as p', 'p.categoryId', 'c.categoryId')
    .where('p.userId', userId)
    .where('p.status', 'published');
  // .where(
  //   'categoryId',
  //   db
  //     .select('categoryId')
  //     .from('posts')
  //     .where('userId', userId)
  //     .where('status', 'published')
  //     .whereRaw(`"categoryId" = c."categoryId"`)
  //     .orderBy('postId', 'desc')
  //     .limit(1)
  // );

  if (nextPageId) {
    q.where('uploadedPostId', '<=', nextPageId);
  }

  q.orderBy('uploadedPostId', 'desc').limit(limit);

  //console.log(q.toSQL());
  return q;
};
