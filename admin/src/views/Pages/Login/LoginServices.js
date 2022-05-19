import axios from 'axios'
import {LoginEndPoint} from '../../../config/AppServerConfig'

class LoginServices {
    static Login( Userinfo){
        return axios.post(LoginEndPoint,Userinfo)
    }
}

export {LoginServices}