import React, { Component } from 'react';
import {Badge, Card, CardBody, CardHeader, Col, Row, Button, Modal, ModalHeader, ModalBody} from 'reactstrap';
import './PostStyle.css';
import {RemoteCall} from "../../../Services/http/RemoteCall";
import countryData from "../../../Services/Helper/ContryList";
import moment from 'moment';
import Pagination from "react-js-pagination";
import { ClipLoader } from 'react-spinners';
import SweetAlert from "react-bootstrap-sweetalert";
class Posts extends Component {
  state = {
    alert:null,
    loading: true,
    postData: [],
    activePage: 1,
    lengthPage: 50,
    countPage: 10,
    orderBy: "createdTs,desc",
    filterByCountry:"",
    filterByDevice:"",
    filterByDate:"",
    filterByReportedPost:false,
    videoPlayerPopup:false,
    videoLink:""
  };
  handlePageChange = this.handlePageChange.bind(this);

  filterCountryChange       = this.filterCountryChange.bind(this);
  filterDeviceChange        = this.filterDeviceChange.bind(this);
  filterDateChange      = this.filterDateChange.bind(this);
  filterReportedPostChange  = this.filterReportedPostChange.bind(this);
  filterSortingChange       = this.filterSortingChange.bind(this);

  handlePageChange(pageNumber) {
    console.log(`active page is ${pageNumber}`);
    this.setState({activePage: pageNumber});
    this.getPostList(pageNumber);
  }
  hideAlert() {
    this.setState({
      alert: null
    });
  }
  componentDidMount() {
    this.getPostList();
  }

