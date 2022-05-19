import axios from "axios";
//import FormData from "form-data";
import {AppServiceName} from "../../../config/AppServerConfig";
import {GlobalConfig} from "./../../../Services/Helper/GlobalConfig";

class BulkUploadServices {
  static uploadCsv(data,url) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    const formData = new FormData()
    formData.append(
      'file',
      data.file,
      data.file.name
    );
    return axios.post(AppServiceName+url,formData,config)
  }

}



export {BulkUploadServices};
