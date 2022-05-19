import axios from "axios";
//import FormData from "form-data";
import {KeywordsListListEndPoint, AddKeywordsEndPoint, EditKeywordsEndPoint, DeleteKeywordsEndPoint} from "../../../config/AppServerConfig";
import {GlobalConfig} from "./../../../Services/Helper/GlobalConfig";

class KeywordsServices {
  static getKeywordsList(pageNum) {

    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.get(KeywordsListListEndPoint , config);
  }

  static addKeyword(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.post(AddKeywordsEndPoint,data,config)
  }

  static editKeywords(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.post(EditKeywordsEndPoint,data,config)
  }

  static deleteKeywords(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.post(DeleteKeywordsEndPoint,data,config)
  }
}




export {KeywordsServices};
