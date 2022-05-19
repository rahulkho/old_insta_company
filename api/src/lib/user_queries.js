import db from '../db';

export const getFollowersQuery = async (userId, condition, limit) => {
  const query = `
      SELECT
        f."followId",
        u."userId",
        u."userName",
        u."fullName",
        u."imageUrl",
        u."country",
        u."isActive",
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
            AND p."isActive" = TRUE AND p."isDeleted" = FALSE
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
            p."userId" = u."userId" AND p."status" = 'published'
        ) "postCount"
      FROM users u
      JOIN user_follows f ON f."userId" = u."userId"
      WHERE ${condition}
        AND u."userId" NOT IN (
          SELECT "userId"
          FROM user_blocks ub
          WHERE ub."blockedUserId" = ?
        )
        AND u."userId" NOT IN (
          SELECT "blockedUserId"
          FROM user_blocks ub
          WHERE ub."userId" = ?
        )
        AND u."isActive" = TRUE AND u."isDeleted" = FALSE
      ORDER BY f."followId" DESC
      LIMIT ?
    `;
  //console.log(`[followers] query: ${query}`);
  const result = await db.raw(query, [
    userId,
    userId,
    userId,
    userId,
    userId,
    userId,
    limit,
  ]);
  return result;
};
export const getSingleUser = async (userId, requesterId) => {
  const query = db.raw(
    `
      SELECT
        "userId",
        "userName",
        "fullName",
        "email",
        "imageUrl",
        "imageThumbUrl",
        "country",
        "fbId",
        "gender",
        "deviceType",
        "deviceToken",
        "authToken",
        "isActive",
        "isDeleted",
        "alertsEnabled",
        "joinedTs",
        "description",
        EXISTS(
          SELECT "blockId"
          FROM user_blocks ub
          WHERE ub."blockedUserId" = u."userId"
            AND ub."userId" = ?
        ) "isBlocked",
        EXISTS(
          SELECT "blockId"
          FROM user_blocks "ub"
          WHERE ub."userId" = u."userId"
            AND ub."blockedUserId" = ?
        ) "iAmBlocked",
        (
          SELECT
            COUNT("viewId")::INTEGER
          FROM post_views v
          JOIN posts p ON p."postId" = v."postId"
          WHERE p."userId" = ?
            AND p."isActive" = TRUE AND p."isDeleted" = FALSE
        ) "postViewCount",
        (
          SELECT
            COUNT("followId")::INTEGER
          FROM user_follows uf
          JOIN users usr ON usr."userId" = uf."userId"
          WHERE usr."isActive" = TRUE AND usr."isDeleted" = FALSE
          AND uf."followedUserId" = ?
        ) "followersCount",
        (
          SELECT
            COUNT("followId")::INTEGER
          FROM user_follows uf
          JOIN users usr ON usr."userId" = uf."followedUserId"
          WHERE uf."userId" = ? AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
        ) "followingsCount",
        (
          SELECT
            COUNT("blessingId")::INTEGER
          FROM post_blessings pb
          WHERE pb."postId" IN (SELECT "postId" FROM posts where "userId" = ?)
        ) "blessingsCount",
        (
          SELECT
            COUNT(DISTINCT "categoryId")::integer
          FROM
            posts p
          WHERE
            p."userId" = u."userId" AND p."status" = 'published'
        ) "postCount",
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
        ) "isReported"
      FROM users u
      WHERE
        u."userId" = ?
    `,
    [
      requesterId,
      requesterId,
      userId,
      userId,
      userId,
      userId,
      requesterId,
      requesterId,
      userId,
    ]
  );
  //console.log(`[getSingleUser] query: ${query.toString()}`);
  const result = await query.then();
  return result.rows;
};

export const getBlockedUsers = async (userId, condition, limit) => {
  console.log(userId);
  console.log(condition);
  console.log(limit);
  const query = db.raw(
    `
      SELECT
        u."userId",
        u."userName",
        u."fullName",
        u."imageUrl",
        u."country",
        u."isActive",
        u."description",
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
            AND p."isActive" = TRUE AND p."isDeleted" = FALSE
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
            p."userId" = u."userId" AND p."status" = 'published'
        ) "postCount"
      FROM users u
      JOIN user_blocks b ON b."blockedUserId" = u."userId"
      WHERE ${condition}
      ORDER BY u."userId" DESC
      LIMIT ?`,
    [userId, userId, userId, userId, limit]
  );

  const result = await query.then();
  return result;
};

