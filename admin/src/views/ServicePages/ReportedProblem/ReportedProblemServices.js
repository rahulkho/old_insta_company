import axios from "axios";
//import FormData from "form-data";
import {GetReportedProblemEndPoint,MarkAsBugEndPoint, MarkAsReadEndPoint} from "../../../config/AppServerConfig";
import {GlobalConfig} from "./../../../Services/Helper/GlobalConfig";

class ReportedProblemServices {
  static getReportProblemList(data) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.post(GetReportedProblemEndPoint, data, config);
  }

  static markAsBugSubmit(data) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.post(MarkAsBugEndPoint,data, config);
  }

  static markAsReadSubmit(data) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.post(MarkAsReadEndPoint,data, config);
  }
}

export {ReportedProblemServices};
