import axios from "axios";
//import FormData from "form-data";
import {SoundCategoryListListEndPoint, AddSoundCategoryLCategoryEndPoint, EditSoundCategoryEndPoint, DeleteSoundCategoryEndPoint, UploadImageSoundCategoryEndPoint, UploadVideoCategoryEndPoint} from "../../../config/AppServerConfig";
import {GlobalConfig} from "./../../../Services/Helper/GlobalConfig";

class SoundCategoryServices {
  static getCategoryList(pageNum) {
    if (!pageNum) {
      pageNum = 1;
    }
    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.get(SoundCategoryListListEndPoint + "/page/" + pageNum, config);
  }

  static addCategory(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.post(AddSoundCategoryLCategoryEndPoint,data,config)
  }

  static editCategory(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.patch(EditSoundCategoryEndPoint,data,config)
  }

  static deleteCategory(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.delete(DeleteSoundCategoryEndPoint+"/"+data.id,config)
  }

  static uploadImage(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    const formData = new FormData()
    formData.append(
      'image',
      data.image,
      data.image.name
    );
    return axios.post(UploadImageSoundCategoryEndPoint,formData,config)
  }

  static uploadVideo(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    const formData = new FormData()
    formData.append(
      'file',
      data.file,
      data.file.name
    );
    return axios.post(UploadVideoCategoryEndPoint,formData,config)
  }

}


export {SoundCategoryServices};