const userBaseQuery = (userId) => {
  return db('users as u').select([
    'u.userId',
    'u.userName',
    'u.fullName',
    'u.imageUrl',
    'u.country',
    'u.isActive',
    'u.isDeleted',
    'u.description',
    db.raw(
      `
      EXISTS(
          SELECT "blockId"
          FROM user_blocks ub
          WHERE ub."blockedUserId" = u."userId"
            AND ub."userId" = ?
        ) "isBlocked"
    `,
      userId
    ),
    db.raw(
      `
        EXISTS(
          SELECT "blockId"
          FROM user_blocks "ub"
          WHERE ub."userId" = u."userId"
            AND ub."blockedUserId" = ?
        ) "iAmBlocked"
    `,
      userId
    ),
    db.raw(
      `
      EXISTS(
          SELECT
            "userId"
          FROM user_follows uf
          WHERE uf."followedUserId" = u."userId" AND uf."userId" = ?
        ) "isFollowing"
      `,
      userId
    ),
    db.raw(
      `
      EXISTS(
          SELECT
            "reportId"
          FROM reported_users ru
          WHERE ru."reportedUserId" = u."userId" AND ru."userId" = ?
        ) "isReported"
      `,
      userId
    ),
    db.raw(`
        (
          SELECT COUNT("followId")::INTEGER
          FROM user_follows uf
          JOIN users usr ON usr."userId" = uf."userId"
          WHERE uf."followedUserId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
        ) "followersCount"
    `),
    db.raw(`
        (
          SELECT COUNT("followId")::INTEGER
          FROM user_follows uf
          JOIN users usr ON usr."userId" = uf."followedUserId"
          WHERE uf."userId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
        ) "followingsCount"
    `),
    db.raw(
      `
        (
          SELECT COUNT("viewId")::INTEGER
          FROM post_views v
          JOIN posts p ON p."postId" = v."postId"
          WHERE p."userId" = u."userId"
            AND p."status" = 'published'
        ) "postViewCount"
      `
    ),
    db.raw(
      `
        (
          SELECT COUNT("blessingId")::INTEGER
          FROM post_blessings b
          WHERE b."postId" IN (SELECT "postId" FROM posts p2 WHERE p2."userId" = u."userId")
        ) "blessCount"
      `
    ),
    db.raw(
      `
        (
          SELECT
            COUNT("postId")::INTEGER
          FROM posts p
          WHERE p."userId" = u."userId"
            AND p."isActive" = TRUE AND p."isDeleted" = FALSE AND p."status" = 'published'
        ) "postCount"
      `
    ),
  ]);
};

export const suggestedUsersQuery = (selfUserId, country, offset, limit) => {
  offset = parseInt(offset) || 0;
  console.log('offset:', offset);
  const q = userBaseQuery(selfUserId);
  q.where('u.sponsored', true);
  q.andWhere('u.isActive', true)
    .andWhere('u.isDeleted', false)
    .andWhereRaw(
      `
        u."userId" NOT IN (
          SELECT "userId"
          FROM user_blocks ub
          WHERE ub."blockedUserId" = ?
        )`,
      selfUserId
    )
    .andWhereRaw(
      `
        u."userId" NOT IN (
          SELECT "blockedUserId"
          FROM user_blocks ub
          WHERE ub."userId" = ?
        )`,
      selfUserId
    );
  q.where(function () {
    this.whereRaw(`LOWER(u.country) = ?`, [country.toLowerCase()]).orWhereIn(
      'u.userId',
      db('user_countries')
        .select('userId')
        .whereRaw(`LOWER(user_countries.country) = ?`, [country.toLowerCase()])
    );
  });
  if (offset) {
    q.offset(offset);
  }
  q.orderBy('postCount', 'desc');
  q.limit(limit);
  return q;
};
export const searchUsersQuery = (term, selfUserId, offset, limit) => {
  const q = userBaseQuery(selfUserId);
  q.where('u.userName', 'ilike', `%${term}%`)
    .andWhere('u.isActive', true)
    .andWhere('u.isDeleted', false)
    .andWhereNot('u.userId', selfUserId)
    .andWhereRaw(
      `
        u."userId" NOT IN (
          SELECT "userId"
          FROM user_blocks ub
          WHERE ub."blockedUserId" = ?
        )`,
      selfUserId
    )
    .andWhereRaw(
      `
        u."userId" NOT IN (
          SELECT "blockedUserId"
          FROM user_blocks ub
          WHERE ub."userId" = ?
        )`,
      selfUserId
    );
  if (offset) {
    q.where('u.userId', '<=', offset);
  }

  q.orderBy('u.userId', 'desc');
  q.limit(limit);
  return q;
};

