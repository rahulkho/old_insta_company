import axios from "axios";
import {UsersListEndPoint,UsersStatusEndPoint, UsersSponsoredEndPoint, SetUserCountriesEndPoin} from "../../../config/AppServerConfig";
import {GlobalConfig} from "./../../../Services/Helper/GlobalConfig";

class UsersServices {
  static getUserList(data) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.post(UsersListEndPoint,data, config);
  }

  static setUserCountries(data) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.post(SetUserCountriesEndPoin,data, config);
  }

  static setUserStatus(user) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.post(UsersStatusEndPoint,user, config);
  }

  static setUserSponsored(user) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.post(UsersSponsoredEndPoint,user, config);
  }

}

export {UsersServices};
