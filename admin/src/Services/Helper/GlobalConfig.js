let _token,_userId;

export class GlobalConfig {
  static get Token() {
    _token = window.localStorage.getItem("token");
    return _token;
  }
  static set Token(value) {
    window.localStorage.setItem("token", value);
    _token = window.localStorage.getItem("token");
  }

  static get UserId() {
    _userId = window.localStorage.getItem("userId");
    return _userId;
  }
  static set UserId(value) {
    window.localStorage.setItem("userId", value);
    _userId = window.localStorage.getItem("userId");
  }
}
