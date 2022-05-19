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
  InputGroupAddon, InputGroupText, InputGroup, Form
} from "reactstrap";
import {RemoteCall} from "../../../Services/http/RemoteCall";
import SweetAlert from "react-bootstrap-sweetalert";
import Pagination from "react-js-pagination";
import { ClipLoader } from 'react-spinners';
import countryData from '../../../Services/Helper/ContryList';
import './Category.css';
import _ from "lodash";
import {SoundCategoryServices} from "./CategoryServices";
//import usersData from './UsersData'

class Category extends Component {


  state = {
    loading: true,
    categoryData: [],
    showAddCategoryModal : false,
    newCatVal : "",
    newCatPriority : 1,
    newRuleVal : [],
    newImgVal : "",
    newVideoVal : "",
    showEditCategoryModal : false,
    editCatId : "",
    editCatVal : "",
    editCatPriority : 1,
    editRuleVal : [],
    editImgVal : "",
    editVideoVal : "",
    activeCatPage: 1,
    lengthCatPage: 50,
    countCatPage: 1,
    selectedFile: null,
    videoPlayerPopup:false,
    videoLink : "",
    imagelayerPopup:false,
    imageLink : "",
    keywordList:[],
    subcategoryList:[],
    filterKeywordList:[],
    filterSubcategoryList:[],
    searchKeyword:"",
    selectedKeywords:[],
    selectedSubcategory:[],

    countryList:[],
    searchCountry:""
  };