export const getAlertsQueryWithoutPosts = async (userId, limit, offset) => {
  let condition = '';
  if (offset) {
    condition = ` AND n.id <= ${offset}`;
  }
  let query = db.raw(
    `
      SELECT
        n.id as "notificationId",
        n.action as "type",
        n."postId",
        n."isRead",
        n."description",
        n.ts as "time",
        (
          SELECT row_to_json(u)
            FROM(
              SELECT
                u."userId",
                u."userName",
                u."fullName",
                u."imageUrl"
              FROM users u
              WHERE u."userId" = n."userId"
            ) u
        ) "user",
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
                  WHERE ub."blockedUserId" = n."authorId" AND ub."userId" = ?
                ) "isBlocked",
                EXISTS(
                  SELECT "blockId"
                  FROM user_blocks "ub" WHERE ub."userId" = n."authorId"
                  AND ub."blockedUserId" = ?
                ) "iAmBlocked",
                EXISTS(
                  SELECT
                    "followId"
                  FROM user_follows uf
                  WHERE uf."followedUserId" = n."authorId" AND uf."userId" = ?
                ) "isFollowing",
                EXISTS(
                  SELECT
                    "reportId"
                  FROM reported_users ru
                  WHERE ru."reportedUserId" = n."authorId" AND ru."userId" = ?
                ) "isReported",
                (
                  SELECT
                    COUNT("followId")::INTEGER
                  FROM user_follows uf
                  JOIN users usr ON usr."userId" = uf."userId"
                  WHERE uf."followedUserId" = n."authorId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                ) "followersCount",
                (
                  SELECT
                    COUNT("followId")::INTEGER
                  FROM user_follows uf
                  JOIN users usr ON usr."userId" = uf."followedUserId"
                  WHERE uf."userId" = n."authorId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                ) "followingsCount",
                (
                  SELECT
                    COUNT("viewId")::INTEGER
                  FROM post_views v
                  JOIN posts p ON p."postId" = v."postId"
                  WHERE n."authorId" = u."userId"
                ) "postViewCount",
                (
                  SELECT
                    COUNT("blessingId")::INTEGER
                  FROM post_blessings b
                  INNER JOIN posts p2 ON p2."userId" = n."authorId"
                  WHERE b."postId" = n."postId"
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
              WHERE u."userId" = n."authorId"
            ) u
        ) "author"
      FROM notifications as n
      WHERE
        n."userId" = ? AND n."postId" IS NULL AND n."commentId" IS NULL ${condition}
      ORDER BY n.id DESC
      LIMIT ?
    `,
    [userId, userId, userId, userId, userId, limit]
  );

  return query;
};

export const getAlertsQuery = async (userId, limit, offset) => {
  let condition = '';
  if (offset) {
    condition = ` AND n.id <= ${offset}`;
  }
  let query = db.raw(
    `
      SELECT
        n.id as "notificationId",
        n.action as "type",
        n."postId",
        c."commentId",
        c."comment",
        c."postId" as "commentPostId",
        p."imageUrl" as "postImageUrl",
        n."isRead",
        n."description",
        p."status",
        n.ts as "time",
        (
          SELECT row_to_json(u)
            FROM(
              SELECT
                u."userId",
                u."userName",
                u."fullName",
                u."imageUrl"
              FROM users u
              WHERE u."userId" = n."userId"
            ) u
        ) "user",
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
                  WHERE ub."blockedUserId" = n."authorId" AND ub."userId" = ?
                ) "isBlocked",
                EXISTS(
                  SELECT "blockId"
                  FROM user_blocks "ub" WHERE ub."userId" = n."authorId"
                  AND ub."blockedUserId" = ?
                ) "iAmBlocked",
                EXISTS(
                  SELECT
                    "followId"
                  FROM user_follows uf
                  WHERE uf."followedUserId" = n."authorId" AND uf."userId" = ?
                ) "isFollowing",
                EXISTS(
                  SELECT
                    "reportId"
                  FROM reported_users ru
                  WHERE ru."reportedUserId" = n."authorId" AND ru."userId" = ?
                ) "isReported",
                (
                  SELECT
                    COUNT("followId")::INTEGER
                  FROM user_follows uf
                  JOIN users usr ON usr."userId" = uf."userId"
                  WHERE uf."followedUserId" = n."authorId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                ) "followersCount",
                (
                  SELECT
                    COUNT("followId")::INTEGER
                  FROM user_follows uf
                  JOIN users usr ON usr."userId" = uf."followedUserId"
                  WHERE uf."userId" = n."authorId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                ) "followingsCount",
                (
                  SELECT
                    COUNT("viewId")::INTEGER
                  FROM post_views v
                  JOIN posts p ON p."postId" = v."postId"
                  WHERE n."authorId" = u."userId"
                ) "postViewCount",
                (
                  SELECT
                    COUNT("blessingId")::INTEGER
                  FROM post_blessings b
                  INNER JOIN posts p2 ON p2."userId" = n."authorId"
                  WHERE b."postId" = n."postId"
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
              WHERE u."userId" = n."authorId"
            ) u
        ) "author"
      FROM notifications as n
      LEFT JOIN post_comments c ON c."commentId" = n."commentId"
      JOIN posts p ON p."postId" = n."postId" AND p.status = 'published'
      WHERE
        n."userId" = ? ${condition}
      ORDER BY n.id DESC
      LIMIT ?
      
    `,
    [userId, userId, userId, userId, userId, limit]
  );

  return query;
};
