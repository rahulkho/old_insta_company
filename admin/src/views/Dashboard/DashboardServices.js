import axios from "axios";
import {DashboardCountEndPoint} from "../../config/AppServerConfig";
import {GlobalConfig} from "./../../Services/Helper/GlobalConfig";

class GetDashboardCountServices {
  static getDashboardCount(data) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.post(DashboardCountEndPoint,data, config);
  }
}

export {GetDashboardCountServices}
