import React, {Component} from "react";
import {Link} from "react-router-dom";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  Col,
  Row,
  Table,
  Button,
  ButtonDropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  InputGroupText, Input, InputGroupAddon, Form, FormGroup, InputGroup, ModalHeader, ModalBody, Label, ModalFooter, Modal
} from "reactstrap";
import {RemoteCall} from "../../../Services/http/RemoteCall";
import Pagination from "react-js-pagination";
import { ClipLoader } from 'react-spinners';
import SweetAlert from "react-bootstrap-sweetalert";
import countryData from '../../../Services/Helper/ContryList';
import Moment from 'react-moment';
import moment from 'moment';
import _ from 'lodash';
import {AppSwitch} from "@coreui/react";


class Users extends Component {
  state = {
    alert:null,
    loading: true,
    usersData: [],
    activePage: 1,
    lengthPage: 50,
    countPage: 10,
    orderBy: "joinedTs,desc",
    filterByCountry:"",
    filterByDevice:"",
    filterByJoinDate:"",
    filterByReportedUser:false,
    filterByActiveUser:true,
    filterByDeletedUser:false,
    filterByUserType:"active",
    filterBySponsored:true,
    searchCountry:"",
    searchUserText:"",
    selectedUser:null,
    editUserModal:false,
    countryList:[],
  };
  filterCountryChange       = this.filterCountryChange.bind(this);
  filterDeviceChange        = this.filterDeviceChange.bind(this);
  filterJoinDateChange      = this.filterJoinDateChange.bind(this);
  filterUserTypeChange      = this.filterUserTypeChange.bind(this);
  filterSortingChange       = this.filterSortingChange.bind(this);
  filterUserSponsoredChange = this.filterUserSponsoredChange.bind(this);

  componentDidMount() {
   this.getUserList();
    this.timer = null;
  }
  hideAlert() {
    this.setState({
      alert: null
    });
  }

  toggleFilerDd(i) {
    const newArray = this.state.dropdownOpen.map((element, index) => { return (index === i ? !element : false); });
    this.setState({
      dropdownOpen: newArray,
    });

  }
  preventFormSubmit(event) {
    event.preventDefault();
  }
  handleChangeSearch(event) {
   clearTimeout(this.timer);

    let parentThis = this;
    let valueText = event.target.value
    this.timer = setTimeout(function(){
      parentThis.setState({searchUserText: valueText},function(){
        parentThis.getUserList();
      });

    }, 1000);


  }
  getUserList = (pageNumber) => {
    this.setState({loading: true});
    let paramObj = {
      country:this.state.filterByCountry.toLowerCase(),
      deviceType:this.state.filterByDevice.toLowerCase(),
      joinedTs :this.state.filterByJoinDate,
      userType :this.state.filterByUserType,
      sponsored :this.state.filterBySponsored,
      orderBy :this.state.orderBy,
      text :this.state.searchUserText,
      page: pageNumber || 1
    };
    console.log(paramObj);
    // if(!this.state.filterBySponsored){
    //   delete paramObj.sponsored;
    // }
    RemoteCall.usersServices()
      .getUserList(paramObj)
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
              usersData: result.data.data.results,
              activePage: result.data.data.page,
              countPage: result.data.data.count,
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
    this.getUserList(pageNumber);
  }

  userActiveDeactive(user) {
    console.log(user);
    const getAlert = () => (
      <SweetAlert
        warning
        showCancel
        confirmBtnText="Yes"
        confirmBtnBsStyle="danger"
        cancelBtnBsStyle="default"
        title="Are you sure?"
        onConfirm={() => this.activeDeactiveUserSubmit(user)}
        onCancel={() => this.hideAlert()}
      >
        Are you sure want to {user.isActive ? ` deactivate` : ` activate`}  this user ?
      </SweetAlert>
    );
    this.setState({
      alert: getAlert()
    })
  }


  activeDeactiveUserSubmit(user) {
    console.log("activeDeactiveUserSubmit" );
    console.log(user);
    this.setState({
      alert: null
    });
    this.setState({loading:true});
    RemoteCall.usersServices()
      .setUserStatus({
        userId: user.userId,
        isActive: !user.isActive
      })
      .then(
        resp => {

          const getAlert = () => (<SweetAlert success title="Updated successfully!" onConfirm={() => this.hideAlert()}></SweetAlert>);
          this.getUserList();
          this.setState({
            alert: getAlert()
          });

        },
        err => {
          ;
        }
      );
  }

