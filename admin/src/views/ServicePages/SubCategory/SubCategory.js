import React, {Component} from "react";
//import {Link} from "react-router-dom";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  Col,
  Row,
  Table,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  FormGroup,
  Label,
  Input,
  NavLink,
  InputGroup, InputGroupAddon
} from "reactstrap";
import {RemoteCall} from "../../../Services/http/RemoteCall";
import SweetAlert from "react-bootstrap-sweetalert";
import Pagination from "react-js-pagination";
import { ClipLoader } from 'react-spinners';
import _ from 'lodash';
import './SubCategory.css';
//import usersData from './UsersData'

class SubCategory extends Component {


  state = {
    loading: true,
    SubCategoryData: [],
    showAddSubCategoryModal : false,
    activeCatPage: 1,
    lengthCatPage: 50,
    addSubCategory:"",
    editSubCategory:"",
    editSubCategoryId:"",
    deleteSubCategoryId:"",
    showEditSubCategoryModal:false,
    searchSubCategory:"",
    SubCategoryDataFilter:[]
  };

  AddSubCategorySubmit = event => {
    if(this.state.addSubCategory.trim().length < 3){
      const getAlert = () => (
        <SweetAlert danger title="Error" onConfirm={() => this.hideAlert()}>Minimum 3 character required </SweetAlert>
      );
      this.setState({
        alert: getAlert()
      });
      return;
    }
    this.setState({loading:true});
    RemoteCall.subCategoryServices()
      .addSubCategory({
        subcategory: this.state.addSubCategory
      })
      .then(
        resp => {
          console.log(resp.data);
          this.closeModalPopup();
          this.getSubCategoryList();
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

  editSubCategory = (data) => {

    this.setState({
      showEditSubCategoryModal: true,
      editSubCategory:data.subcategory,
      editSubCategoryId:data.id,
    });
  }

  deleteCategory = (data) => {
    this.setState({
      editSubCategory:data.subcategory,
      editSubCategoryId:data.id,
    });
    console.log("delete",data);
    const getAlert = () => (
      <SweetAlert
        warning
        showCancel
        confirmBtnText="Yes, delete it!"
        confirmBtnBsStyle="danger"
        cancelBtnBsStyle="default"
        title="Are you sure?"
        onConfirm={() => this.deleteSubCategorytSubmit()}
        onCancel={() => this.hideAlert()}
      >
    You will not be able to recover this SubCategory!
  </SweetAlert>
    );
    this.setState({
      alert: getAlert()
    });

  }
  deleteSubCategorytSubmit = event => {
    this.setState({
      alert: null
    });
    this.setState({loading:true});
    RemoteCall.subCategoryServices()
      .deleteSubCategory({
        id: this.state.editSubCategoryId
      })
      .then(
        resp => {
          this.closeModalPopup();
          this.getSubCategoryList();
          const getAlert = () => (<SweetAlert success title="Deleted successfully!" onConfirm={() => this.hideAlert()}></SweetAlert>);
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
  editSubCategorySubmit = event => {
    if(this.state.editSubCategory.trim().length < 3){
      const getAlert = () => (
        <SweetAlert danger title="Error" onConfirm={() => this.hideAlert()}>Minimum 3 character required </SweetAlert>
      );
      this.setState({
        alert: getAlert()
      });
      return;
    }
    this.setState({loading:true});
    RemoteCall.subCategoryServices()
      .editSubCategory({
        id: this.state.editSubCategoryId,
        subcategory: this.state.editSubCategory
      })
      .then(
        resp => {
          this.closeModalPopup();
          this.getSubCategoryList();
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

  closeModalPopup = event => {
    this.setState({ showAddSubCategoryModal: false, showEditSubCategoryModal : false });
  };
  openAddSubCategoryPopup = event => {
    event.preventDefault();
    event.stopPropagation();
    this.setState({ showAddSubCategoryModal:true ,addSubCategory: "" });
  };
  handleChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }
  handleChangeSearch(event) {
    let searchString = event.target.value;
    console.log("[searchString]",searchString)
    this.setState({[event.target.name]: event.target.value,              SubCategoryDataFilter: _.filter(this.state.SubCategoryData, function(o) { return (o.subcategory.toLowerCase().includes(searchString.toLowerCase())) }) || []});
  }
  hideAlert() {
    this.setState({
      alert: null
    });
  }
  handlePageChange = this.handlePageChange.bind(this);
  handlePageChange(pageNumber) {
    this.setState({activeCatPage: pageNumber});
    this.getSubCategoryList(pageNumber);
  }
  componentDidMount() {
    this.getSubCategoryList();
  }
  getSubCategoryList = () => {
    this.setState({loading:true});
    RemoteCall.subCategoryServices()
      .getSubCategoryList()
      .then(
        result => {
          console.log(result);
          if (
            result.data &&
            result.data.settings &&
            result.data.settings.status
          ) {
            let searchString = this.state.searchSubCategory;
            this.setState({
              SubCategoryData: result.data.data.rows,
              activeCatPage: result.data.data.page,
              countCatPage: result.data.data.count,
              SubCategoryDataFilter: _.filter(result.data.data.rows, function(o) { return (o.subcategory.toLowerCase().indexOf(searchString.toLowerCase()) > -1) }) || [],
              loading:false
            });
            console.log("[filter test]",_.filter(result.data.data.rows, function(o) { return (o.subcategory.toLowerCase().indexOf(searchString.toLowerCase()) > -1) }));
          }
        },
        err => {
          console.log(err);
        }
      );
  };

  render() {
    //const userList = this.state.usersData.filter(user => user.id < 10);

    return (
      <>
        <div className="animated fadeIn">
          <Row>
            <Col xl={12}>
              <Card>
                <CardHeader>
                  <i className="fa fa-align-justify" /> Subcategory{" "}
                  <small className="text-muted"></small>
                  <button
                    className="btn btn-primary btn-sm float-right mr-2"
                    onClick={e => this.openAddSubCategoryPopup(e)}
                  >
                    Add Subcategory
                  </button>
                </CardHeader>
                <CardBody>
                  <FormGroup row>

                    <Col md="3" className="ml-2">
                      <InputGroup>
                        <InputGroupAddon addonType="prepend">
                          <Button type="button" color="primary"><i className="fa fa-search"></i> Search</Button>
                        </InputGroupAddon>
                        <Input type="text"
                               name="searchSubCategory"
                               onChange ={e => this.handleChangeSearch(e)}
                               placeholder="Type Subcategory..." />
                      </InputGroup>
                    </Col>
                    <Col xs="3" md="3">

                    </Col>
                  </FormGroup>
                  <Table responsive hover>
                    <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Edit</th>
                    </tr>
                    </thead>
                    <tbody>
                    {this.state.SubCategoryDataFilter.map((SubCategory, index) => (

                      <tr key={SubCategory.id.toString()}>
                        <td>{SubCategory.subcategory}</td>

                        <td>
                          <Button color="primary" className="mr-2 btn-sm" onClick={() => this.editSubCategory(SubCategory)}>
                            <i className="fa fa-edit"></i>
                          </Button>
                          <Button color="danger" className="btn-sm" onClick={() => this.deleteCategory(SubCategory)}>
                            <i className="fa fa-remove"></i>
                          </Button>

                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </Table>

                </CardBody>
              </Card>
            </Col>
          </Row>
          {/*<Pagination*/}
            {/*activePage={this.state.activeCatPage}*/}
            {/*itemsCountPerPage={this.state.lengthCatPage}*/}
            {/*totalItemsCount={this.state.countCatPage}*/}
            {/*onChange={this.handlePageChange}*/}
            {/*itemClass="page-item"*/}
            {/*linkClass="page-link"*/}
          {/*/>*/}
        </div>
        <Modal isOpen={this.state.showAddSubCategoryModal} >
          <ModalHeader >Add New Subcategory</ModalHeader>
          <ModalBody>
            <form>
              <div className="form-group">
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">Subcategory Name</Label>
                  </Col>
                  <Col xs="12" md="9">
                    <Input bsSize="sm" type="text"  value={this.addSubCategory}
                           name="addSubCategory"
                           onChange={e => this.handleChange(e)}
                           placeholder="Type Subcategory..." />
                  </Col>
                </FormGroup>

              </div>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={e => this.AddSubCategorySubmit(e)}>Add</Button>{' '}
            <Button color="secondary" onClick={() => this.closeModalPopup()}>Cancel</Button>
          </ModalFooter>
        </Modal>

        <Modal isOpen={this.state.showEditSubCategoryModal} >
          <ModalHeader >Edit Subcategory</ModalHeader>
          <ModalBody>
            <form>
              <div className="form-group">
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">Subcategory Name</Label>
                  </Col>
                  <Col xs="12" md="9">
                    <Input bsSize="sm" type="text"  value={this.state.editSubCategory}
                           name="editSubCategory"
                           onChange={e => this.handleChange(e)}
                           placeholder="Type Subcategory..." />
                  </Col>
                </FormGroup>

              </div>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={e => this.editSubCategorySubmit(e)}>Save</Button>{' '}
            <Button color="secondary" onClick={() => this.closeModalPopup()}>Cancel</Button>
          </ModalFooter>
        </Modal>

        {this.state.alert}{(this.state.loading)?(<div className='sweet-loading'><ClipLoader sizeUnit={"px"} size={80} color={'#123abc'} loading={this.state.loading} /> </div>):null }
      </>
    );
  }
}

export default SubCategory;
