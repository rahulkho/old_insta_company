import axios from "axios";
//import FormData from "form-data";
import {AddAdminUserEndPoint, DeleteAdminUserEndPoint, AdminListEndPoint} from "../../../config/AppServerConfig";
import {GlobalConfig} from "./../../../Services/Helper/GlobalConfig";


class AdminUserServices {
  static getAdminList(){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.get(AdminListEndPoint,config)
  }

  static addAdminUser(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.post(AddAdminUserEndPoint,data,config)
  }

  static deleteAdminUser(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.post(DeleteAdminUserEndPoint,data,config)
  }
}


export {AdminUserServices};