  userSetSponsored(user,status,type) {
    console.log("userSetSponsored" );
    console.log(user);
    this.setState({
      alert: null
    });
    let  data = {};
    if(type == "soundSponsored"){
      data = {
        userId: user.userId,
        soundSponsored: status
      }
    }else{
      data = {
        userId: user.userId,
        sponsored: status,
      }
    }

    this.setState({loading:true});
    RemoteCall.usersServices()
      .setUserSponsored(data)
      .then(
        resp => {

          const getAlert = () => (<SweetAlert success title="Updated successfully!" onConfirm={() => this.hideAlert()}></SweetAlert>);
          this.getUserList();
          this.setState({
            alert: getAlert()
          });

        },
        err => {
          ;
        }
      );
  }

  filterCountryChange(event){
    this.setState({filterByCountry:event.target.value}, () => {
      this.getUserList();
    });
  }
  filterUserSponsoredChange(event){
    this.setState({filterBySponsored:event.target.value}, () => {
      this.getUserList();
    });
  }
  filterDeviceChange(event){
    this.setState({filterByDevice:event.target.value}, () => {
      this.getUserList();
    });
  }
  filterJoinDateChange(event){
    this.setState({filterByJoinDate:event.target.value}, () => {
      this.getUserList();
    });
  }
  filterUserTypeChange(event){
    this.setState({filterByUserType:event.target.value}, () => {
      this.getUserList();
    });
  }
  filterSortingChange(event){
    this.setState({orderBy:event.target.value}, () => {
      this.getUserList();
    });
  }
  editUser(user){
    this.setState({
      selectedUser:user,
      searchCountry:"",
      editUserModal:true
    })
    let changedCoutnryList = countryData;
    changedCoutnryList.map(function(ct){
      if(user.countries.indexOf(ct.code)>=0){
        ct.checked = true;
      }else{
        ct.checked = false;
      }
    })

    this.setState({countryList:changedCoutnryList})

  }
  searchFilterCountry(event) {
    this.setState({[event.target.name]: event.target.value});
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
  closeModalPopup = event => {
    this.setState({ editUserModal: false});
  };
  EditUserSubmit = event => {
    this.setState({loading:true});
    RemoteCall.usersServices()
      .setUserCountries({
        userId: this.state.selectedUser.userId,
        countries:_.map(_.filter(this.state.countryList,function(o) { return o.checked; }),'code')
      })
      .then(
        resp => {
          this.closeModalPopup();
          this.getUserList(this.state.activePage)
        },
        err => {

        }
      );
  };
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
    const {countryList , searchCountry} = this.state;
    const UserRow = (props) => {
      const user = props.user;
      const userLink = `/users/${user.userId}`;
      const ActiveBtn = ``;
      const DeactiveBtn = ``;
      let contryFlag = _.find(countryData, ['name', user.country]);
      if(contryFlag){
        contryFlag = contryFlag.code;
      }else{
        contryFlag =  user.country
      }
      return (

        <tr key={user.userId.toString()}>
          <td className="text-center">
            <div className="avatar">
              <img src={user.imageUrl || 'assets/img/avatars/5.jpg'}  onError={(e)=>{e.target.onerror = null; e.target.src='assets/img/avatars/5.jpg'}} className="img-avatar" alt="admin@bootstrapmaster.com" />
            </div>
          </td>
          <td>

              <div>{user.fullName || "--"}</div>
              <div className="small text-muted">
                Registered: {moment(user.joinedTs).format('MMM DD, YYYY')}
              </div>
          </td>
          <td>
            <div>{user.userName}</div>
            <div className="small text-muted">
              Followers: {user.followersCount} Followings: {user.followingsCount}
            </div>
          </td>
          <td><i className={`mr-1 fa fa-${user.deviceType == 'android'?'android successColor':'apple'}`} style={{ fontSize: 24 + 'px' }}></i> <i className={`flag-icon flag-icon-${contryFlag} h4 mb-0`} title={user.country} ></i></td>
          <td><Badge className="mr-1" color={user.reportedCount?"danger":"light"}>{user.reportedCount?user.reportedCount:"No"}</Badge></td>
          <td>{user.postViewCount}</td>
          <td className={"text-center"}>
            <AppSwitch dataOn={"Yes"} dataOff={"No"} className={'float-right mb-0'} onChange={() => this.userSetSponsored(user,!user.sponsored,"sponsored")} label color={'info'} defaultChecked={user.sponsored} size={'sm'}/>
          </td>
          {/*<td>*/}
          {/*  {user.sponsored ?*/}
          {/*    <Button className="btn-sm" onClick={() => this.userSetSponsored(user,false,"sponsored")} outline color="success">Yes</Button> :*/}
          {/*    <Button className="btn-sm" onClick={() => this.userSetSponsored(user,true,"sponsored")} outline color="primary">No</Button>}*/}
          {/*</td>*/}
          <td className={"text-center"}>
            <AppSwitch dataOn={"Yes"} dataOff={"No"} className={'float-right mb-0'} onChange={() => this.userSetSponsored(user,!user.soundSponsored,"soundSponsored")} label color={'info'} defaultChecked={user.soundSponsored} size={'sm'}/>
            {/*{user.soundSponsored ?*/}
            {/*  <Button className="btn-sm" onClick={() => this.userSetSponsored(user,false,"soundSponsored")} outline color="success">Yes</Button> :*/}
            {/*  <Button className="btn-sm" onClick={() => this.userSetSponsored(user,true,"soundSponsored")} outline color="primary">No</Button>}*/}
          </td>
          <td>
            <AppSwitch dataOn={"Yes"} dataOff={"No"} className={'mb-0'} onChange={() => this.userActiveDeactive(user)} label color={'success'} defaultChecked={user.isActive} size={'sm'}/>
          </td>
          <td>
            {user.email? <><Link className="mr-1" to={{ pathname: '/email', state: { email: user.email }}}  > <i className="fa fa-envelope-open-o fa-lg"></i></Link></>: null}
            {user.sponsored? <><a style={{color:"#20a8d8",cursor:"pointer"}}  onClick={()=>this.editUser(user)}><i className="fa fa-edit fa-lg ml-2"></i></a></>: null}
            {/*{user.isActive ?*/}
            {/*<Button size="sm" className="btn-sm" onClick={() => this.userActiveDeactive(user)} outline color="danger">Deactivate</Button> :*/}
            {/*<Button size="sm" className="btn-sm" onClick={() => this.userActiveDeactive(user)} outline color="success">Activate</Button>}*/}
            </td>

        </tr>
      );
    }

      return (
        <>
          <div className="animated fadeIn">
            <Row>

            </Row>
            <Row>
              <Col sm="2" className={"pr-1"}>
                <div className="callout callout-info pl-1 pr-1">
                  <small className="text-muted">Country</small>
                  <br />
                  <select value={this.state.filterByCountry} className="browser-default custom-select primary capitalization" onChange={this.filterCountryChange}>
                    <option value="">All</option>
                    {countryData.map((country, index) => (
                      <option  key={"fc"+index} value={country.name}>{country.name}</option>
                    ))}
                  </select>
                </div>
              </Col>
              <Col sm="2" className={"pr-1"}>
                <div className="callout callout-info pl-1 pr-1">
                  <small className="text-muted">Sponsored</small>
                  <br />
                  <select value={this.state.filterBySponsored} className="browser-default custom-select primary" onChange={this.filterUserSponsoredChange}>
                    <option value={false}>Normal User</option>
                    <option value={true}>Sponsored</option>
                  </select>
                </div>
              </Col>
              <Col sm="2" className={"pr-1"}>
                <div className="callout callout-danger pl-1 pr-1">
                  <small className="text-muted">Users</small>
                  <br />
                  {/*<div className="custom-checkbox custom-control mt-2">*/}
                    {/*<input type="checkbox" id="filterByReportedUserInput"  defaultChecked={this.state.filterByReportedUser} onChange={this.filterReportedUserChange} className="custom-control-input"/><label className="custom-control-label" htmlFor="filterByReportedUserInput">Reported Users</label>*/}
                  {/*</div>*/}
                  <select value={this.state.filterByUserType} className="browser-default custom-select primary" onChange={this.filterUserTypeChange}>
                    <option value="reported">Reported users</option>
                    <option value="all">All Users</option>
                    <option value="deleted">Deleted Users</option>
                    <option value="active">Active users</option>
                    <option value="disabled">Disabled user</option>
                  </select>
                </div>
              </Col>
              <Col sm="2" className={"pr-1"}>
                <div className="callout callout-info pl-1 pr-1">
                  <small className="text-muted">Device Type</small>
                  <br />
                  <select value={this.state.filterByDevice} className="browser-default custom-select primary" onChange={this.filterDeviceChange}>
                    <option value="">All</option>
                    <option value="android">Android</option>
                    <option value="ios">IOS</option>
                  </select>
                </div>
              </Col>
              <Col sm="2" className={"pr-1"}>
                <div className="callout callout-info pl-1 pr-1">
                  <small className="text-muted">Registered</small>
                  <br />
                  <select value={this.state.filterByJoinDate} className="browser-default custom-select primary" onChange={this.filterJoinDateChange}>
                    <option value="">Any</option>
                    <option value={moment().subtract(7,'d').startOf('day').toISOString()}>Week</option>
                    <option value={moment().subtract(30,'d').startOf('day').toISOString()}>Month</option>
                    <option value={moment().subtract(365,'d').startOf('day').toISOString()}>Year</option>
                  </select>
                </div>
              </Col>
              <Col sm="2" className={"pr-1"}>
                <div className="callout callout-danger pl-1 pr-1">
                  <small className="text-muted">Search</small>
                  <br />
                  <Form action="" method="post" className="form-horizontal" onSubmit={e => this.preventFormSubmit(e)}>
                    <FormGroup row>
                      <Col md="12">
                        <InputGroup>
                          <InputGroupAddon addonType="prepend">
                            <InputGroupText>
                              <i className="fa fa-search"></i>
                            </InputGroupText>
                          </InputGroupAddon>
                          <Input type="text"  name="searchUserText" onChange={e => this.handleChangeSearch(e)} placeholder="Search" />
                        </InputGroup>
                      </Col>
                    </FormGroup>
                  </Form>
                </div>
              </Col>
            </Row>
            <Row>
              <Col xl={12}>
                <Card>
                  <CardHeader>
                    <i className="fa fa-align-justify"/> Users{" "}
                    <small className="text-muted"></small>
                    <div className="card-header-actions">
                      <small className="text-muted">Sort By : </small>
                      <select value={this.state.orderBy} style={{width:"auto"}} className="browser-default custom-select primary" onChange={this.filterSortingChange}>
                        <option value="joinedTs,desc">New Users</option>
                        <option value="joinedTs,asc">Old Users</option>
                        <option value="postViewCount,desc">Most Post Views</option>
                        <option value="reportedCount,desc">Most Reported</option>
                      </select>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <Table responsive hover className={"text-center"}>
                      <thead>
                      <tr>
                        <th scope="col" style={{textAlign:'center'}}><i className="icon-people"></i></th>
                        <th scope="col">Name</th>
                        <th scope="col">User Name</th>
                        <th scope="col" title={"Device/Location"}>Device/Loc*</th>
                        <th scope="col">Reported</th>
                        <th scope="col">Post View</th>
                        <th scope="col" className={"text-center"} title={"Sponsored"}>Spon*</th>
                        <th scope="col" className={"text-center"} title={"Sound Sponsored"}>S-Spon*</th>
                        <th scope="col" className={"text-center"} title={"Sound Sponsored"}>Active</th>
                        <th scope="col">Action</th>
                      </tr>
                      </thead>
                        <tbody>
                        {this.state.usersData.map((user, index) => (
                          <UserRow key={index} user={user}/>
                        ))}
                        </tbody>
                    </Table>
                  </CardBody>
                </Card>
              </Col>
            </Row>
            <Pagination
              activePage={this.state.activePage}
              itemsCountPerPage={this.state.lengthPage}
              totalItemsCount={this.state.countPage}
              onChange={this.handlePageChange}
              itemClass="page-item"
              linkClass="page-link"

            />
          </div>
          <Modal isOpen={this.state.editUserModal} className={'modal-lg ' + this.props.className}>
            <ModalHeader >Edit</ModalHeader>
            <ModalBody>
              <form>
                <div className="form-group">
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
                </div>
              </form>
            </ModalBody>
            <ModalFooter>
              <Button color="primary" onClick={e => this.EditUserSubmit(e)}>Save</Button>{' '}
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

export default Users;