  AddCategorytSubmit = event => {
    this.setState({loading:true});
    RemoteCall.SoundCategoryServices()
      .addCategory({
        categoryName: this.state.newCatVal,
        // priority: this.state.newCatPriority,
        // rules: this.state.newRuleVal,
        imageUrl : this.state.newImgVal,
        // videoUrl : this.state.newVideoVal,
        // keywords:_.map(_.filter(this.state.keywordList,function(o) { return o.checked; }),'id'),
        countries:_.map(_.filter(this.state.countryList,function(o) { return o.checked; }),'code')
      })
      .then(
        resp => {
          console.log(resp.data);
          this.closeModalPopup();
          this.getCategoryList();
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

  editCategory = (data1) => {
    console.log("[edit category]",data1)
    // console.log("[edit category]",_.find(data1.countries, { 'code': "in"}))
     let data = Object.assign(data1);
    if(!data.rules){
      data.rules= [];
    }
    this.setState({
      searchCountry:"",
      showEditCategoryModal: true,
      editCatId:data.id,
      editCatVal:data.categoryName,
      // editCatPriority:data.priority,
      // editRuleVal:data.rules,
      editImgVal:data.imageUrl || "",
      // editVideoVal:data.videoUrl || ""
    });
    let changedCoutnryList = countryData;
    changedCoutnryList.map(function(ct){
      if(data1.countries.indexOf(ct.code)>=0){
        ct.checked = true;
      }else{
        ct.checked = false;
      }
    })
    // let changedFilterListsubcategories = this.state.subcategoryList;
    // changedFilterListsubcategories.map(function(sc){
    //   if(_.find(data.subcategories, { 'id': sc.id})){
    //     sc.checked = true;
    //   }else{
    //     sc.checked = false;
    //   }
    // })
    this.setState({countryList:changedCoutnryList})
  }

  deleteCategory = (data) => {
    this.setState({
      editCatId:data.id,
      editCatVal:data.categoryName
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
        onConfirm={() => this.deleteCategorytSubmit()}
        onCancel={() => this.hideAlert()}
      >
    You will not be able to recover this category!
  </SweetAlert>
    );
    this.setState({
      alert: getAlert()
    });

  }
  deleteCategorytSubmit = event => {
    this.setState({
      alert: null
    });
    this.setState({loading:true});
    RemoteCall.SoundCategoryServices()
      .deleteCategory({
        id: this.state.editCatId
      })
      .then(
        resp => {
          this.closeModalPopup();
          this.getCategoryList();
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
  EditCategorytSubmit = event => {
    this.setState({loading:true});
    RemoteCall.SoundCategoryServices()
      .editCategory({
        id: this.state.editCatId,
        categoryName: this.state.editCatVal,
        // priority: this.state.editCatPriority,
        // rules: this.state.editRuleVal,
        imageUrl: this.state.editImgVal,
        // videoUrl: this.state.editVideoVal,
        // keywords:_.map(_.filter(this.state.keywordList,function(o) { return o.checked; }),'id'),
        countries:_.map(_.filter(this.state.countryList,function(o) { return o.checked; }),'code')
      })
      .then(
        resp => {
          this.closeModalPopup();
          this.getCategoryList();
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
    this.setState({ showAddCategoryModal: false, showEditCategoryModal : false });
  };
  openAddCategoryPopup = event => {
    event.preventDefault();
    event.stopPropagation();
    this.setState({
      newCatVal: "",
      newCatPriority: 1,
      newRuleVal:[],
      newImgVal:"",
      newVideoVal:"" ,
      searchCountry:"",
      showAddCategoryModal: true,
      countryList:countryData
    });
    let changedCoutnryList = countryData;
    changedCoutnryList.map(function(ct){ ct.checked = false; })
    let changedFilterList = this.state.keywordList;
    changedFilterList.map(function(kw){kw.checked = false})
    let changedFilterListSubcategory = this.state.subcategoryList;
    changedFilterListSubcategory.map(function(sc){sc.checked = false})
    this.setState({subcategoryList:changedFilterListSubcategory,countryList:changedCoutnryList})
  };
  handleChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }
  searchFilterChange(event) {
    let searchString = event.target.value;
    console.log("[searchString]",searchString)
    let keywordList = this.state.keywordList;
    this.setState({[event.target.name]: event.target.value, filterKeywordList: _.filter(keywordList, function(o) { return (o.keyword.toLowerCase().includes(searchString.toLowerCase())) }) || []});
  }
  searchFilterCountry(event) {
    // console.log("[searchString]",searchString)
    this.setState({[event.target.name]: event.target.value});
  }
  hideAlert() {
    this.setState({
      alert: null
    });
  }
  handlePageChange = this.handlePageChange.bind(this);
  handlePageChange(pageNumber) {
    console.log(`active page is ${pageNumber}`);
    this.setState({activeCatPage: pageNumber});
    this.getCategoryList(pageNumber);
  }
  componentDidMount() {
    this.getCategoryList();
  }
  getCategoryList = (pageNumber) => {
    this.setState({loading:true});
    RemoteCall.SoundCategoryServices()
      .getCategoryList(pageNumber)
      .then(
        result => {
          console.log(result);
          if (
            result.data &&
            result.data.settings &&
            result.data.settings.status
          ) {
            this.setState({categoryData: result.data.data.rows,
              activeCatPage: result.data.data.page,
              countCatPage: result.data.data.count,
              loading:false
            });
          }
          this.getKeywordsList();
          this.getSubcategoryList();
        },
        err => {
          console.log(err);
        }
      );
  };
    getKeywordsList = () => {
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
              this.setState({
                keywordList: result.data.data.rows,
                filterKeywordList: result.data.data.rows,
              });
            }
          },
          err => {
            console.log(err);
          }
        );
    };
    getSubcategoryList = () => {
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
              this.setState({
                subcategoryList: result.data.data.rows,
                filterSubcategoryList: result.data.data.rows,
              });
            }
          },
          err => {
            console.log(err);
          }
        );
    };
  fileEditChangedHandler = event => {
    this.setState({loading:true});
    RemoteCall.SoundCategoryServices()
      .uploadImage({
        image: event.target.files[0]
      })
      .then(
        resp => {
          this.setState({editImgVal:resp.data.data.imageUrl,loading:false});
        },
        err => {
        }
      );
  }
  fileAddChangedHandler = event => {
    this.setState({loading:true});
    RemoteCall.SoundCategoryServices()
      .uploadImage({
        image: event.target.files[0]
      })
      .then(
        resp => {
          this.setState({newImgVal:resp.data.data.imageUrl,loading:false});
        },
        err => {
        }
      );
  }
  fileVideoAddChangedHandler = event => {
    this.setState({loading:true});
    RemoteCall.uploadCategoryVideoEndPoint()
      .uploadVideo({
        file: event.target.files[0]
      })
      .then(
        resp => {
          this.setState({newVideoVal:resp.data.data.videoUrl,loading:false});
        },
        err => {
        }
      );
  }
  fileVideoEditChangedHandler = event => {
    this.setState({loading:true});
    RemoteCall.uploadCategoryVideoEndPoint()
      .uploadVideo({
        file: event.target.files[0]
      })
      .then(
        resp => {
          this.setState({editVideoVal:resp.data.data.videoUrl,loading:false});
        },
        err => {
        }
      );
  }
  removeAddRuleBadge(badge){
    var index = this.state.newRuleVal.indexOf(badge);
    if (index > -1) {
      this.state.newRuleVal.splice(index, 1);
    }
    this.setState({newRuleVal:this.state.newRuleVal});
  }
  removeEditRuleBadge(badge){
    var index = this.state.editRuleVal.indexOf(badge);
    if (index > -1) {
      this.state.editRuleVal.splice(index, 1);
    }
    this.setState({editRuleVal:this.state.editRuleVal});
  }
  handleAddRuleChange(event){
      if(event.key == 'Enter'){
        event.preventDefault();{
          event.target.value = event.target.value.trim();
          if(event.target.value){
            let index = this.state.newRuleVal.indexOf(event.target.value);
            if (index == -1) {
              this.state.newRuleVal.push(event.target.value);
            }
            this.setState({newRuleVal:this.state.newRuleVal});
            event.target.value = "";
          }

      }
    }
  }
  handleEditRuleChange(event){
    if(event.key == 'Enter'){
      event.preventDefault();
        let ruleVal = event.target.value.trim();
        let index = this.state.editRuleVal.indexOf(ruleVal);
        if(ruleVal) {
          if (index == -1) {
            this.state.editRuleVal.push(ruleVal);
          }
          this.setState({editRuleVal: this.state.editRuleVal});
          event.target.value = "";
        }

    }
  }
  openVideoPopup(videoLink){
    this.setState({
      videoPlayerPopup : true,
      videoLink:videoLink
    })
  }
  videoPlayerPopupClose(){
    this.setState({
      videoPlayerPopup : false,
      videoLink:""
    })
  }
  openImagePopup(imageLink){
    this.setState({
      imagePlayerPopup : true,
      imageLink:imageLink
    })
  }
  imagePlayerPopupClose(){
    this.setState({
      imagePlayerPopup : false,
      imageLink:""
    })
  }
  onCheckKeyword(data){
    let changedFilterList = this.state.keywordList;
    changedFilterList.map(function(kw){
      if(kw.id == data.id){
        kw.checked = kw.checked?false:true
      }
      return kw;
    })
    this.setState({keywordList:changedFilterList})
  }
  onCheckCountry(data){
    let changedFilterList = this.state.countryList;
   changedFilterList.map(function(ct){
      if(ct.code == data.code){
        ct.checked = ct.checked?false:true
      }
    })
    this.setState({countryList:changedFilterList})
  }
  selectAllCountry(data){
    let changedFilterList = this.state.countryList;
   changedFilterList.map(function(ct){
        ct.checked = true
    })
    this.setState({countryList:changedFilterList})
  }
  deselectAllCountry(data){
    let changedFilterList = this.state.countryList;
   changedFilterList.map(function(ct){
        ct.checked = false
    })
    this.setState({countryList:changedFilterList})
  }
  render() {
    //const userList = this.state.usersData.filter(user => user.id < 10);
    const {searchCountry, countryList} = this.state;
    const CategoryRow = (props) => {
      const category = props.category;
      return (
        <tr key={category.id.toString()}>
          <td>{category.categoryName}</td>
          <td>
            {category.isDeleted ? <Badge color="danger">Deleted</Badge> :
              <Badge color="success">Enabled</Badge>
            }
          </td>
          <td>
            {category.imageUrl?<a style={{textDecoration:'underline',color:'#20a8d8',cursor:'pointer'}} onClick={() => this.openImagePopup(category.imageUrl)}> View </a>:null}
          </td>
          <td className={"widthControlTd"}>
            {category.countries.map( ele => {
              return (<i key={"ct"+ele} className={`flag-icon flag-icon-${ele.toLowerCase()} h4 mr-1`} title={`${ele.toLowerCase()}`}></i>)
            })}
          </td>
          <td>
            <Button color="primary" className="mr-2 btn-sm" onClick={() => this.editCategory(category)}>
              <i className="fa fa-edit"></i>
            </Button>
            {category.isDeleted ? null :
              <Button color="danger" className="btn-sm" onClick={() => this.deleteCategory(category)}>
                <i className="fa fa-remove"></i>
              </Button>
            }
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
                  <i className="fa fa-align-justify" />Sound Category{" "}
                  <small className="text-muted"></small>
                  <button
                    className="btn btn-primary btn-sm float-right mr-2"
                    onClick={e => this.openAddCategoryPopup(e)}
                  >
                    Add Category
                  </button>
                </CardHeader>
                <CardBody>
                  <Table responsive hover>
                    <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Status</th>
                      <th scope="col">Image</th>
                      <th scope="col">Country</th>
                      <th scope="col">Edit</th>
                    </tr>
                    </thead>
                    <tbody>
                    {this.state.categoryData.map((category, index) => (
                      <CategoryRow key={"ctR"+index} category={category} />
                    ))}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </Col>
          </Row>
          <Pagination
            activePage={this.state.activeCatPage}
            itemsCountPerPage={this.state.lengthCatPage}
            totalItemsCount={this.state.countCatPage}
            onChange={this.handlePageChange}
            itemClass="page-item"
            linkClass="page-link"
          />
        </div>
        <Modal isOpen={this.state.showAddCategoryModal} className={'modal-lg ' + this.props.className} >
          <ModalHeader >Add New Category</ModalHeader>
          <ModalBody>
            <form>
              <div className="form-group">
                  <FormGroup row>
                    <Col md="3">
                      <Label size="sm" htmlFor="company">Category Name</Label>
                    </Col>
                    <Col xs="12" md="9">
                      <Input bsSize="sm" type="text"  value={this.newCatVal}
                             name="newCatVal"
                             onChange={e => this.handleChange(e)}
                             placeholder="Type Category..." />
                  </Col>
                  </FormGroup>
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">Countries</Label>
                  </Col>
                  <Col xs="12" md="9">
                    <Card>
                      <CardBody className="cardKeyword">
                        <FormGroup row>
                          <InputGroupAddon addonType="prepend">
                            <InputGroupText>
                              <i className="fa fa-search"></i>
                            </InputGroupText>
                            <Input type="text"  name="searchCountry" onChange={e => this.searchFilterCountry(e)} placeholder="Search" />
                            <Button color="primary" size={"sm"} className={"mx-2"} onClick={e => this.selectAllCountry(e)}>Select All</Button>
                            <Button color="success" size={"sm"} className={"mx-2"} onClick={e => this.deselectAllCountry(e)}>Deselect All</Button>
                          </InputGroupAddon>
                        </FormGroup>
                        <div className="keyWordList">
                          {_.filter(countryList, function(o) { return (o.name.toLowerCase().includes(searchCountry.toLowerCase())) }).map((country,index) => (
                            <FormGroup check   key={"fruleedit"+index}  className="checkbox">
                              <Input  checked={country.checked} onChange={() => this.onCheckCountry(country)} className="form-check-input" type="checkbox" id={"subcat"+country.code}  value={country.code} />
                              <i className={`flag-icon flag-icon-${country.code.toLowerCase()} h4 mr-2`} title={`${country.name}`}></i>
                              <Label className="form-check-label" htmlFor={"subcat"+country.code}>{country.name}</Label>
                            </FormGroup>
                          ))}
                        </div>
                      </CardBody>
                    </Card>

                  </Col>
                </FormGroup>
              <FormGroup row>
                <Col md="3">
                  <Label size="sm" htmlFor="company">Image</Label></Col>
                <Col xs="12" md="9">
                  <div className="mt-2 mb-2 border w-25 p-3"><img src={this.state.newImgVal  || "https://s3-us-west-1.amazonaws.com/insta-assets/placeholders/category_image.png"} style={{borderRadius:"0px"}} className="img-avatar" /></div>
                  <Input bsSize="sm" type="file" accept="image/x-png,image/png,image/jpg,image/jpeg" onChange={this.fileAddChangedHandler}/>
                </Col></FormGroup>

              </div>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={e => this.AddCategorytSubmit(e)}>Add</Button>{' '}
            <Button color="secondary" onClick={() => this.closeModalPopup()}>Cancel</Button>
          </ModalFooter>
        </Modal>
        <Modal isOpen={this.state.showEditCategoryModal} className={'modal-lg ' + this.props.className}>
          <ModalHeader >Edit Category</ModalHeader>
          <ModalBody>
            <form>
              <div className="form-group">
                  <FormGroup row>
                    <Col md="3">
                    <Label size="sm" htmlFor="company">Category Name</Label></Col>
                    <Col xs="12" md="9">
                    <Input bsSize="sm" type="text"  value={this.state.editCatVal}
                           name="editCatVal"
                           onChange={e => this.handleChange(e)}
                           placeholder="Type Category..." />
                  </Col></FormGroup>
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">Countries</Label>
                  </Col>
                  <Col xs="12" md="9">
                    <Card>
                      <CardBody className="cardKeyword">
                        <FormGroup row>
                          <InputGroupAddon addonType="prepend">
                            <InputGroupText>
                              <i className="fa fa-search"></i>
                            </InputGroupText>
                            <Input type="text"  name="searchCountry" onChange={e => this.searchFilterCountry(e)} placeholder="Search" />
                            <Button color="primary" size={"sm"} className={"mx-2"} onClick={e => this.selectAllCountry(e)}>Select All</Button>
                            <Button color="success" size={"sm"} className={"mx-2"} onClick={e => this.deselectAllCountry(e)}>Deselect All</Button>
                          </InputGroupAddon>
                        </FormGroup>
                        <div className="keyWordList">
                          {_.filter(countryList, function(o) { return (o.name.toLowerCase().includes(searchCountry.toLowerCase())) }).map((country,index) => (
                            <FormGroup check   key={"fruleedit"+index}  className="checkbox">
                              <Input  checked={country.checked} onChange={() => this.onCheckCountry(country)} className="form-check-input" type="checkbox" id={"subcat"+country.code}  value={country.code} />
                              <i className={`flag-icon flag-icon-${country.code.toLowerCase()} h4 mr-2`} title={`${country.name}`}></i>
                              <Label className="form-check-label" htmlFor={"subcat"+country.code}>{country.name}</Label>
                            </FormGroup>
                          ))}
                        </div>
                      </CardBody>
                    </Card>

                  </Col>
                </FormGroup>
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">Image</Label></Col>
                  <Col xs="12" md="9">
                    <div className="mt-2 mb-2 border w-25 p-3"><img src={this.state.editImgVal  || "https://s3-us-west-1.amazonaws.com/insta-assets/placeholders/category_image.png"} style={{borderRadius:"0px"}} className="img-avatar" /></div>
                    <Input bsSize="sm" type="file" accept="image/x-png,image/png,image/jpg,image/jpeg" onChange={this.fileEditChangedHandler}/>
                  </Col></FormGroup>
              </div>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={e => this.EditCategorytSubmit(e)}>Save</Button>{' '}
            <Button color="secondary" onClick={() => this.closeModalPopup()}>Cancel</Button>
          </ModalFooter>
        </Modal>
        <Modal isOpen={this.state.videoPlayerPopup} className={'modal-lg'} >
          <ModalHeader toggle={() => this.videoPlayerPopupClose()} >Video</ModalHeader>
          <ModalBody>
            <video style={{width: '100%'}}  controls> <source src={this.state.videoLink || "https://s3-us-west-1.amazonaws.com/insta-assets/placeholders/category_image.png" } /></video>
          </ModalBody>
        </Modal>
        <Modal isOpen={this.state.imagePlayerPopup} className={'modal-lg'} >
          <ModalHeader toggle={() => this.imagePlayerPopupClose()} >Image</ModalHeader>
          <ModalBody>
            <img style={{maxWidth: '100%',margin:'0 auto',display:'inherit'}}  src={this.state.imageLink || "https://s3-us-west-1.amazonaws.com/insta-assets/placeholders/category_image.png" } />
          </ModalBody>
        </Modal>
        {this.state.alert}{(this.state.loading)?(<div className='sweet-loading'><ClipLoader sizeUnit={"px"} size={80} color={'#123abc'} loading={this.state.loading} /> </div>):null }
      </>
    );
  }
}

export default Category;
