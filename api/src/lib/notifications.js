import admin from 'firebase-admin';
import _ from 'lodash';

import db from '../db';
import serviceAccount from './lellenge-firebase-adminsdk-wjohb-a9330f5720';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://lellenge.firebaseio.com',
});

export const actions = {
  post_comment: 'COMMENT_ON_FEED',
  post_like: 'LIKE_ON_FEED',
  post_tag: 'USER_TAG_ON_FEED',
  comment_tag: 'USER_TAG_ON_COMMENT',
  user_follow: 'USER_STARTED_FOLLOWING',
  post_view_milestone: 'FEED_VIEW_INCREASED',
};

export const sendPostMention = async (post, cb) => {
  try {
    console.log(`[sendPostMention] postId: ${post.postId}`);
    let author = await db('users')
      .select(['userId', 'userName'])
      .where('userId', post.userId);
    console.log(`[sendPostMention] author: ${JSON.stringify(author)}`);
    author = author.pop();

    let targetUsers = await db.raw(`
      select u."userId", "deviceType", "deviceToken", "alertsEnabled" from users u
      JOIN posts p ON u."userId" = ANY(p.mentions)
      WHERE p."postId" = ${post.postId}`);

    _send(targetUsers.rows);
    async function _send(users) {
      if (users.length) {
        let targetUser = users.shift();

        let alert = {
          postId: post.postId,
          userId: targetUser.userId,
          authorId: post.userId,
          action: actions.post_tag,
        };
        await db('notifications').insert(alert);

        console.log(
          `[sendPostMention] alertsEnabled: ${targetUser.alertsEnabled}, deviceToken: ${targetUser.deviceToken}`
        );
        if (!targetUser.deviceToken || !targetUser.alertsEnabled) {
          return _send(users);
        }

        let count = await db('notifications')
          .count('id')
          .where('userId', targetUser.userId)
          .andWhere('isRead', false);
        count = count.pop().count;
        console.log(
          `[sendPostMention] authorId: ${author.userId}, targetUserId: ${targetUser.userId}, count: ${count}`
        );

        let title = `${author.userName} has mentioned you on a post.`;
        let message = {
          tokens: [targetUser.deviceToken],
          apns: {
            payload: {
              aps: {
                alert: title,
                sound: 'default',
                badge: count++,
                'content-available': 0,
              },
            },
          },
          data: {
            title: title,
            body: '',
            //description: '',,
            action: actions.post_tag,
            postId: post.postId.toString(),
            'action-loc-key': 'PLAY',
          },
        };
        console.log(
          `[sendPostMention] message: ${JSON.stringify(message, null, 2)}`
        );
        admin
          .messaging()
          .sendMulticast(message)
          .then((response) => {
            console.log(
              `[sendPostMention] response: ${JSON.stringify(response)}`
            );
            _send(users);
          })
          .catch((error) => {
            console.log(`[sendPostMention] err: ${error.message}`);
            _send(users);
          });
      } else {
        console.log(`[sendPostMention] done`);
        return cb();
      }
    }
  } catch (error) {
    console.log(`[sendPostMention] error: ${error.stack}`);
    return cb();
  }
};

