import React, {Component} from "react";
import moment from 'moment';
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
import { ClipLoader ,ScaleLoader} from 'react-spinners';
import countryData from '../../../Services/Helper/ContryList';
import './Sounds.css';
import _ from "lodash";
import {SoundServices} from "./SoundsServices";
//import usersData from './UsersData'

class Sounds extends Component {


  state = {
    loading: true,
    soundList: [],
    showAddCategoryModal : false,
    newCatVal : "",
    newCatPriority : 1,
    newRuleVal : [],
    newImgVal : "",
    newVideoVal : "",
    showEditSoundModal : false,
    editSoundId : "",
    editSoundTitle : "",
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
    searchCountry:"",

    soundCategories:[],
    videoCategories:[],

    defaultSoundCategoryList:[],
    defaultVideoCategoriesList:[],

    soundLink : "",
    soundPlayerPopup:false,
    loadingThumb:false,
    searchSoundText:""
  };

  videoCategoryChange       = this.videoCategoryChange.bind(this);

  AddCategorytSubmit = event => {
    this.setState({loading:true});
    RemoteCall.SoundServices()
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
          this.getSoundList();
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

  editSound = (data) => {
    console.log("[edit category]",data)
    // console.log("[edit category]",_.find(data1.countries, { 'code': "in"}))

    let changedSoundCategoryList = this.state.defaultSoundCategoryList;
    changedSoundCategoryList.map(function(ct){
      if(_.find(data.soundCategories, { 'id': ct.id})){
        ct.checked = true;
      }else{
        ct.checked = false;
      }
    })

 let changedVideoCategoryList = this.state.defaultVideoCategoriesList;
    changedVideoCategoryList.map(function(ct){
      if(_.find(data.videoCategories, { 'id': ct.id})){
        ct.checked = true;
      }else{
        ct.checked = false;
      }
    })


    this.setState({
      showEditSoundModal: true,
      editSoundId:data.id,
      editSoundTitle:data.title,
      // editCatPriority:data.priority,
      // editRuleVal:data.rules,
      editImgVal:data.imageUrl || "",
      soundCategories:changedSoundCategoryList,
      videoCategories:changedVideoCategoryList
      // editVideoVal:data.videoUrl || ""
    });
    // console.log("editSoundVideoCategory",data.videoCategory ? data.videoCategory.id : '')
  }

  deleteSound = (data) => {
    this.setState({
      editSoundId:data.id,
      editSoundTitle:data.categoryName
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
        onConfirm={() => this.deleteSoundSubmit()}
        onCancel={() => this.hideAlert()}
      >
    You will not be able to recover this category!
  </SweetAlert>
    );
    this.setState({
      alert: getAlert()
    });

  }
  deleteSoundSubmit = event => {
    this.setState({
      alert: null
    });
    this.setState({loading:true});
    RemoteCall.SoundServices()
      .deleteSound({
        id: this.state.editSoundId
      })
      .then(
        resp => {
          this.closeModalPopup();
          this.getSoundList();
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
  EditSoundSubmit = event => {
    this.setState({loading:true});
    RemoteCall.SoundServices()
      .editSound(this.state.editSoundId,{
        title: this.state.editSoundTitle,
        categoryId : 5,
        // priority: this.state.editCatPriority,
        // rules: this.state.editRuleVal,
        imageUrl: this.state.editImgVal,
        // videoUrl: this.state.editVideoVal,
        videoCategoryIds:_.map(_.filter(this.state.videoCategories,function(o) { return o.checked; }),'id'),
        soundCategoryIds:_.map(_.filter(this.state.soundCategories,function(o) { return o.checked; }),'id'),
        // countries:_.map(_.filter(this.state.countryList,function(o) { return o.checked; }),'code')
      })
      .then(
        resp => {
          this.closeModalPopup();
          this.getSoundList();
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
    this.setState({ showAddCategoryModal: false, showEditSoundModal : false });
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
      showAddCategoryModal: true,
      countryList:countryData
    });
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
    this.getSoundList(pageNumber);
  }
  componentDidMount() {
    this.getSoundList();
    this.getCategoryList();
    this.timer = null;
  }
  getCategoryList = () => {
    this.setState({loading:true});
    RemoteCall.SoundServices()
      .getCategoryList()
      .then(
        result => {
          console.log(result);
          if (
            result.data &&
            result.data.settings &&
            result.data.settings.status
          ) {
            this.setState({
              soundCategories: result.data.data.soundCategories,
              videoCategories: result.data.data.videoCategories,
              defaultSoundCategoryList: result.data.data.soundCategories,
              defaultVideoCategoriesList: result.data.data.videoCategories,
              loading:false
            });
          }

        },
        err => {
          console.log(err);
        }
      );
  };
  getSoundList = (pageNumber) => {
    this.setState({loading:true});
    RemoteCall.SoundServices()
      .getSoundList(pageNumber,this.state.searchSoundText)
      .then(
        result => {
          console.log(result);
          if (
            result.data &&
            result.data.settings &&
            result.data.settings.status
          ) {
            this.setState({
              soundList: result.data.data.rows,
              activeCatPage: result.data.data.page,
              countCatPage: result.data.data.count,
              loading:false
            });
          }

        },
        err => {
          console.log(err);
        }
      );
  };


  fileEditChangedHandler = event => {
    this.setState({loading:true,loadingThumb:true});
    RemoteCall.SoundServices()
      .uploadImage({
        image: event.target.files[0]
      })
      .then(
        resp => {
          this.setState({editImgVal:resp.data.data.imageUrl,loading:false,loadingThumb:false});
        },
        err => {
        }
      );
  }
  fileAddChangedHandler = event => {
    this.setState({loading:true});
    RemoteCall.SoundServices()
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
  onCheckChange(data,item){
    let changedFilterList = this.state[item];
    changedFilterList.map(function(sc){
      if(sc.id == data.id){
        sc.checked = sc.checked?false:true
      }
      return sc;
    })
    this.setState({[item]:changedFilterList})
  }

  selectAll(item){
    let changedFilterList = this.state[item];
    changedFilterList.map(function(sc){
      sc.checked = true
      return sc;
    })
    this.setState({[item]:changedFilterList})
  }
  deselectAll(item){
    let changedFilterList = this.state[item];
    changedFilterList.map(function(sc){
      sc.checked = false
      return sc;
    })
    this.setState({[item]:changedFilterList})
  }

  videoCategoryChange(event){
    this.setState({editSoundVideoCategory:event.target.value}, () => {
    });
  }
  openSoundPopup(soundLink){
    this.setState({
      soundPlayerPopup : true,
      soundLink:soundLink
    })
  }
  soundPlayerPopupClose(){
    this.setState({
      soundPlayerPopup : false,
      soundLink:""
    })
  }
  preventFormSubmit(event) {
    event.preventDefault();
  }
  handleChangeSearch(event) {
    clearTimeout(this.timer);

    let parentThis = this;
    let valueText = event.target.value
    this.timer = setTimeout(function(){
      parentThis.setState({activeCatPage:1,searchSoundText: valueText},function(){
        parentThis.getSoundList()
      });

    }, 1000);


  }
  render() {
    //const userList = this.state.usersData.filter(user => user.id < 10);
    const {searchCountry, countryList ,soundCategories, defaultVideoCategoriesList, videoCategories} = this.state;
    const SoundsRow = (props) => {
      const sound = props.sound;
      return (
        <tr key={sound.id.toString()}>
          <td>{sound.title}</td>
          <td>{sound.duration}</td>
          <td>
            {/*{sound.imageUrl?<a style={{textDecoration:'underline',color:'#20a8d8',cursor:'pointer'}} onClick={() => this.openImagePopup(sound.imageUrl)}> View </a>:null}*/}
            <div className="mt-2 mb-2"><img src={sound.imageUrl  || "https://s3-us-west-1.amazonaws.com/insta-assets/placeholders/category_image.png"} style={{borderRadius:"0px"}} className="img-avatar" /></div>
          </td>
          <td className={"widthControlTd"}>
            {sound.soundCategories && sound.soundCategories.length && (_.map(sound.soundCategories,"categoryName")).toString()}
          </td>
          <td className={"widthControlTd"}>
            {sound.videoCategories && sound.videoCategories.length && (_.map(sound.videoCategories,"categoryName")).toString()}
          </td>
          <td>
            <a style={{textDecoration:'underline',color:'#20a8d8',cursor:'pointer'}} onClick={() => this.openSoundPopup(sound.streamUrl)}> Play </a>
          </td>
          <td>{moment(sound.createdAt).format("lll")}</td>
          <td>
            <Button color="primary" className="mr-2 btn-sm" onClick={() => this.editSound(sound)}>
              <i className="fa fa-edit"></i>
            </Button>
              <Button color="danger" className="btn-sm" onClick={() => this.deleteSound(sound)}>
                <i className="fa fa-remove"></i>
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
                  <i className="fa fa-align-justify" />Sounds{" "}
                  <small className="text-muted"></small>
                  {/*<button*/}
                  {/*  className="btn btn-primary btn-sm float-right mr-2"*/}
                  {/*  onClick={e => this.openAddCategoryPopup(e)}*/}
                  {/*>*/}
                  {/*  Add Category*/}
                  {/*</button>*/}

                </CardHeader>
                <CardBody>
                  <Form action="" method="post" className="form-horizontal float-right mr-2" onSubmit={e => this.preventFormSubmit(e)}>
                    <FormGroup row>
                      <Col md="12">
                        <InputGroup>
                          <InputGroupAddon addonType="prepend">
                            <InputGroupText>
                              <i className="fa fa-search"></i>
                            </InputGroupText>
                          </InputGroupAddon>
                          <Input type="text"  name="searchSoundText" onChange={e => this.handleChangeSearch(e)} placeholder="Search" />
                        </InputGroup>
                      </Col>
                    </FormGroup>
                  </Form>
                  <Table responsive hover>
                    <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Duration</th>
                      <th scope="col">Thumb</th>
                      <th scope="col">Sound Category</th>
                      <th scope="col">Video Category</th>
                      <th scope="col">Play</th>
                      <th scope="col">Uploaded</th>
                      <th scope="col">Edit</th>
                    </tr>
                    </thead>
                    <tbody>
                    {this.state.soundList.map((sound, index) => (
                      <SoundsRow key={"ctR"+index} sound={sound} />
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

        <Modal isOpen={this.state.showEditSoundModal} className={'modal-lg ' + this.props.className}>
          <ModalHeader >Edit Sound</ModalHeader>
          <ModalBody>
            <form>
              <div className="form-group">
                  <FormGroup row>
                    <Col md="3">
                    <Label size="sm" htmlFor="company">Title</Label></Col>
                    <Col xs="12" md="9">
                    <Input bsSize="sm" type="text"  value={this.state.editSoundTitle}
                           name="editSoundTitle"
                           onChange={e => this.handleChange(e)}
                           placeholder="Type Category..." />
                  </Col>
                </FormGroup>
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">Sound Categories</Label>
                  </Col>
                  <Col xs="12" md="9">
                    <Card>
                      <CardBody className="cardKeyword">
                        <div className="keyWordList">
                          <Button color="primary" size={"sm"} className={"mx-2"} onClick={() => this.selectAll("soundCategories")}>Select All</Button>
                          <Button color="success" size={"sm"} className={"mx-2"} onClick={() => this.deselectAll("soundCategories")}>Deselect All</Button>
                          {_.filter(soundCategories, function(o) { return (o.categoryName.toLowerCase().includes(searchCountry.toLowerCase())) }).map((category,index) => (
                            <FormGroup check   key={"fruleedit"+index}  className="checkbox">
                              <Input  checked={category.checked} onChange={() => this.onCheckChange(category,"soundCategories")} className="form-check-input" type="checkbox" id={"subcat"+category.categoryName}  value={category.categoryName} />
                              <Label className="form-check-label" htmlFor={"category"+category.categoryName}>{category.categoryName}</Label>
                            </FormGroup>
                          ))}
                        </div>
                      </CardBody>
                    </Card>

                  </Col>
                </FormGroup>
                <FormGroup row>
                  <Col md="3">
                    <Label size="sm" htmlFor="company">Video Category</Label></Col>
                  <Col xs="12" md="9">
                    <Card>
                      <CardBody className="cardKeyword">

                        <div className="keyWordList">
                          <Button color="primary" size={"sm"} className={"mx-2"} onClick={() => this.selectAll("videoCategories")}>Select All</Button>
                          <Button color="success" size={"sm"} className={"mx-2"} onClick={() => this.deselectAll("videoCategories")}>Deselect All</Button>
                          {_.filter(videoCategories, function(o) { return (o.categoryName.toLowerCase().includes(searchCountry.toLowerCase())) }).map((category,index) => (
                            <FormGroup check   key={"fruleedit"+index}  className="checkbox">
                              <Input  checked={category.checked} onChange={() => this.onCheckChange(category,"videoCategories")} className="form-check-input" type="checkbox" id={"subcat"+category.categoryName}  value={category.categoryName} />
                              <Label className="form-check-label" htmlFor={"category"+category.categoryName}>{category.categoryName}</Label>
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
                    {(this.state.loadingThumb)?(<ScaleLoader sizeUnit={"px"} size={50} color={'#123abc'} loading={this.state.loadingThumb} /> ):<div className="mt-2 mb-2 border w-25 p-3"><img src={this.state.editImgVal  || "https://s3-us-west-1.amazonaws.com/insta-assets/placeholders/category_image.png"} style={{borderRadius:"0px"}} className="img-avatar" /></div> }
                    <Input bsSize="sm" type="file" accept="image/x-png,image/png,image/jpg,image/jpeg" onChange={this.fileEditChangedHandler}/>
                  </Col>
                </FormGroup>
              </div>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={e => this.EditSoundSubmit(e)}>Save</Button>{' '}
            <Button color="secondary" onClick={() => this.closeModalPopup()}>Cancel</Button>
          </ModalFooter>
        </Modal>
        <Modal isOpen={this.state.soundPlayerPopup} className={'modal-lg'} >
          <ModalHeader toggle={() => this.soundPlayerPopupClose()} >Sound</ModalHeader>
          <ModalBody>
            <audio style={{width: '100%'}}  controls> <source src={this.state.soundLink || "https://s3-us-west-1.amazonaws.com/insta-assets/placeholders/category_image.png" } /></audio>
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

export default Sounds;
