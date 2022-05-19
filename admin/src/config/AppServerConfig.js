//import {GlobalConfig} from "../Services/Helper/GlobalConfig";

// export const AppServiceName = "https://live.lellenge.com/v1/" //Production
export const AppServiceName = "https://api.lellenge.com/v1/" // Dev


export const AppHostName = ""; // Self Address

export const LoginEndPoint = AppServiceName + "admin/login";
export const DashboardCountEndPoint = AppServiceName + "admin/getCounts";
export const UsersListEndPoint = AppServiceName + "admin/users";
export const UsersStatusEndPoint = AppServiceName + "admin/setUserStatus";
export const CategoryListListEndPoint = AppServiceName + "admin/category/page/";
export const GetPostListEndPoint = AppServiceName + "admin/posts";
export const DisablePostEndPoint = AppServiceName + "admin/togglePostActive";
export const UsersSponsoredEndPoint = AppServiceName + "admin/setUserSponsored";

export const AddCategoryEndPoint = AppServiceName + "admin/category";
export const EditCategoryEndPoint = AppServiceName + "admin/category";
export const DeleteCategoryEndPoint = AppServiceName + "admin/category/";
export const UploadImageCategoryEndPoint = AppServiceName + "admin/categoryImage";
export const UploadVideoCategoryEndPoint = AppServiceName + "admin/categoryVideo";

export const GetFeedBackEndPoint = AppServiceName + "admin/feedbacks";
export const GetReportedProblemEndPoint = AppServiceName + "admin/reports";
export const MarkAsBugEndPoint = AppServiceName + "admin/setIsBug";
export const MarkAsReadEndPoint = AppServiceName + "admin/setIsRead";

export const AdminListEndPoint = AppServiceName + "admin/all";
export const AddAdminUserEndPoint = AppServiceName + "admin/addAdminUser";
export const DeleteAdminUserEndPoint = AppServiceName + "admin/deleteAdminUser";

export const ChangePasswordEndPoint = AppServiceName + "admin/changePassword";

export const GetAppListEndPoint = AppServiceName + "admin/appVersions";
export const EditAppVersionEndPoint = AppServiceName + "admin/updateAppVersion";

export const SendEmailEndPoint = AppServiceName + "admin/sendEmail";


export const KeywordsListListEndPoint = AppServiceName + "admin/keywords";
export const AddKeywordsEndPoint = AppServiceName + "admin/addKeyword";
export const EditKeywordsEndPoint = AppServiceName + "admin/updateKeyword";
export const DeleteKeywordsEndPoint = AppServiceName + "admin/deleteKeyword";


export const SubCategoryListListEndPoint = AppServiceName + "admin/subcategories";
export const AddSubCategoryEndPoint = AppServiceName + "admin/addSubcategory";
export const EditSubCategoryEndPoint = AppServiceName + "admin/updateSubcategory";
export const DeleteSubCategoryEndPoint = AppServiceName + "admin/deleteSubcategory";

export const SoundCategoryListListEndPoint = AppServiceName + "admin/soundcategory";
export const AddSoundCategoryLCategoryEndPoint = AppServiceName + "admin/soundcategory";
export const EditSoundCategoryEndPoint = AppServiceName + "admin/soundcategory";
export const UploadImageSoundCategoryEndPoint = AppServiceName + "admin/soundCategoryImage";
export const DeleteSoundCategoryEndPoint = AppServiceName + "admin/soundcategory";
export const SetUserCountriesEndPoin = AppServiceName + "admin/setUserCountries";


export const AllCategoriesEndPoint = AppServiceName + "admin/allCategories";
export const SoundListListEndPoint = AppServiceName + "admin/sounds";
export const EditSoundEndPoint = AppServiceName + "admin/sounds";
export const DeleteSoundEndPoint = AppServiceName + "admin/sounds";


