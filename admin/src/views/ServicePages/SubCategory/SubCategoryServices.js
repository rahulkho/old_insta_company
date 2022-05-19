import axios from "axios";
//import FormData from "form-data";
import {SubCategoryListListEndPoint, AddSubCategoryEndPoint, EditSubCategoryEndPoint, DeleteSubCategoryEndPoint} from "../../../config/AppServerConfig";
import {GlobalConfig} from "./../../../Services/Helper/GlobalConfig";

class SubCategoryServices {
  static getSubCategoryList(pageNum) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.get(SubCategoryListListEndPoint , config);
  }

  static addSubCategory(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.post(AddSubCategoryEndPoint,data,config)
  }

  static editSubCategory(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.post(EditSubCategoryEndPoint,data,config)
  }

  static deleteSubCategory(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.post(DeleteSubCategoryEndPoint,data,config)
  }
}




export {SubCategoryServices};
