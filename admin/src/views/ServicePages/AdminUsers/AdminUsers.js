import React, {Component} from "react";
import {Link} from "react-router-dom";
import {Badge, Card, CardBody, CardHeader, Col, Row, Table, Button,ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle, Modal, ModalBody, ModalFooter, ModalHeader, FormGroup, Label, Input} from "reactstrap";
import {RemoteCall} from "../../../Services/http/RemoteCall";
import Pagination from "react-js-pagination";
import { ClipLoader } from 'react-spinners';
import SweetAlert from "react-bootstrap-sweetalert";
import countryData from '../../../Services/Helper/ContryList';
import Moment from 'react-moment';
import moment from 'moment';
import _ from 'lodash';


class AdminUsers extends Component {
  state = {
    alert:null,
    loading: true,
    adminData: [],
    activePage: 1,
    lengthPage: 50,
    countPage: 10,
    showAddUserModal : false,
    newUserFullName: "",
    newUserEmail:"",newUserPassword:"",
    newUserPasswordConfirm : ""
  };

  componentDidMount() {
    this.getAdminList();
  }
  hideAlert() {
    this.setState({
      alert: null
    });
  }



  getAdminList = (pageNumber) => {
    this.setState({loading: true});
    let paramObj = {
      page: pageNumber || 1
    };
    console.log(paramObj);
    RemoteCall.adminUserServices()
      .getAdminList(paramObj)
      .then(
        result => {
          console.log(result);
          if (
            result.data &&
            result.data.settings &&
            result.data.settings.status
          ) {
            console.log("true");
            this.setState({
              adminData: result.data.data,
              loading: false
            });
          }else{
            const getAlert = () => (<SweetAlert danger title={result.data.settings.message} onConfirm={() => this.hideAlert()}></SweetAlert>);
            //this.getAdminList();
            this.setState({
              alert: getAlert(),
              loading: false
            });
          }
        },
        err => {
          console.log(err);
        }
      );
  };
  handlePageChange = this.handlePageChange.bind(this);

  handlePageChange(pageNumber) {
    console.log(`active page is ${pageNumber}`);
    this.setState({activePage: pageNumber});
    this.getAdminList(pageNumber);
  }

  userDelete(user) {
    console.log(user);
    const getAlert = () => (
      <SweetAlert
        warning
        showCancel
        confirmBtnText="Yes"
        confirmBtnBsStyle="danger"
        cancelBtnBsStyle="default"
        title="Are you sure?"
        onConfirm={() => this.deleteUserSubmit(user)}
        onCancel={() => this.hideAlert()}
      >
        Are you sure want to delete  this user ?
      </SweetAlert>
    );
    this.setState({
      alert: getAlert()
    })
  }