export const sendCommentMention = async (comment, author, cb) => {
  try {
    if (comment.mentions && comment.mentions.length)
      console.log(`[sendCommentMention] comment: ${comment.commentId}`);
    if (!author) {
      author = await db('users')
        .select(['userId', 'userName'])
        .where('userId', comment.userId);
      author = author.pop();
    }
    console.log(`[sendCommentMention] author: ${JSON.stringify(author)}`);

    let targetUsers = await db.raw(`
      select u."userId", "deviceType", "deviceToken", "alertsEnabled" from users u
      JOIN post_comments c ON u."userId" = ANY(c.mentions)
      WHERE c."commentId" = ${comment.commentId}`);

    _send(targetUsers.rows);

    async function _send(users) {
      if (users.length) {
        let targetUser = users.shift();

        if (targetUser.userId === author.userId) {
          return _send(users);
        }
        let count = await db('notifications')
          .count('id')
          .where('userId', targetUser.userId)
          .andWhere('isRead', false);
        count = count.pop().count;
        // console.log(`[sendCommentMention] authorId: ${author.userId}, targetUserId: ${targetUser.userId}, count: ${count}`);
        console.log(
          `[_send] targetUserId: ${targetUser.userId}, alertsEnabled: ${targetUser.alertsEnabled}, deviceToken: ${targetUser.deviceToken}`
        );
        let alert = {
          postId: comment.postId,
          userId: targetUser.userId,
          authorId: comment.userId,
          action: actions.comment_tag,
        };
        await db('notifications').insert(alert);

        if (!targetUser.deviceToken || !targetUser.alertsEnabled) {
          return _send(users);
        }

        let title = `${author.userName} has mentioned you on a comment.`;
        let message = {
          tokens: [targetUser.deviceToken],
          apns: {
            payload: {
              aps: {
                alert: title,
                sound: 'default',
                badge: count++,
                'content-available': 0,
              },
            },
          },
          data: {
            title: title,
            body: '',
            //description: '',
            action: actions.comment_tag,
            postId: comment.postId.toString(),
            'action-loc-key': 'PLAY',
          },
        };
        console.log(
          `[sendCommentMention] message: ${JSON.stringify(message, null, 2)}`
        );
        admin
          .messaging()
          .sendMulticast(message)
          .then((response) => {
            console.log(
              `[sendCommentMention] response: ${JSON.stringify(response)}`
            );
            _send(users);
          })
          .catch((error) => {
            console.log(`[sendCommentMention] err: ${error.message}`);
            _send(users);
          });
      } else {
        console.log(`[sendCommentMention] done`);
        return cb();
      }
    }
  } catch (error) {
    console.log(`[sendCommentMention] error: ${error.stack}`);
    return cb();
  }
};

export const sendPostComment = async (comment, cb) => {
  let commentData = Object.assign({}, comment);
  try {
    console.log(`[sendPostComment] commentId: ${comment.commentId}`);
    let author = await db('users')
      .select(['userId', 'userName'])
      .where('userId', comment.userId);
    console.log(`[sendPostComment] author: ${JSON.stringify(author)}`);
    author = author.pop();

    let targetUser = await db('users')
      .select([
        'users.userId',
        'fullName',
        'deviceToken',
        'deviceType',
        'alertsEnabled',
      ])
      .innerJoin('posts', 'posts.userId', 'users.userId')
      //.whereNotNull('users.deviceToken')
      .andWhere('posts.postId', comment.postId);
    //.andWhere('users.alertsEnabled', true)
    console.log(`[sendPostComment] targetUser: ${JSON.stringify(targetUser)}`);
    targetUser = targetUser.pop();

    let alert = {
      commentId: comment.commentId,
      postId: comment.postId,
      userId: targetUser.userId,
      authorId: author.userId,
      action: actions.post_comment,
    };

    await db('notifications').insert(alert);
    console.log(
      `[sendPostComment] alertsEnabled: ${targetUser.alertsEnabled}, deviceToken: ${targetUser.deviceToken}`
    );
    if (!targetUser.deviceToken || !targetUser.alertsEnabled) {
      if (commentData.mentions.length) {
        return sendCommentMention(commentData, author, cb);
      }
      return cb();
    }
    let count = await db('notifications')
      .count('id')
      .where('userId', targetUser.userId)
      .andWhere('isRead', false);
    count = count.pop().count;
    console.log(
      `[sendPostComment] authorId: ${author.userId}, targetUserId: ${targetUser.userId}, count: ${count}`
    );

    let title = `${author.userName} has commented on your post.`;

    let message = {
      tokens: [targetUser.deviceToken],
      apns: {
        payload: {
          aps: {
            alert: title,
            sound: 'default',
            badge: count++,
            'content-available': 0,
          },
        },
      },
      data: {
        title: title,
        body: '',
        description: comment.comment,
        action: actions.post_comment,
        postId: comment.postId.toString(),
        'action-loc-key': 'PLAY',
      },
    };
    console.log(
      `[sendPostComment] message: ${JSON.stringify(message, null, 2)}`
    );
    admin
      .messaging()
      .sendMulticast(message)
      .then((response) => {
        console.log(`[sendPostComment] response: ${JSON.stringify(response)}`);
        if (commentData.mentions.length) {
          return sendCommentMention(commentData, author, cb);
        }
        return cb();
      })
      .catch((error) => {
        console.log(`[sendPostComment] err: ${error.message}`);
        if (commentData.mentions.length) {
          return sendCommentMention(commentData, author, cb);
        }
        return cb();
      });
  } catch (error) {
    console.log(`[sendPostComment] error: ${error.stack}`);
    if (commentData.mentions.length) {
      return sendCommentMention(commentData, author, cb);
    }
    return cb();
  }
};

