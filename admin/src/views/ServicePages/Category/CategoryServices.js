import axios from "axios";
//import FormData from "form-data";
import {CategoryListListEndPoint, AddCategoryEndPoint, EditCategoryEndPoint, DeleteCategoryEndPoint, UploadImageCategoryEndPoint, UploadVideoCategoryEndPoint} from "../../../config/AppServerConfig";
import {GlobalConfig} from "./../../../Services/Helper/GlobalConfig";

class CategoryServices {
  static getCategoryList(pageNum) {
    if (!pageNum) {
      pageNum = 1;
    }
    const config = {
      headers: {"Authorization": GlobalConfig.Token}
    };
    return axios.get(CategoryListListEndPoint + "" + pageNum, config);
  }

  static addCategory(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.post(AddCategoryEndPoint,data,config)
  }

  static editCategory(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.patch(EditCategoryEndPoint,data,config)
  }

  static deleteCategory(data){
    const config = {
      headers: { "Authorization": GlobalConfig.Token }
    }
    return axios.delete(DeleteCategoryEndPoint+""+data.categoryId,config)
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
    return axios.post(UploadImageCategoryEndPoint,formData,config)
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


export {CategoryServices};
