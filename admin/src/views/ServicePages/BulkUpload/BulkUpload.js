import React, {Component} from "react";
import {Link} from "react-router-dom";
import {Badge, Card, CardBody, CardHeader, Col, Row, Table, Button, Modal, ModalBody, ModalFooter, ModalHeader, FormGroup,  Label, Input} from "reactstrap";
import {RemoteCall} from "../../../Services/http/RemoteCall";
import SweetAlert from "react-bootstrap-sweetalert";
import { ClipLoader } from 'react-spinners';
import Moment from 'react-moment';
//import moment from "moment/moment";
//import usersData from './UsersData'

class BulkUpload extends Component {
  state = {
    loading: false,
    alert: null,
    showUploadeModal:false,
    file:null,
    type:""

  };

  handleChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }
  hideAlert() {
    this.setState({
      alert: null
    });
  }

  closeModalPopup = event => {
    this.setState({ showUploadeModal: false,file:null});
  };
  uploadCsv = (type) =>{
    this.setState({ showUploadeModal: true,type});
  }
  componentDidMount() {

  }

  fileAddChangedHandler = event => {
    this.setState({file: event.target.files[0]});
  }
  uploadSubmit = () => {
    let url = ""
    if(this.state.type == "sounds"){
      url = "admin/upload/sounds";
    }else if(this.state.type == "videoCategories"){
      url = "admin/upload/categories";
    }else if(this.state.type == "manageSounds"){
      url = "admin/upload/manage_sounds";
    }

    this.setState({loading:true});
    RemoteCall.bulkUpload()
      .uploadCsv({
        file: this.state.file
      },url
        )
      .then(
        resp => {
          this.setState({loading:false,file:null,showUploadeModal:false});
          const getAlert = () => (
            <SweetAlert success title="Success" onConfirm={() => this.hideAlert()}>CSV Uploaded Successfully</SweetAlert>
          );
          this.setState({
            alert: getAlert()
          });
        },
        err => {
          this.setState({ loading: false});
          const getAlert = () => (
            <SweetAlert danger title="Error" onConfirm={() => this.hideAlert()}>Please try again</SweetAlert>
          );
          this.setState({
            alert: getAlert()
          });
        }
      );
  }
  render() {
    //const userList = this.state.usersData.filter(user => user.id < 10);
    const AppListRows = (props) => {
      const app = props.apps;
      return (
        <tr key={"fb"+app.id.toString()} >
          <td>{app.platform}</td>
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
                      <th scope="col">Category</th>
                      <th scope="col">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr  >
                      <td>Video Categories</td>
                      <td>
                        <Button color="primary" className="mr-2 btn-sm" onClick={() => this.uploadCsv("videoCategories")}>
                          Upload
                        </Button>
                      </td>
                    </tr>
                    <tr  >
                      <td>Sounds</td>
                      <td>
                        <Button color="primary" className="mr-2 btn-sm" onClick={() => this.uploadCsv("sounds")}>
                          Upload
                        </Button>
                      </td>
                    </tr>
                    <tr  >
                      <td>Manage Sounds</td>
                      <td>
                        <Button color="primary" className="mr-2 btn-sm" onClick={() => this.uploadCsv("manageSounds")}>
                          Upload
                        </Button>
                      </td>
                    </tr>
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </div>
        <Modal isOpen={this.state.showUploadeModal} >
          <ModalHeader >Update CSV</ModalHeader>
          <ModalBody>
            <form>
              <div className="form-group">
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">CSV</Label></Col>
                  <Col xs="12" md="9">
                    {/*<div className="mt-2 mb-2 border w-25 p-3"><img src={this.state.newImgVal  || "https://s3-us-west-1.amazonaws.com/insta-assets/placeholders/category_image.png"} style={{borderRadius:"0px"}} className="img-avatar" /></div>*/}
                    <Input bsSize="sm" type="file" accept="image/csv" onChange={this.fileAddChangedHandler}/>
                  </Col>
                </FormGroup>
              </div>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button disabled={!this.state.file} color="primary" onClick={e => this.uploadSubmit(e)}>Upload</Button>{' '}
            <Button color="secondary" onClick={() => this.closeModalPopup()}>Cancel</Button>
          </ModalFooter>
        </Modal>
        {this.state.alert}{(this.state.loading)?(<div className='sweet-loading'><ClipLoader sizeUnit={"px"} size={80} color={'#123abc'} loading={this.state.loading} /> </div>):null }
      </>
    );
  }
}

export default BulkUpload;
