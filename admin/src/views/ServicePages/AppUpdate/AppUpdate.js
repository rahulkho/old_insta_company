import React, {Component} from "react";
import {Link} from "react-router-dom";
import {Badge, Card, CardBody, CardHeader, Col, Row, Table, Button, Modal, ModalBody, ModalFooter, ModalHeader, FormGroup,  Label, Input} from "reactstrap";
import {RemoteCall} from "../../../Services/http/RemoteCall";
import SweetAlert from "react-bootstrap-sweetalert";
import { ClipLoader } from 'react-spinners';
import Moment from 'react-moment';
//import moment from "moment/moment";
//import usersData from './UsersData'

class AppUpdate extends Component {
  state = {
    loading: true,
    appsData: [],
    alert: null,
    showAppUpdateModal:false,
    editAppId:0,
    editAppPlatform:"",
    editAppVersion:0,
    editForcedUpdate:true
  };
  editForcedUpdateChange  = this.editForcedUpdateChange.bind(this);

  handleChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }
  hideAlert() {
    this.setState({
      alert: null
    });
  }

  closeModalPopup = event => {
    this.setState({ showAppUpdateModal: false});
  };

  componentDidMount() {
    this.getAppList();
  }
  getAppList = () => {
    this.setState({loading:true});

    RemoteCall.appUpdateServices()
      .getAppList()
      .then(
        result => {
          console.log(result);
          if (
            result.data &&
            result.data.settings &&
            result.data.settings.status
          ) {
            this.setState({appsData: result.data.data,
              loading:false
            });
          }
        },
        err => {
          console.log(err);
        }
      );
  };
  editAppVersion = (data) => {
    this.setState({
      showAppUpdateModal: true,
      editAppId:data.id,
      editAppPlatform:data.platform,
      editAppVersion:data.version,
      editForcedUpdate:data.forcedUpdate
    });
  }

  editAppVersionSubmit = (data) => {
    this.setState({loading:true});
    RemoteCall.appUpdateServices()
      .editAppVersion({
        id: this.state.editAppId,
        platform: this.state.editAppPlatform,
        version: this.state.editAppVersion,
        forcedUpdate: this.state.editForcedUpdate
      })
      .then(
        resp => {
          this.closeModalPopup();
          this.getAppList();
          const getAlert = () => (<SweetAlert success title="App Updated !" onConfirm={() => this.hideAlert()}></SweetAlert>);
          this.setState({
            alert: getAlert()
          });
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
  }

  editForcedUpdateChange(event){
    this.setState({editForcedUpdate:event.target.checked}, () => {
    });
  }

  render() {
    //const userList = this.state.usersData.filter(user => user.id < 10);
    const AppListRows = (props) => {
      const app = props.apps;
      return (
        <tr key={"fb"+app.id.toString()} >
          <td>{app.platform}</td>
          <td>{app.version}</td>
          <td><Badge className="mr-1" color={app.forcedUpdate?"danger":"success"}>{app.forcedUpdate?"Yes":"No"}</Badge></td>
          <td>
            <Button color="primary" className="mr-2 btn-sm" onClick={() => this.editAppVersion(app)}>
              <i className="fa fa-edit"></i>
            </Button>
          </td>
        </tr>
      );
    }
    return (
      <>
        <div className="animated fadeIn">

          <Row>
            <Col xl={12}>
              <Card>
                <CardHeader>
                  <i className="fa fa-align-justify" /> App Versions{" "}
                  <small className="text-muted"></small>
                </CardHeader>
                <CardBody>
                  <Table responsive hover>
                    <thead>
                    <tr>
                      <th scope="col">Platform</th>
                      <th scope="col">Version</th>
                      <th scope="col">Force Update</th>
                      <th scope="col">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    {this.state.appsData.map((apps, index) => (
                      <AppListRows key={index} apps={apps} />
                    ))}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </div>
        <Modal isOpen={this.state.showAppUpdateModal} >
          <ModalHeader >Update Version</ModalHeader>
          <ModalBody>
            <form>
              <div className="form-group">
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">Platform</Label></Col>
                  <Col xs="12" md="9">
                    <Input bsSize="sm" type="text"  name="editAppPlatformExtra"  value={this.state.editAppPlatform} onChange={e => this.handleChange(e)} />
                  </Col></FormGroup>
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">Version</Label></Col>
                  <Col xs="12" md="9">
                    <Input bsSize="sm" value={this.state.editAppVersion}
                           name="editAppVersion"
                           placeholder="Enter Version" onChange={e => this.handleChange(e)} />
                  </Col></FormGroup>
                <FormGroup row>
                  <Col md="3">
                    </Col>
                  <Col xs="12" md="9">
                    <div className="custom-checkbox custom-control mt-2">
                      <input type="checkbox" id="editForcedUpdateBox"  defaultChecked={this.state.editForcedUpdate} onChange={this.editForcedUpdateChange} className="custom-control-input"/><label className="custom-control-label" htmlFor="editForcedUpdateBox">Force Update</label>
                    </div>

                  </Col></FormGroup>

              </div>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={e => this.editAppVersionSubmit(e)}>Edit</Button>{' '}
            <Button color="secondary" onClick={() => this.closeModalPopup()}>Cancel</Button>
          </ModalFooter>
        </Modal>
        {this.state.alert}{(this.state.loading)?(<div className='sweet-loading'><ClipLoader sizeUnit={"px"} size={80} color={'#123abc'} loading={this.state.loading} /> </div>):null }
      </>
    );
  }
}

export default AppUpdate;