  deleteUserSubmit(user) {
    console.log("deleteUserSubmit" );
    console.log(user);
    this.setState({
      alert: null
    });
    this.setState({loading:true});
    RemoteCall.adminUserServices()
      .deleteAdminUser({
        userId: user.userId,
        isActive: false
      })
      .then(
        resp => {

          const getAlert = () => (<SweetAlert success title="Deleted successfully!" onConfirm={() => this.hideAlert()}></SweetAlert>);
          this.getAdminList(this.state.activePage);
          this.setState({
            alert: getAlert()
          });

        },
        err => {
          ;
        }
      );
  }
  openAddUserPopup = event => {
    event.preventDefault();
    event.stopPropagation();
    this.setState({ newUserFullName: "", newUserEmail:"",newUserPassword:"",newUserPasswordConfirm : "" ,showAddUserModal: true });
  };
  closeModalPopup = event => {
    this.setState({ showAddUserModal: false });
  };
  handleChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }
  AddAdminUserSubmit = event => {
    this.setState({loading:true});
    RemoteCall.adminUserServices()
      .addAdminUser({
        name: this.state.newUserFullName,
        email: this.state.newUserEmail,
        password: this.state.newUserPassword,
        passwordConfirm: this.state.newUserPasswordConfirm
      })
      .then(
        resp => {
          console.log(resp.data);

          if(resp.data.settings.status){
            const getAlert = () => (<SweetAlert success title="User added successfully!" onConfirm={() => this.hideAlert()}></SweetAlert>);
            //this.getAdminList();
            this.setState({
              alert: getAlert(),
              loading: false
            });
            this.closeModalPopup();
            this.getAdminList();
          } else{
            const getAlert = () => (<SweetAlert danger title={resp.data.settings.message} onConfirm={() => this.hideAlert()}></SweetAlert>);
            //this.getAdminList();
            this.setState({
              alert: getAlert(),
              loading: false
            });
          }
        },
        err => {
          // console.log(err);
          // const getAlert = () => (
          //   <SweetAlert danger title="Error" onConfirm={() => this.hideAlert()}>{result.data.settings.message}</SweetAlert>
          // );
          // this.setState({
          //   alert: getAlert()
          // });
        }
      );
  };

  render() {
    //const userList = this.state.usersData.filter(user => user.id < 10);
    const UserRow = (props) => {
      const user = props.user;

      return (

        <tr key={"ad-"+user.userId}>
          <td>{user.name}</td>
          <td>{user.email}</td>
          <td>
            <Button color="danger" className="btn-sm" onClick={() => this.userDelete(user)}>
              <i className="fa fa-remove"></i>
            </Button>
          </td>
        </tr>
      );
    }

    return (
      <>
        <div className="animated fadeIn">
          <Col xs="12" lg="12">
            <Card>
              <CardHeader>
                <i className="fa fa-align-justify"></i> Admin Users
                <button
                  className="btn btn-primary btn-sm float-right mr-2"
                  onClick={e => this.openAddUserPopup(e)}
                >
                  Add Admin User
                </button>
              </CardHeader>
              <CardBody>
                <Table responsive striped>
                  <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Action</th>
                  </tr>
                  </thead>
                  <tbody>
                  {this.state.adminData.map((user, index) => (
                    <UserRow key={index} user={user}/>
                  ))}
                  </tbody>
                </Table>

              </CardBody>
            </Card>
          </Col>
        </div>
        <Modal isOpen={this.state.showAddUserModal} >
          <ModalHeader >Add Admin User</ModalHeader>
          <ModalBody>
            <form>
              <div className="form-group">
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" >Full Name</Label>
                  </Col>
                  <Col xs="12" md="9">
                    <Input bsSize="sm" type="text"  value={this.state.newUserFullName}
                           name="newUserFullName"
                           onChange={e => this.handleChange(e)}
                           placeholder="Type Full Name" />
                  </Col>
                </FormGroup>
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" >Email</Label>
                  </Col>
                  <Col xs="12" md="9">
                    <Input bsSize="sm" type="text"  value={this.state.newUserEmail}
                           name="newUserEmail"
                           onChange={e => this.handleChange(e)}
                           placeholder="Type Email" />
                  </Col>
                </FormGroup>
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" >Password</Label>
                  </Col>
                  <Col xs="12" md="9">
                    <Input bsSize="sm" type="password"  value={this.state.newUserPassword}
                           name="newUserPassword"
                           onChange={e => this.handleChange(e)}
                           placeholder="Type Password" />
                  </Col>
                </FormGroup>
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" >Confirm Password</Label>
                  </Col>
                  <Col xs="12" md="9">
                    <Input bsSize="sm" type="password"  value={this.state.newUserPasswordConfirm}
                           name="newUserPasswordConfirm"
                           onChange={e => this.handleChange(e)}
                           placeholder="Type Confirm  Password" />
                  </Col>
                </FormGroup>


              </div>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={e => this.AddAdminUserSubmit(e)}>Add</Button>{' '}
            <Button color="secondary" onClick={() => this.closeModalPopup()}>Cancel</Button>
          </ModalFooter>
        </Modal>
        {this.state.alert}{(this.state.loading) ? (
        <div className='sweet-loading'><ClipLoader sizeUnit={"px"} size={80} color={'#123abc'}
                                                   loading={this.state.loading}/></div>) : null}
      </>
    );
  }
}

export default AdminUsers;