export const sendPostViewIncrease = async (view, cb) => {
  try {
    let viewCount = await db('post_views')
      .count('*')
      .where('postId', view.postId);
    viewCount = viewCount[0].count;
    // if (!(viewCount >= 50 && viewCount % 50 === 0)) {
    //   return;
    // }
    let targetUser = await db('users')
      .select([
        'users.userId',
        'fullName',
        'deviceToken',
        'deviceType',
        'alertsEnabled',
      ])
      .innerJoin('posts', 'posts.userId', 'users.userId')
      //.whereNotNull('users.deviceToken')
      .andWhere('posts.postId', view.postId);
    //.andWhere('users.alertsEnabled', true);
    // console.log(
    //   `[sendPostViewIncrease] targetUser: ${JSON.stringify(targetUser)}`
    // );
    targetUser = targetUser.pop();

    let title = `Looks like you are being popular.`;
    let description = `You have got ${viewCount} views on your post.`;

    let alert = {
      postId: view.postId,
      userId: targetUser.userId,
      action: actions.post_view_milestone,
      description,
    };

    await db('notifications').insert(alert);

    // console.log(
    //   `[sendPostViewIncrease] alertsEnabled: ${targetUser.alertsEnabled}, deviceToken: ${targetUser.deviceToken}`
    // );
    if (!targetUser.deviceToken || !targetUser.alertsEnabled) {
      return cb();
    }

    let count = await db('notifications')
      .count('id')
      .where('userId', targetUser.userId)
      .andWhere('isRead', false);
    count = count.pop().count;
    console.log(
      `[sendPostViewIncrease] targetUserId: ${targetUser.userId}, count: ${count}`
    );

    let message = {
      tokens: [targetUser.deviceToken],
      apns: {
        payload: {
          aps: {
            alert: title,
            sound: 'default',
            badge: count++,
            'content-available': 0,
          },
        },
      },
      data: {
        title: `${title} ${description}`,
        body: '',
        description: description,
        postId: view.postId.toString(),
        action: actions.post_view_milestone,
        'action-loc-key': 'PLAY',
      },
    };
    // console.log(
    //   `[sendPostViewIncrease] message: ${JSON.stringify(message, null, 2)}`
    // );
    admin
      .messaging()
      .sendMulticast(message)
      .then((response) => {
        console.log(
          `[sendPostViewIncrease] response: ${JSON.stringify(response)}`
        );
        return cb();
      })
      .catch((error) => {
        console.log(`[sendPostViewIncrease] err: ${error.message}`);
        return cb();
      });
  } catch (error) {
    console.log(`[sendPostViewIncrease] error: ${error.stack}`);
    return cb();
  }
};

