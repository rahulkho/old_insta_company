import {LoginServices} from "../../views/Pages/Login/LoginServices";
import {GetDashboardCountServices} from "../../views/Dashboard/DashboardServices";
import {UsersServices} from "../../views/ServicePages/Users/UserServices";
import {FeedbackServices} from "../../views/ServicePages/Feedback/FeedbackServices";
import {ReportedProblemServices} from "../../views/ServicePages/ReportedProblem/ReportedProblemServices";
import {CategoryServices} from "../../views/ServicePages/Category/CategoryServices";
import {PostServices} from "../../views/ServicePages/Posts/PostServices";
import {AdminUserServices} from "../../views/ServicePages/AdminUsers/AdminUsersServices";
import {ChangePassordServices} from "../../views/ServicePages/ChangePassword/ChangePasswordServices";
import {AppUpdateServices} from "../../views/ServicePages/AppUpdate/AppUpdateServices";
import {BulkUploadServices} from "../../views/ServicePages/BulkUpload/BulkUploadServices";
import {SendEmailServices} from "../../views/ServicePages/EmailEditor/EmailEditorServices";
import {KeywordsServices} from "../../views/ServicePages/Keywords/KeywordsServices";
import {SubCategoryServices} from "../../views/ServicePages/SubCategory/SubCategoryServices";
import {SoundCategoryServices } from "../../views/ServicePages/SoundCategory/CategoryServices";
import {SoundsServices } from "../../views/ServicePages/Sounds/SoundsServices";
class RemoteCall {
  static Authenticate() {
    return LoginServices;
  }
  static usersServices() {
    return UsersServices;
  }

  static categoryServices() {
    return CategoryServices;
  }
  static SoundCategoryServices() {
    return SoundCategoryServices;
  }
  static SoundServices() {
    return SoundsServices;
  }

  static feedbackServices() {
    return FeedbackServices;
  }

  static getDashboardCount() {
    return GetDashboardCountServices;
  }
  static reportedProblemServices() {
    return ReportedProblemServices;
  }

  static postServices() {
    return PostServices;
  }

  static adminUserServices() {
    return AdminUserServices;
  }

  static changePassword() {
    return ChangePassordServices;
  }

  static appUpdateServices() {
    return AppUpdateServices;
  }
  static editAppVersion() {
    return AppUpdateServices;
  }
  static sendEmail() {
    return SendEmailServices;
  }


  static bulkUpload() {
    return BulkUploadServices;
  }



  static keywordsServices() {
    return KeywordsServices;
  }

  static subCategoryServices() {
    return SubCategoryServices;
  }


}

export {RemoteCall};
