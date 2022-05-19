import db from '../db';

export const getSoundListCount = async (userId, selfUser) => {
  const query = db('sounds').count('*');
  query
    .join('user_sounds', 'user_sounds.soundId', 'sounds.id')
    .where('user_sounds.userId', userId)
    .andWhere('sounds.isDeleted', false);
  // if (selfUser) {
  //   query
  //     .join('user_sounds', 'user_sounds.soundId', 'sounds.id')
  //     .where('user_sounds.userId', userId)
  //     .andWhere('sounds.isDeleted', false);
  // } else {
  //   query
  //     .join('users', 'users.userId', 'sounds.userId')
  //     .where('users.soundSponsored', true)
  //     .andWhere('users.userId', userId);
  // }
  return await query.then();
};

export const getSoundHome = async (userId, country) => {
  const categoryQuery = db('sound_categories')
    .select(['id', 'categoryName', 'imageUrl', 'isDeleted'])
    .whereRaw(` ? = ANY(countries::citext[])`, country.toLowerCase())
    .where('isDeleted', false);
  // console.log(categoryQuery.toString());

  const categories = await categoryQuery.then();

  const popular = await db('sounds')
    .select([
      'id',
      'title',
      'duration',
      'streamUrl',
      'sounds.imageUrl',
      'sounds.postCount',
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
                      WHERE ub."blockedUserId" = u."userId" AND ub."userId" = ?
                    ) "isBlocked",
                    EXISTS(
                      SELECT "blockId"
                      FROM user_blocks "ub" WHERE ub."userId" = u."userId"
                      AND ub."blockedUserId" = ?
                    ) "iAmBlocked",
                    EXISTS(
                      SELECT
                        "followId"
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
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."userId"
                      WHERE uf."followedUserId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                    ) "followersCount",
                    (
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."followedUserId"
                      WHERE uf."userId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
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
                  WHERE u."userId" = sounds."userId"
                ) u
            ) "postedBy"
          `,
        [userId, userId, userId, userId]
      ),
    ])
    .join('users', 'users.userId', 'sounds.userId')
    .where('users.soundSponsored', true)
    .where('users.isDeleted', false)
    .whereRaw('LOWER(users.country) = ?', [country.toLowerCase()])
    .where('sounds.isDeleted', false)
    .orderBy('sounds.postCount', 'desc')
    .limit(5);

  const newest = await db('sounds')
    .select([
      'id',
      'title',
      'duration',
      'streamUrl',
      'sounds.imageUrl',
      'sounds.postCount',
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
                      WHERE ub."blockedUserId" = u."userId" AND ub."userId" = ?
                    ) "isBlocked",
                    EXISTS(
                      SELECT "blockId"
                      FROM user_blocks "ub" WHERE ub."userId" = u."userId"
                      AND ub."blockedUserId" = ?
                    ) "iAmBlocked",
                    EXISTS(
                      SELECT
                        "followId"
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
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."userId"
                      WHERE uf."followedUserId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                    ) "followersCount",
                    (
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."followedUserId"
                      WHERE uf."userId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
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
                  WHERE u."userId" = sounds."userId"
                ) u
            ) "postedBy"
          `,
        [userId, userId, userId, userId]
      ),
    ])
    .join('users', 'users.userId', 'sounds.userId')
    .where('users.soundSponsored', true)
    .where('users.isDeleted', false)
    .whereRaw('LOWER(users.country) = ?', [country.toLowerCase()])
    .where('sounds.isDeleted', false)
    .orderBy('sounds.id', 'desc')
    .limit(5);

  return { categories, popular, newest };
};

