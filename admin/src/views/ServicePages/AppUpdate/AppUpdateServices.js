import axios from "axios";
//import FormData from "form-data";
import {EditAppVersionEndPoint, GetAppListEndPoint} from "../../../config/AppServerConfig";
import {GlobalConfig} from "./../../../Services/Helper/GlobalConfig";

class AppUpdateServices {
  static getAppList(data) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.get(GetAppListEndPoint , config);
  }

  static editAppVersion(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.post(EditAppVersionEndPoint,data,config)
  }

}



export {AppUpdateServices};
