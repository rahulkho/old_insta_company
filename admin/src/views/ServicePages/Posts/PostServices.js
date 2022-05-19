import axios from "axios";
import {GetPostListEndPoint, DisablePostEndPoint} from "../../../config/AppServerConfig";
import {GlobalConfig} from "./../../../Services/Helper/GlobalConfig";

class PostServices {
  static GetPostList(data) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.post(GetPostListEndPoint,data, config);
  }

  static disablePost(data) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.post(DisablePostEndPoint,data, config);
  }
}

export {PostServices};