export const getPopularSounds = async (userId, country, nextPageId, limit) => {
  const query = db('sounds')
    .select([
      'id',
      'title',
      'duration',
      'streamUrl',
      'sounds.imageUrl',
      'sounds.postCount',
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
                      WHERE ub."blockedUserId" = u."userId" AND ub."userId" = ?
                    ) "isBlocked",
                    EXISTS(
                      SELECT "blockId"
                      FROM user_blocks "ub" WHERE ub."userId" = u."userId"
                      AND ub."blockedUserId" = ?
                    ) "iAmBlocked",
                    EXISTS(
                      SELECT
                        "followId"
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
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."userId"
                      WHERE uf."followedUserId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                    ) "followersCount",
                    (
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."followedUserId"
                      WHERE uf."userId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
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
                  WHERE u."userId" = sounds."userId"
                ) u
            ) "postedBy"
          `,
        [userId, userId, userId, userId]
      ),
    ])
    .join('users', 'users.userId', 'sounds.userId')
    //.where('users.soundSponsored', true)
    .where('users.isDeleted', false)
    .whereRaw('LOWER(users.country) = ?', [country.toLowerCase()])
    .orderBy('sounds.postCount', 'desc')
    .limit(limit)
    .where('sounds.isDeleted', false);
  if (nextPageId) {
    query.offset(nextPageId);
  }

  // console.log(query.toString());
  return await query.then();
};

export const getSoundsByVideoCategory = async (
  userId,
  categoryId,
  nextPageId,
  limit
) => {
  const query = db('sounds')
    .select([
      'id',
      'title',
      'duration',
      'streamUrl',
      'sounds.imageUrl',
      'sounds.postCount',
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
                      WHERE ub."blockedUserId" = u."userId" AND ub."userId" = ?
                    ) "isBlocked",
                    EXISTS(
                      SELECT "blockId"
                      FROM user_blocks "ub" WHERE ub."userId" = u."userId"
                      AND ub."blockedUserId" = ?
                    ) "iAmBlocked",
                    EXISTS(
                      SELECT
                        "followId"
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
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."userId"
                      WHERE uf."followedUserId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                    ) "followersCount",
                    (
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."followedUserId"
                      WHERE uf."userId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
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
                  WHERE u."userId" = sounds."userId"
                ) u
            ) "postedBy"
          `,
        [userId, userId, userId, userId]
      ),
    ])
    .join('users', 'users.userId', 'sounds.userId')
    .where('users.soundSponsored', true)
    .whereRaw('? = any("videoCategoryIds")', categoryId)
    .where('sounds.isDeleted', false)
    .orderBy('sounds.postCount', 'desc');
  if (nextPageId) {
    query.offset(nextPageId);
  }
  query.limit(limit);
  return await query.then();
};

