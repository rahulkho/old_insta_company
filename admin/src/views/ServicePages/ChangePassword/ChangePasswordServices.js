import axios from "axios";
import {ChangePasswordEndPoint} from "../../../config/AppServerConfig";
import {GlobalConfig} from "./../../../Services/Helper/GlobalConfig";

class ChangePassordServices {
  static changePassword(data) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.post(ChangePasswordEndPoint,data, config);
  }
}

export {ChangePassordServices}
