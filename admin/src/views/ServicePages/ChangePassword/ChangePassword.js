import React, {Component} from "react";
import {Link} from "react-router-dom";
import {Badge, Card, CardBody, CardHeader, CardFooter, Col, Row, Table, Button,ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle, Modal, ModalBody, ModalFooter, ModalHeader, FormGroup, Label, Input} from "reactstrap";
import {RemoteCall} from "../../../Services/http/RemoteCall";
import Pagination from "react-js-pagination";
import { ClipLoader } from 'react-spinners';
import SweetAlert from "react-bootstrap-sweetalert";
import {GlobalConfig} from "./../../../Services/Helper/GlobalConfig";

class ChangePassword extends Component {
  state = {
    alert:null,
    loading: true,
    currentPass:"",
    newPass:"",
    confPass:""
  };

  componentDidMount() {
    //this.getAdminList();
    this.setState({
      loading: false
    });
  }
  hideAlert() {
    this.setState({
      alert: null
    });
  }




  saveChangePassword() {
    console.log("saveChangePassword" );
    console.log();
    this.setState({
      alert: null
    });
    this.setState({loading:true});
    RemoteCall.changePassword()
      .changePassword({
        userId: GlobalConfig.UserId,
        oldPass:this.state.currentPass,
        password:this.state.newPass,
        passwordConfirm:this.state.confPass
      })
      .then(
        resp => {
          if(resp.data.settings.status){
            const getAlert = () => (<SweetAlert success title="Password changed successfully!" onConfirm={() => this.hideAlert()}></SweetAlert>);
            //this.getAdminList();
            this.setState({
              alert: getAlert(),
              loading: false
            });
          }else{
            const getAlert = () => (<SweetAlert danger title={resp.data.settings.message} onConfirm={() => this.hideAlert()}></SweetAlert>);
            //this.getAdminList();
            this.setState({
              alert: getAlert(),
              loading: false
            });
          }


        },
        err => {
          ;
        }
      );
  }

  handleChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }
  render() {
    //const userList = this.state.usersData.filter(user => user.id < 10);

    return (
      <>
        <div className="animated fadeIn">
          <Col xs="6" lg="6">
            <Card>
              <CardHeader>
                <i className="fa fa-align-justify"></i> Change Password
              </CardHeader>
              <CardBody>
                <form>
                  <div className="form-group">
                    <FormGroup row>
                      <Col md="3">
                        <Label size="sm" >Current Password</Label>
                      </Col>
                      <Col xs="12" md="9">
                        <Input bsSize="sm" type="password"  value={this.state.currentPass}
                               name="currentPass"
                               onChange={e => this.handleChange(e)}
                               placeholder="Current Password" />
                      </Col>
                    </FormGroup>
                    <FormGroup row>
                      <Col md="3">
                        <Label size="sm" >New Password</Label>
                      </Col>
                      <Col xs="12" md="9">
                        <Input bsSize="sm" type="password"  value={this.state.newPass}
                               name="newPass"
                               onChange={e => this.handleChange(e)}
                               placeholder="New Password" />
                      </Col>
                    </FormGroup>
                    <FormGroup row>
                      <Col md="3">
                        <Label size="sm" >Confirm Password</Label>
                      </Col>
                      <Col xs="12" md="9">
                        <Input bsSize="sm" type="password"  value={this.state.confPass}
                               name="confPass"
                               onChange={e => this.handleChange(e)}
                               placeholder="Confirm Password" />
                      </Col>
                    </FormGroup>


                  </div>
                </form>

              </CardBody>
              <CardFooter>
                <Button type="submit" size="sm" color="primary" onClick={e => this.saveChangePassword(e)}><i className="fa fa-dot-circle-o"></i> Save</Button>
              </CardFooter>
            </Card>
          </Col>
        </div>

        {this.state.alert}{(this.state.loading) ? (
        <div className='sweet-loading'><ClipLoader sizeUnit={"px"} size={80} color={'#123abc'}
                                                   loading={this.state.loading}/></div>) : null}
      </>
    );
  }
}

export default ChangePassword;
