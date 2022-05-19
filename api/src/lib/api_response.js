export default {
  PROFILE: {
    USERNAME_ALREADY_EXISTS: {
      status: 101,
      message: 'Username already exists'
    },
    USERNAME_REQUIRED: {
      status: 102,
      message: 'Username is required'
    },
    PROFILE_DEACTIVATED: {
      status: 103,
      message: 'Profile is deactivated'
    },
    PROFILE_DELETED: {
      status: 103,
      message: 'This account is deleted'
    },
    ACC_DISABLED_CONTACT_SUPPORT: {
      status: 103,
      message: 'This account is disabled, please contact support for more details'
    },
    NOT_AUTHORISED: {
      status: 0,
      message: 'You are not authorised to perform this action'
    },
    USERNAME_INVALID: {
      status: 0,
      message: 'Username can only contain letters, numbers, dot, dash and underscore'
    },
    EMAIL_REQUIRED: {
      status: 0,
      message: 'Email is required'
    },
    PASSWORD_REQUIRED: {
      status: 0,
      message: 'Password is required'
    },
    EMAIL_ALREADY_EXISTS: {
      status: 0,
      message: 'Email already exists'
    },
    PROFILE_UPDATED: {
      status: 1,
      message: 'Profile has been updated'
    },
    CHANGE_PASS_INVALID_OLD_PASS: {
      status: 0,
      message: 'Please enter correct current password'
    },
    CHANGE_PASS_SUCCESS: {
      status: 1,
      message: 'Password has been updated'
    }
  },
  SOCIAL: {
    NO_FOLLOWINGS: {
      status: 0,
      message: 'No following users available'
    },
    NO_FOLLOWERS: {
      status: 0,
      message: 'No follower users available'
    },
    NO_BLOCKED_USERS: {
      status: 0,
      message: 'No blocked users available'
    }
  },
  POSTS: {
    NO_POSTS: {
      status: 0,
      message: 'No Posts available'
    },
    NO_CATEGORIES: {
      status: 0,
      message: 'No categories found'
    },
    NO_COMMENTS: {
      status: 0,
      message: 'No comments available'
    },
    POST_ID_REQUIRED: {
      status: 0,
      message: 'Post Id is required'
    },
    COMMENT_REQUIRED: {
      status: 0,
      message: 'Comment text is required'
    }
  },
  GENERAL: {
    SUCCESS: {
      status: 1,
      message: 'Success'
    },
    SESSION_INVALID: {
      status: 201,
      message: 'The session for the login is expired, please login again.'
    },
    SERVER_ERR: {
      status: 0,
      message: 'Server is busy at the moment, please try again later.'
    },
    FEEDBACK_SUCCESS: {
      status: 1,
      message: 'Thank you for your valuable feedback.'
    },
    REPORT_SUCCESS: {
      status: 1,
      message: 'Thank you for reporting us your concern. If you have provided contact information, we may follow up with you as needed'
    },
    FEEDBACK_ERR: {
      status: 0,
      message: 'We are unable to post your feedback at the moment due to technical trouble. Please try again later.'
    }
  }
}