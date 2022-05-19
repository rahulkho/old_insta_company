import {GlobalConfig} from "../../../Services/Helper/GlobalConfig";
import axios from "axios";
import {SendEmailEndPoint} from "../../../config/AppServerConfig";

class SendEmailServices {
  static sendMail(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.post(SendEmailEndPoint,data,config)
  }

}

export {SendEmailServices}
