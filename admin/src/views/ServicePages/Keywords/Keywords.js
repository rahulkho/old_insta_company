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
import './Keywords.css';
//import usersData from './UsersData'

class Keywords extends Component {


  state = {
    loading: true,
    keywordsData: [],
    showAddKeywordModal : false,
    activeCatPage: 1,
    lengthCatPage: 50,
    addKeyWord:"",
    editKeyWord:"",
    editKeyWordId:"",
    deleteKeyWordId:"",
    showEditKeywordModal:false,
    searchKeyword:"",
    keywordsDataFilter:[]
  };

  AddKeywordsSubmit = event => {
    if(this.state.addKeyWord.trim().length < 3){
      const getAlert = () => (
        <SweetAlert danger title="Error" onConfirm={() => this.hideAlert()}>Minimum 3 character required </SweetAlert>
      );
      this.setState({
        alert: getAlert()
      });
      return;
    }
    this.setState({loading:true});
    RemoteCall.keywordsServices()
      .addKeyword({
        keyword: this.state.addKeyWord
      })
      .then(
        resp => {
          console.log(resp.data);
          this.closeModalPopup();
          this.getKeywordsList();
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

  editKeywords = (data) => {

    this.setState({
      showEditKeywordModal: true,
      editKeyWord:data.keyword,
      editKeyWordId:data.id,
    });
  }

  deleteCategory = (data) => {
    this.setState({
      editKeyWord:data.keyword,
      editKeyWordId:data.id,
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
        onConfirm={() => this.deleteKeywordstSubmit()}
        onCancel={() => this.hideAlert()}
      >
    You will not be able to recover this keyword!
  </SweetAlert>
    );
    this.setState({
      alert: getAlert()
    });

  }
  deleteKeywordstSubmit = event => {
    this.setState({
      alert: null
    });
    this.setState({loading:true});
    RemoteCall.keywordsServices()
      .deleteKeywords({
        id: this.state.editKeyWordId
      })
      .then(
        resp => {
          this.closeModalPopup();
          this.getKeywordsList();
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
  editKeywordsSubmit = event => {
    if(this.state.editKeyWord.trim().length < 3){
      const getAlert = () => (
        <SweetAlert danger title="Error" onConfirm={() => this.hideAlert()}>Minimum 3 character required </SweetAlert>
      );
      this.setState({
        alert: getAlert()
      });
      return;
    }
    this.setState({loading:true});
    RemoteCall.keywordsServices()
      .editKeywords({
        id: this.state.editKeyWordId,
        keyword: this.state.editKeyWord
      })
      .then(
        resp => {
          this.closeModalPopup();
          this.getKeywordsList();
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
    this.setState({ showAddKeywordModal: false, showEditKeywordModal : false });
  };
  openAddKeywordPopup = event => {
    event.preventDefault();
    event.stopPropagation();
    this.setState({ showAddKeywordModal:true ,addKeyWord: "" });
  };
  handleChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }
  handleChangeSearch(event) {
    let searchString = event.target.value;
    console.log("[searchString]",searchString)
    this.setState({[event.target.name]: event.target.value,              keywordsDataFilter: _.filter(this.state.keywordsData, function(o) { return (o.keyword.toLowerCase().includes(searchString.toLowerCase())) }) || []});
  }
  hideAlert() {
    this.setState({
      alert: null
    });
  }
  handlePageChange = this.handlePageChange.bind(this);
  handlePageChange(pageNumber) {
    this.setState({activeCatPage: pageNumber});
    this.getKeywordsList(pageNumber);
  }
  componentDidMount() {
    this.getKeywordsList();
  }
  getKeywordsList = () => {
    this.setState({loading:true});
    RemoteCall.keywordsServices()
      .getKeywordsList()
      .then(
        result => {
          console.log(result);
          if (
            result.data &&
            result.data.settings &&
            result.data.settings.status
          ) {
            let searchString = this.state.searchKeyword;
            this.setState({
              keywordsData: result.data.data.rows,
              activeCatPage: result.data.data.page,
              countCatPage: result.data.data.count,
              keywordsDataFilter: _.filter(result.data.data.rows, function(o) { return (o.keyword.toLowerCase().indexOf(searchString.toLowerCase()) > -1) }) || [],
              loading:false
            });
            console.log("[filter test]",_.filter(result.data.data.rows, function(o) { return (o.keyword.toLowerCase().indexOf(searchString.toLowerCase()) > -1) }));
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
                  <i className="fa fa-align-justify" /> Keywords{" "}
                  <small className="text-muted"></small>
                  <button
                    className="btn btn-primary btn-sm float-right mr-2"
                    onClick={e => this.openAddKeywordPopup(e)}
                  >
                    Add Keyword
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
                               name="searchKeyword"
                               onChange ={e => this.handleChangeSearch(e)}
                               placeholder="Type Keyword..." />
                      </InputGroup>
                    </Col>
                    <Col xs="3" md="3">

                    </Col>
                  </FormGroup>
                  {this.state.keywordsDataFilter.map((keyword, index) => (
                    <Badge key={"arule"+index} className="mr-1 mt-1 mb-2  ml-3 largeBadge" color="primary"><i className="fa fa-edit pointer" onClick={() => this.editKeywords(keyword)}></i> | <span className="innerBadgeSpan" title={keyword.keyword}>{keyword.keyword}</span>  | <i className="fa fa-remove pointer" onClick={() => this.deleteCategory(keyword)}></i></Badge>

                  ))}
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
        <Modal isOpen={this.state.showAddKeywordModal} >
          <ModalHeader >Add New Keyword</ModalHeader>
          <ModalBody>
            <form>
              <div className="form-group">
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">Keyword</Label>
                  </Col>
                  <Col xs="12" md="9">
                    <Input bsSize="sm" type="text"  value={this.addKeyWord}
                           name="addKeyWord"
                           onChange={e => this.handleChange(e)}
                           placeholder="Type Keyword..." />
                  </Col>
                </FormGroup>

              </div>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={e => this.AddKeywordsSubmit(e)}>Add</Button>{' '}
            <Button color="secondary" onClick={() => this.closeModalPopup()}>Cancel</Button>
          </ModalFooter>
        </Modal>

        <Modal isOpen={this.state.showEditKeywordModal} >
          <ModalHeader >Edit Keyword</ModalHeader>
          <ModalBody>
            <form>
              <div className="form-group">
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">Keyword</Label>
                  </Col>
                  <Col xs="12" md="9">
                    <Input bsSize="sm" type="text"  value={this.state.editKeyWord}
                           name="editKeyWord"
                           onChange={e => this.handleChange(e)}
                           placeholder="Type Keyword..." />
                  </Col>
                </FormGroup>

              </div>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={e => this.editKeywordsSubmit(e)}>Save</Button>{' '}
            <Button color="secondary" onClick={() => this.closeModalPopup()}>Cancel</Button>
          </ModalFooter>
        </Modal>

        {this.state.alert}{(this.state.loading)?(<div className='sweet-loading'><ClipLoader sizeUnit={"px"} size={80} color={'#123abc'} loading={this.state.loading} /> </div>):null }
      </>
    );
  }
}

export default Keywords;
