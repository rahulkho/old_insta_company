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
import './Category.css';
import _ from "lodash";
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
    selectedSubcategory:[]
  };

  AddCategorytSubmit = event => {
    this.setState({loading:true});
    RemoteCall.categoryServices()
      .addCategory({
        categoryName: this.state.newCatVal,
        priority: this.state.newCatPriority,
        rules: this.state.newRuleVal,
        imageUrl : this.state.newImgVal,
        videoUrl : this.state.newVideoVal,
        keywords:_.map(_.filter(this.state.keywordList,function(o) { return o.checked; }),'id'),
        subcategories:_.map(_.filter(this.state.subcategoryList,function(o) { return o.checked; }),'id')
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
     let data = Object.assign(data1);
    if(!data.rules){
      data.rules= [];
    }
    this.setState({
      showEditCategoryModal: true,
      editCatId:data.categoryId,
      editCatVal:data.categoryName,
      editCatPriority:data.priority,
      editRuleVal:data.rules,
      editImgVal:data.imageUrl || "",
      editVideoVal:data.videoUrl || ""
    });
    let changedFilterList = this.state.keywordList;
    changedFilterList.map(function(kw){
      if(_.find(data.keywords, { 'id': kw.id})){
        kw.checked = true;
      }else{
        kw.checked = false;
      }
    })
    let changedFilterListsubcategories = this.state.subcategoryList;
    changedFilterListsubcategories.map(function(sc){
      if(_.find(data.subcategories, { 'id': sc.id})){
        sc.checked = true;
      }else{
        sc.checked = false;
      }
    })
    this.setState({keywordList:changedFilterList,subcategoryList:changedFilterListsubcategories})
  }

  deleteCategory = (data) => {
    this.setState({
      editCatId:data.categoryId,
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
    RemoteCall.categoryServices()
      .deleteCategory({
        categoryId: this.state.editCatId
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
    RemoteCall.categoryServices()
      .editCategory({
        categoryId: this.state.editCatId,
        categoryName: this.state.editCatVal,
        priority: this.state.editCatPriority,
        rules: this.state.editRuleVal,
        imageUrl: this.state.editImgVal,
        videoUrl: this.state.editVideoVal,
        keywords:_.map(_.filter(this.state.keywordList,function(o) { return o.checked; }),'id'),
        subcategories:_.map(_.filter(this.state.subcategoryList,function(o) { return o.checked; }),'id')
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
    this.setState({ newCatVal: "",newCatPriority: 1, newRuleVal:[], newImgVal:"",newVideoVal:"" ,showAddCategoryModal: true });
    let changedFilterList = this.state.keywordList;
    changedFilterList.map(function(kw){kw.checked = false})
    let changedFilterListSubcategory = this.state.subcategoryList;
    changedFilterListSubcategory.map(function(sc){sc.checked = false})
    this.setState({subcategoryList:changedFilterListSubcategory})
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
  searchFilterChangeSubcategory(event) {
    let searchString = event.target.value;
    console.log("[searchString]",searchString)
    let subcategoryList = this.state.subcategoryList;
    this.setState({[event.target.name]: event.target.value, filterSubcategoryList: _.filter(subcategoryList, function(o) { return (o.subcategory.toLowerCase().includes(searchString.toLowerCase())) }) || []});
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
    RemoteCall.categoryServices()
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
    RemoteCall.categoryServices()
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
    RemoteCall.categoryServices()
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
    RemoteCall.categoryServices()
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
    RemoteCall.categoryServices()
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
  onCheckSubcategory(data){
    let changedFilterList = this.state.subcategoryList;
    changedFilterList.map(function(sc){
      if(sc.id == data.id){
        sc.checked = sc.checked?false:true
      }
      return sc;
    })
    this.setState({subcategoryList:changedFilterList})
  }
  render() {
    //const userList = this.state.usersData.filter(user => user.id < 10);
    const CategoryRow = (props) => {
      const category = props.category;
      return (
        <tr key={category.categoryId.toString()}>
          <td>{category.categoryName}</td>
          <td>{category.priority}</td>
          <td style={{maxWidth:"300px"}}>
            {category.rules && category.rules.map((rules, index) => (
              <Badge key={"Badge"+index} className="innerBadgeSpan mr-1" title={rules} color="primary">{rules}</Badge>
            ))}
          </td>
          <td>
            <div className="small text-muted">
            {category.totalPosts}
            </div>
          </td>
          <td>
            {category.isDeleted ? <Badge color="danger">Disabled</Badge> :
              <Badge color="success">Enabled</Badge>
            }
          </td>
          <td>
            <a style={{textDecoration:'underline',color:'#20a8d8',cursor:'pointer'}} onClick={() => this.openVideoPopup(category.videoUrl)}> Play </a>
          </td>
          <td>
            <a style={{textDecoration:'underline',color:'#20a8d8',cursor:'pointer'}} onClick={() => this.openImagePopup(category.imageUrl)}> View </a>
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
                  <i className="fa fa-align-justify" /> Category{" "}
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
                      <th scope="col">Priority</th>
                      <th scope="col" style={{maxWidth:"300px"}}>Rules</th>
                      <th scope="col">Uses</th>
                      <th scope="col">Status</th>
                      <th scope="col">Video</th>
                      <th scope="col">Image</th>
                      <th scope="col">Edit</th>
                    </tr>
                    </thead>
                    <tbody>
                    {this.state.categoryData.map((category, index) => (
                      <CategoryRow key={index} category={category} />
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
                    <Label size="sm" htmlFor="company">Priority</Label></Col>
                    <Col xs="12" md="9">
                    <Input bsSize="sm" type="number"  value={this.state.newCatPriority}
                           name="newCatPriority"
                           min="1"
                           onChange={e => this.handleChange(e)}
                           placeholder="Enter Priority" />
                  </Col></FormGroup>
                  <FormGroup row>
                    <Col md="3">
                      <Label size="sm" htmlFor="company">Rules</Label>
                    </Col>
                    <Col xs="12" md="9">

                      <Input bsSize="sm" type="text"
                             onKeyPress={e => this.handleAddRuleChange(e)}
                             placeholder="Type Rules..." />
                        {this.state.newRuleVal.map((rule, index) => (
                          <Badge key={"arule"+index} className="mr-1 mt-1 mb-2" color="primary"><span className="innerBadgeSpan" title={rule}>{rule}</span>  | <i className="fa fa-remove pointer" onClick={() => this.removeAddRuleBadge(rule)}></i></Badge>
                        ))}
                    </Col>
                  </FormGroup>
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">Subcategory</Label>
                  </Col>
                  <Col xs="12" md="9">
                    <Card>
                      <CardBody className="cardKeyword">
                        <FormGroup row>
                          <InputGroupAddon addonType="prepend">
                            <InputGroupText>
                              <i className="fa fa-search"></i>
                            </InputGroupText>
                            <Input type="text"  name="searchSubcategory" onChange={e => this.searchFilterChangeSubcategory(e)} placeholder="Search" />
                          </InputGroupAddon>
                        </FormGroup>
                        <div className="keyWordList">
                          {this.state.filterSubcategoryList.map((subcat,index) => (
                            <FormGroup check   key={"ferule"+index}  className="checkbox">
                              <Input  checked={subcat.checked} onChange={() => this.onCheckSubcategory(subcat)} className="form-check-input" type="checkbox" id={"subcatedit"+subcat.id}  value={subcat.id} />
                              <Label className="form-check-label" htmlFor={"subcatedit"+subcat.id}>{subcat.subcategory}</Label>
                            </FormGroup>
                          ))}
                        </div>
                      </CardBody>
                    </Card>

                  </Col>
                </FormGroup>
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">Keywords</Label>
                  </Col>
                  <Col xs="12" md="9">
                    <Card>
                      <CardBody className="cardKeyword">
                          <FormGroup row>
                            <InputGroupAddon addonType="prepend">
                              <InputGroupText>
                                <i className="fa fa-search"></i>
                              </InputGroupText>
                              <Input type="text"  name="searchKeyword" onChange={e => this.searchFilterChange(e)} placeholder="Search" />
                            </InputGroupAddon>
                          </FormGroup>
                          <div className="keyWordList">
                              {this.state.filterKeywordList.map((keyword,index) => (
                                <FormGroup check   key={"ferule"+index}  className="checkbox">
                                <Input  checked={keyword.checked} onChange={() => this.onCheckKeyword(keyword)} className="form-check-input" type="checkbox" id={"keywordedit"+keyword.id}  value={keyword.id} />
                                  <Label className="form-check-label" htmlFor={"keywordedit"+keyword.id}>{keyword.keyword}</Label>
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
                    <div className="mt-2 mb-2 border w-25 p-3"><img src={this.state.newImgVal || "https://s3-us-west-1.amazonaws.com/insta-assets/placeholders/category_image.png" } className="img-avatar" /></div>
                    <Input bsSize="sm" type="file" accept="image/x-png,image/png,image/jpg,image/jpeg" onChange={this.fileAddChangedHandler}/>
                  </Col></FormGroup>
                  <FormGroup row>
                    <Col md="3">
                    <Label size="sm" htmlFor="company">Video</Label></Col>
                    <Col xs="12" md="9">
                    <div className="mt-2 mb-2 border w-25 p-3"><img src={this.state.newVideoVal || "https://s3-us-west-1.amazonaws.com/insta-assets/placeholders/category_image.png" } className="img-avatar" /></div>
                    <Input bsSize="sm" type="file" accept="video/mp4,video/x-m4v,video/*" onChange={this.fileVideoAddChangedHandler}/>
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
                  <Label size="sm" htmlFor="company">Priority</Label></Col>
                  <Col xs="12" md="9">
                  <Input bsSize="sm" type="number"  value={this.state.editCatPriority}
                         name="editCatPriority"
                         min="1"
                         onChange={e => this.handleChange(e)}
                         placeholder="Enter Priority" />
                </Col></FormGroup>
                  <FormGroup row>
                    <Col md="3">
                    <Label size="sm" htmlFor="company">Rules</Label></Col>
                    <Col xs="12" md="9">

                    <Input bsSize="sm" type="text"
                           onKeyPress={e => this.handleEditRuleChange(e)}
                           placeholder="Type Rules..." />
                      {this.state.editRuleVal.map((rule, index) => (
                        <Badge key={"erule"+index} className="mr-1 mt-1 mb-2 " color="primary"><span className="innerBadgeSpan" title={rule}>{rule}</span> | <i className="fa fa-remove pointer" onClick={() => this.removeEditRuleBadge(rule)}></i></Badge>
                      ))}
                  </Col></FormGroup>
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">Subcategory</Label>
                  </Col>
                  <Col xs="12" md="9">
                    <Card>
                      <CardBody className="cardKeyword">
                        <FormGroup row>
                          <InputGroupAddon addonType="prepend">
                            <InputGroupText>
                              <i className="fa fa-search"></i>
                            </InputGroupText>
                            <Input type="text"  name="searchSubcategory" onChange={e => this.searchFilterChangeSubcategory(e)} placeholder="Search" />
                          </InputGroupAddon>
                        </FormGroup>
                        <div className="keyWordList">
                          {this.state.filterSubcategoryList.map((subcat,index) => (
                            <FormGroup check   key={"fruleedit"+index}  className="checkbox">
                              <Input  checked={subcat.checked} onChange={() => this.onCheckSubcategory(subcat)} className="form-check-input" type="checkbox" id={"subcat"+subcat.id} name="checkbox1" value={subcat.id} />
                              <Label className="form-check-label" htmlFor={"subcat"+subcat.id}>{subcat.subcategory}</Label>
                            </FormGroup>
                          ))}
                        </div>
                      </CardBody>
                    </Card>

                  </Col>
                </FormGroup>
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">Keywords</Label>
                  </Col>
                  <Col xs="12" md="9">
                    <Card>
                      <CardBody className="cardKeyword">
                        <FormGroup row>
                          <InputGroupAddon addonType="prepend">
                            <InputGroupText>
                              <i className="fa fa-search"></i>
                            </InputGroupText>
                            <Input type="text"  name="searchKeyword" onChange={e => this.searchFilterChange(e)} placeholder="Search" />
                          </InputGroupAddon>
                        </FormGroup>
                        <div className="keyWordList">
                        {this.state.filterKeywordList.map((keyword,index) => (
                          <FormGroup check   key={"fruleedit"+index}  className="checkbox">
                            <Input  checked={keyword.checked} onChange={() => this.onCheckKeyword(keyword)} className="form-check-input" type="checkbox" id={"keyword"+keyword.id} name="checkbox1" value={keyword.id} />
                            <Label className="form-check-label" htmlFor={"keyword"+keyword.id}>{keyword.keyword}</Label>
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
                    <div className="mt-2 mb-2 border w-25 p-3"><img src={this.state.editImgVal  || "https://s3-us-west-1.amazonaws.com/insta-assets/placeholders/category_image.png"} className="img-avatar" /></div>
                    <Input bsSize="sm" type="file" accept="image/x-png,image/png,image/jpg,image/jpeg" onChange={this.fileEditChangedHandler}/>
                  </Col></FormGroup>

                  <FormGroup row>
                    <Col md="3">
                    <Label size="sm" htmlFor="company">Video</Label></Col>
                      <Col xs="12" md="9">
                    <div className="mt-2 mb-2 border w-25 p-3"><video className="img-avatar"  controls> <source src={this.state.editVideoVal || "https://s3-us-west-1.amazonaws.com/insta-assets/placeholders/category_image.png" } /></video></div>
                    <Input bsSize="sm" type="file" accept="video/mp4,video/x-m4v,video/*" onChange={this.fileVideoEditChangedHandler}/>
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