export const getSoundsByAudioCategory = async (
  userId,
  categoryId,
  nextPageId,
  limit
) => {
  console.log(
    `[soundsByAudioCategory] categoryId: ${categoryId}, nextPageId: ${nextPageId}, limit: ${limit}`
  );
  const query = db('sounds')
    .select([
      'id',
      'title',
      'duration',
      'streamUrl',
      'sounds.imageUrl',
      'sounds.postCount',
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
                      WHERE ub."blockedUserId" = u."userId" AND ub."userId" = ?
                    ) "isBlocked",
                    EXISTS(
                      SELECT "blockId"
                      FROM user_blocks "ub" WHERE ub."userId" = u."userId"
                      AND ub."blockedUserId" = ?
                    ) "iAmBlocked",
                    EXISTS(
                      SELECT
                        "followId"
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
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."userId"
                      WHERE uf."followedUserId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                    ) "followersCount",
                    (
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."followedUserId"
                      WHERE uf."userId" = u."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
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
                  WHERE u."userId" = sounds."userId"
                ) u
            ) "postedBy"
          `,
        [userId, userId, userId, userId]
      ),
    ])
    .join('users', 'users.userId', 'sounds.userId')
    .where('users.soundSponsored', true)
    .whereRaw('? = any("soundCategoryIds")', categoryId)
    .where('sounds.isDeleted', false)
    .orderBy('sounds.postCount', 'desc');
  if (nextPageId) {
    query.offset(nextPageId);
  }
  query.limit(limit);
  return await query.then();
};

export const getSearchSound = async (
  userId,
  country,
  text,
  nextPageId,
  limit
) => {
  const query = db('sounds')
    .select([
      'id',
      'title',
      'duration',
      'streamUrl',
      'sounds.imageUrl',
      'sounds.postCount',
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
                      WHERE ub."blockedUserId" = user_sounds."userId" AND ub."userId" = ?
                    ) "isBlocked",
                    EXISTS(
                      SELECT "blockId"
                      FROM user_blocks "ub" WHERE ub."userId" = user_sounds."userId"
                      AND ub."blockedUserId" = ?
                    ) "iAmBlocked",
                    EXISTS(
                      SELECT
                        "followId"
                      FROM user_follows uf
                      WHERE uf."followedUserId" = user_sounds."userId" AND uf."userId" = ?
                    ) "isFollowing",
                    EXISTS(
                      SELECT
                        "reportId"
                      FROM reported_users ru
                      WHERE ru."reportedUserId" = user_sounds."userId" AND ru."userId" = ?
                    ) "isReported",
                    (
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."userId"
                      WHERE uf."followedUserId" = user_sounds."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                    ) "followersCount",
                    (
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."followedUserId"
                      WHERE uf."userId" = user_sounds."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
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
                  JOIN user_sounds ON user_sounds."userId" = u."userId"
                  WHERE user_sounds."soundId" = sounds.id
                  ORDER BY user_sounds.id ASC LIMIT 1
                ) u
            ) "postedBy"
          `,
        [userId, userId, userId, userId]
      ),
    ])
    .join('users', 'users.userId', 'sounds.userId')
    .where('users.soundSponsored', true)
    .where('users.isDeleted', false)
    .whereRaw('LOWER(users.country) = ?', [country.toLowerCase()])
    .where(function () {
      this.where('sounds.title', 'ilike', '%' + text + '%');
      // .orWhere(
      //   'sounds.streamUrl',
      //   'ilike',
      //   '%' + text + '%'
      // );
    })
    .where('sounds.isDeleted', false);

  if (nextPageId) {
    query.where('sounds.id', '<=', nextPageId);
  }
  query.orderBy('sounds.id', 'desc').limit(limit + 1);
  //console.log(query.toString());
  return await query.then();
};

export const getSoundList = async (
  targetUserId,
  selfUserId,
  nextPageId,
  limit
) => {
  const selfUser = selfUserId == targetUserId;
  const query = db('sounds').select([
    'sounds.id',
    'title',
    'duration',
    'streamUrl',
    'sounds.imageUrl',
    'createdAt',
    'sounds.postCount',
    db.raw(
      `
     EXISTS(
        SELECT
          "id"
        FROM user_sounds us
        WHERE us."soundId" = sounds.id AND us."userId" = ?
      ) "soundAdded"
    `,
      [selfUserId]
    ),
    db.raw(`
        (
          SELECT array_to_json(array_agg(row_to_json(c)))
            FROM(
              SELECT
                c."id",
                c."categoryName",
                c."isDeleted",
                c."imageUrl"
              FROM sound_categories c
              WHERE c."id" = any(sounds."soundCategoryIds")
            ) c
        ) "soundCategories"`),
    targetUserId
      ? db.raw(
          `
        (
          SELECT array_to_json(array_agg(row_to_json(c)))
            FROM(
              SELECT
                c."categoryId" as id,
                c."categoryName",
                c."isDeleted",
                c."imageUrl",
                EXISTS(
                  SELECT
                    "postId"
                  FROM posts p
                  WHERE p."categoryId" = c."categoryId" AND p."userId" = ? AND p."status" IN ('published', 'draft')
                ) "postAdded",
                (
                  SELECT
                    count(p."postId")::INTEGER
                  FROM posts p
                  WHERE p."categoryId" = c."categoryId" AND p."status" = 'published'
                ) "totalPosts"
              FROM categories c
              WHERE c."categoryId" = any(sounds."videoCategoryIds")
            ) c
        ) "videoCategories"`,
          [targetUserId]
        )
      : db.raw(`
        (
          SELECT array_to_json(array_agg(row_to_json(c)))
            FROM(
              SELECT
                c."categoryId" as id,
                c."categoryName",
                c."isDeleted",
                c."imageUrl",
                (
                  SELECT
                    count(p."postId")::INTEGER
                  FROM posts p
                  WHERE p."categoryId" = c."categoryId" AND p."status" = 'published'
                ) "totalPosts"
              FROM categories c
              WHERE c."categoryId" = any(sounds."videoCategoryIds")
            ) c
        ) "videoCategories"`),
  ]);

  //
  // if (selfUser) {
  //   query.join('user_sounds', 'user_sounds.soundId', 'sounds.id');
  //   query.where('user_sounds.userId', selfUserId);
  // } else {
  //   query.join('users', 'users.userId', 'sounds.userId');
  //   query.where('users.userId', targetUserId);
  //   query.where('users.soundSponsored', true);
  // }
  query.join('user_sounds', 'user_sounds.soundId', 'sounds.id');
  query.where('user_sounds.userId', targetUserId);
  if (nextPageId) {
    query.where('sounds.id', '<=', nextPageId);
  }
  query.where('sounds.isDeleted', false);
  query.orderBy('sounds.id', 'desc').limit(limit + 1);

  return await query.then();
};

