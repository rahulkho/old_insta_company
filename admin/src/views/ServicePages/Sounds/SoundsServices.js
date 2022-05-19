import axios from "axios";
//import FormData from "form-data";
import {SoundListListEndPoint, AllCategoriesEndPoint, AddSoundCategoryLCategoryEndPoint, EditSoundEndPoint, DeleteSoundCategoryEndPoint, UploadImageSoundCategoryEndPoint, UploadVideoCategoryEndPoint, DeleteSoundEndPoint} from "../../../config/AppServerConfig";
import {GlobalConfig} from "./../../../Services/Helper/GlobalConfig";

class SoundsServices {
  static getSoundList(pageNum,text) {
    if (!pageNum) {
      pageNum = 1;
    }
    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.get(SoundListListEndPoint + "/page/" + pageNum+"?text="+text, config);
  }
  static getCategoryList() {
    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.get(AllCategoriesEndPoint , config);
  }

  static addCategory(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.post(AddSoundCategoryLCategoryEndPoint,data,config)
  }

  static editSound(id,data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.put(EditSoundEndPoint+"/"+id,data,config)
  }

  static deleteCategory(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.delete(DeleteSoundCategoryEndPoint+"/"+data.id,config)
  }
  static deleteSound(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.delete(DeleteSoundEndPoint+"/"+data.id,config)
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


export {SoundsServices};
