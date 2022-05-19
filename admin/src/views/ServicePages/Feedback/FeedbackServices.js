import axios from "axios";
//import FormData from "form-data";
import {GetFeedBackEndPoint, MarkAsReadEndPoint} from "../../../config/AppServerConfig";
import {GlobalConfig} from "./../../../Services/Helper/GlobalConfig";

class FeedbackServices {
  static getFeedbackList(data) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.post(GetFeedBackEndPoint , data, config);
  }

  static markAsReadSubmit(data) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.post(MarkAsReadEndPoint,data, config);
  }

}



export {FeedbackServices};