export const getSoundById = async (id, userId) => {
  const query = db('sounds')
    .select([
      'sounds.id',
      'title',
      'duration',
      'streamUrl',
      'imageUrl',
      'createdAt',
      'sounds.postCount',
      'isPopular',
      db.raw(
        `
          EXISTS(
            SELECT
              "userId"
            FROM user_sounds 
            WHERE user_sounds."userId" = ? AND user_sounds."soundId" = ?
          ) "inMyProfile"
        `,
        [userId, id]
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
                      WHERE ub."blockedUserId" = user_sounds."userId" AND ub."userId" = ?
                    ) "isBlocked",
                    EXISTS(
                      SELECT "blockId"
                      FROM user_blocks "ub" WHERE ub."userId" = user_sounds."userId"
                      AND ub."blockedUserId" = ?
                    ) "iAmBlocked",
                    EXISTS(
                      SELECT
                        "followId"
                      FROM user_follows uf
                      WHERE uf."followedUserId" = user_sounds."userId" AND uf."userId" = ?
                    ) "isFollowing",
                    EXISTS(
                      SELECT
                        "reportId"
                      FROM reported_users ru
                      WHERE ru."reportedUserId" = user_sounds."userId" AND ru."userId" = ?
                    ) "isReported",
                    (
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."userId"
                      WHERE uf."followedUserId" = user_sounds."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
                    ) "followersCount",
                    (
                      SELECT
                        COUNT("followId")::INTEGER
                      FROM user_follows uf
                      JOIN users usr ON usr."userId" = uf."followedUserId"
                      WHERE uf."userId" = user_sounds."userId" AND usr."isActive" = TRUE AND usr."isDeleted" = FALSE
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
                  JOIN user_sounds ON user_sounds."userId" = u."userId"
                  WHERE user_sounds."soundId" = ? 
                  ORDER BY user_sounds.id ASC LIMIT 1
                ) u
            ) "postedBy"
          `,
        [userId, userId, userId, userId, id]
      ),
    ])
    .where('sounds.id', id)
    .where('sounds.isDeleted', false);
  //console.log(query.toSQL());
  return (await query.then()).pop();
};
export const getSoundUser = async (userId) => {
  return await db.raw(`
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
          p."userId" = u."userId" AND p."status" = 'published'
      ) "postCount"
    FROM users u
    WHERE u."userId" = p."userId"
  `);
};