  getPostList = (pageNumber) => {
    this.setState({loading: true});
    let paramObj = {
      orderBy: this.state.orderBy,
      country: this.state.filterByCountry,
      deviceType: this.state.filterByDevice,
      createdTs: this.state.filterByDate,
      reportedPost: this.state.filterByReportedPost?true:null,
      page: pageNumber || 1
    };
    console.log(paramObj);
    RemoteCall.postServices()
      .GetPostList(paramObj)
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
              postData: result.data.data.rows,
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

  filterCountryChange(event){
    this.setState({filterByCountry:event.target.value}, () => {
      this.getPostList();
    });
  }
  filterDeviceChange(event){
    this.setState({filterByDevice:event.target.value}, () => {
      this.getPostList();
    });
  }
  filterDateChange(event){
    this.setState({filterByDate:event.target.value}, () => {
      this.getPostList();
    });
  }
  filterReportedPostChange(event){
    this.setState({filterByReportedPost:event.target.checked}, () => {
      this.getPostList();
    });
  }
  filterSortingChange(event) {
    this.setState({orderBy: event.target.value}, () => {
      this.getPostList();
    });
  }
  viewPostVideo = (data) =>{
    if(data.videoUrl){
      this.openVideoPopup(data.videoUrl);
    }
  }
  openVideoPopup(videoLink){
    console.log("videoLink "+videoLink);
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
  disablePost = (data) => {
    this.setState({
      alert: null
    });
    this.setState({loading:true});
    RemoteCall.postServices()
      .disablePost({
        postId: data.postId,
        isActive: !data.isActive
      })
      .then(
        resp => {
          this.getPostList(this.state.activePage);
          const getAlert = () => (<SweetAlert success title="Post updated successfully!" onConfirm={() => this.hideAlert()}></SweetAlert>);
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

  render() {
    const Feed   = (props) => {
      const post = props.post;
      return(
        <Col xs="12" sm="6" md="4">
          <Card>
            <CardHeader>
              <div className="avatar postAvtar mr-2">
                <img src={ post.postedBy.imageUrl || 'assets/img/avatars/5.jpg'} className="img-avatar" alt="admin@bootstrapmaster.com" />
              </div>
              <div className="postUserName"> {post.postedBy.userName} {post.isActive?<Button className="btn-sm float-right" outline color="primary" onClick={() => this.disablePost(post)}>Disable</Button>:<Button className="btn-sm float-right" outline color="success" onClick={() => this.disablePost(post)}>Enable</Button>}</div>

            </CardHeader>
            <CardBody className="p-0">
              <div className={post.videoUrl?"postImageDiv video-thumbnail":"postImageDiv"} onClick={() => this.viewPostVideo(post)} >
                <img className="postImage" src={post.imageUrl || "/assets/img/novideo.png"}/>

              </div>
              <div className="p-2 postLikeBlessDiv">
                <i className="fa fa-heart-o"></i> {post.likes}
                <i className="fa fa-hand-peace-o ml-2"></i> {post.blessings}
                {post.category && <Badge color="light" className="float-right">{post.category.categoryName}</Badge>}
              </div>
              <div className="p-2 postViewDiv">
                {post.views} Views
                {post.postReportedCount?
                  <span className="float-right">Reported : <Badge color="danger" >{post.postReportedCount}</Badge> </span> :
                  null
                }
              </div>
              <div className="p-2 postDescriptionDiv">
                {post.description}
              </div>
              <div className="p-2 postTimeStampDiv">
                <div className="small text-muted">{moment(post.createdTs).fromNow()}</div>
              </div>
            </CardBody>
          </Card>
        </Col>
      );
    }
    return (
      <>
        <div className="animated fadeIn">
          <Row>
            <Col sm="3">
              <div className="callout callout-info">
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
            <Col sm="3">
              <div className="callout callout-danger ">
                <small className="text-muted">Reported Posts</small>
                <br />
                <div className="custom-checkbox custom-control mt-2">
                  <input type="checkbox" id="filterByReportedPostInput"  defaultChecked={this.state.filterByReportedPost} onChange={this.filterReportedPostChange} className="custom-control-input"/><label className="custom-control-label" htmlFor="filterByReportedPostInput">Reported Posts</label>
                </div>
              </div>
            </Col>
            <Col sm="3">
              <div className="callout callout-info">
                <small className="text-muted">Device Type</small>
                <br />
                <select value={this.state.filterByDevice} className="browser-default custom-select primary" onChange={this.filterDeviceChange}>
                  <option value="">All</option>
                  <option value="android">Android</option>
                  <option value="ios">IOS</option>
                </select>
              </div>
            </Col>
            <Col sm="3">
              <div className="callout callout-info">
                <small className="text-muted">Posted</small>
                <br />
                <select value={this.state.filterByDate} className="browser-default custom-select primary" onChange={this.filterDateChange}>
                  <option value="">Any</option>
                  <option value={moment().subtract(7,'d').startOf('day').toISOString()}>Week</option>
                  <option value={moment().subtract(30,'d').startOf('day').toISOString()}>Month</option>
                  <option value={moment().subtract(365,'d').startOf('day').toISOString()}>Year</option>
                </select>
              </div>
            </Col>
          </Row>
          <Row>
            <Col xs="12" lg="12">
              <Card>
                <CardHeader>
                  <i className="fa fa-align-justify"></i> Posts
                  <div className="card-header-actions">
                    <small className="text-muted">Sort By : </small>
                    <select value={this.state.orderBy} style={{width:"auto"}} className="browser-default custom-select primary" onChange={this.filterSortingChange}>
                      <option value="createdTs,desc">New Posts</option>
                      <option value="createdTs,asc">Old Posts</option>
                      <option value="views,desc">Most Post Views</option>
                      <option value="postReportedCount,desc">Most Reported</option>
                    </select>
                  </div>
                </CardHeader>
                <CardBody>
                  <Row>
                    {this.state.postData.map((post, index) => (
                      <Feed  key={"fc"+index} post={post}/>
                    ))}
                  </Row>
                  <Pagination
                    activePage={this.state.activePage}
                    itemsCountPerPage={this.state.lengthPage}
                    totalItemsCount={this.state.countPage}
                    onChange={this.handlePageChange}
                    itemClass="page-item"
                    linkClass="page-link"
                  />
                </CardBody>
              </Card>
            </Col>


          </Row>


        </div>
        <Modal isOpen={this.state.videoPlayerPopup} className={'modal-lg'} >
          <ModalHeader toggle={() => this.videoPlayerPopupClose()} >Video</ModalHeader>
          <ModalBody>
            <video style={{width: '100%',maxHeight:'calc(100vh - 150px)'}}  controls> <source src={this.state.videoLink || "https://s3-us-west-1.amazonaws.com/insta-assets/placeholders/category_image.png" } /></video>
          </ModalBody>
        </Modal>
        <Modal isOpen={this.state.imagePlayerPopup} className={'modal-lg'} >
          <ModalHeader toggle={() => this.imagePlayerPopupClose()} >Image</ModalHeader>
          <ModalBody>
            <img style={{maxWidth: '100%',margin:'0 auto',display:'inherit'}}  src={this.state.imageLink || "https://s3-us-west-1.amazonaws.com/insta-assets/placeholders/category_image.png" } />
          </ModalBody>
        </Modal>
    {this.state.alert}{(this.state.loading) ? (
      <div className='sweet-loading'><ClipLoader sizeUnit={"px"} size={80} color={'#123abc'}
                                                 loading={this.state.loading}/></div>) : null}
     </>
    );
  }
}

export default Posts;