export const sendUserFollow = async (follow, cb) => {
  try {
    console.log(`[sendUserFollow] followedUserId: ${follow.followedUserId}`);
    let author = await db('users')
      .select(['userId', 'userName'])
      .where('userId', follow.userId);
    console.log(`[sendUserFollow] author: ${JSON.stringify(author)}`);
    author = author.pop();

    let targetUser = await db('users')
      .select([
        'users.userId',
        'fullName',
        'deviceToken',
        'deviceType',
        'alertsEnabled',
      ])
      //.whereNotNull('users.deviceToken')
      .andWhere('userId', follow.followedUserId);
    //.andWhere('users.alertsEnabled', true);
    console.log(`[sendUserFollow] targetUser: ${JSON.stringify(targetUser)}`);
    targetUser = targetUser.pop();

    if (!targetUser) {
      console.log(`[sendUserFollow] tagretUser: ${targetUser}`);
      return cb();
    }

    let alert = {
      userId: targetUser.userId,
      authorId: author.userId,
      action: actions.user_follow,
    };
    await db('notifications').insert(alert);

    console.log(
      `[sendUserFollow] alertsEnabled: ${targetUser.alertsEnabled}, deviceToken: ${targetUser.deviceToken}`
    );
    if (!targetUser.deviceToken || !targetUser.alertsEnabled) {
      return cb();
    }

    let count = await db('notifications')
      .count('id')
      .where('userId', targetUser.userId)
      .andWhere('isRead', false);
    count = count.pop().count;
    console.log(
      `[sendUserFollow] authorId: ${author.userId}, targetUserId: ${targetUser.userId}, count: ${count}`
    );

    let title = `Knock Knock! ${author.userName} has started following you.`;

    let message = {
      tokens: [targetUser.deviceToken],
      apns: {
        payload: {
          aps: {
            alert: title,
            sound: 'default',
            badge: count++,
            'content-available': 0,
          },
        },
      },
      data: {
        title: title,
        body: '',
        followerId: author.userId.toString(),
        action: actions.user_follow,
        'action-loc-key': 'PLAY',
      },
    };
    // console.log(
    //   `[sendUserFollow] message: ${JSON.stringify(message, null, 2)}`
    // );
    admin
      .messaging()
      .sendMulticast(message)
      .then((response) => {
        console.log(`[sendUserFollow] response: ${JSON.stringify(response)}`);
        return cb();
      })
      .catch((error) => {
        console.log(`[sendUserFollow] err: ${error.message}`);
        return cb();
      });
  } catch (error) {
    console.log(`[sendUserFollow] error: ${error.stack}`);
    return cb();
  }
};

export const sendPostLike = async (like, cb) => {
  try {
    console.log(like);
    console.log(`[sentPostLike] likeId: ${like.likeId}`);
    let author = await db('users')
      .select(['userId', 'userName'])
      .where('userId', like.userId);
    console.log(`[sentPostLike] author: ${JSON.stringify(author)}`);
    author = author.pop();

    let targetUser = await db('users')
      .select([
        'users.userId',
        'fullName',
        'deviceToken',
        'deviceType',
        'alertsEnabled',
      ])
      .innerJoin('posts', 'posts.userId', 'users.userId')
      //.whereNotNull('users.deviceToken')
      .andWhere('posts.postId', like.postId);
    //.andWhere('users.alertsEnabled', true);

    targetUser = targetUser.pop();

    console.log(`[sendPostLike] targetUser: ${JSON.stringify(targetUser)}`);
    if (!targetUser) return cb();

    let alert = {
      postId: like.postId,
      userId: targetUser.userId,
      authorId: author.userId,
      action: actions.post_like,
    };

    await db('notifications').insert(alert);

    console.log(
      `[sendPostLike] alertsEnabled: ${targetUser.alertsEnabled}, deviceToken: ${targetUser.deviceToken}`
    );
    if (!targetUser.deviceToken || !targetUser.alertsEnabled) {
      return cb();
    }
    let count = await db('notifications')
      .count('id')
      .where('userId', targetUser.userId)
      .andWhere('isRead', false);
    count = count.pop().count;
    console.log(
      `[sendPostLike] authorId: ${author.userId}, targetUserId: ${targetUser.userId}, count: ${count}`
    );

    let title = `${author.userName} has liked your post.`;

    let message = {
      tokens: [targetUser.deviceToken],
      apns: {
        payload: {
          aps: {
            alert: title,
            sound: 'default',
            badge: count++,
            'content-available': 0,
          },
        },
      },
      data: {
        title: title,
        body: '',
        //description: '',
        action: actions.post_like,
        postId: like.postId.toString(),
        'action-loc-key': 'PLAY',
      },
    };
    //console.log(`[sendPostLike] message: ${JSON.stringify(message, null, 2)}`);
    admin
      .messaging()
      .sendMulticast(message)
      .then((response) => {
        console.log(`[sendPostLike] response: ${JSON.stringify(response)}`);
        // sendPostViewIncrease(like);
        return cb();
      })
      .catch((error) => {
        console.log(`[sendPostLike] err: ${error.message}`);
        return cb();
      });
  } catch (error) {
    console.log(`[sentPostLike] error: ${error.stack}`);
    return cb();
  }
};
