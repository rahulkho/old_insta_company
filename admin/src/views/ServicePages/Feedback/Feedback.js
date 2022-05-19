import React, {Component} from "react";
import {Link} from "react-router-dom";
import {Badge, Card, CardBody, CardHeader, Col, Row, Table, Button, Modal, ModalBody, ModalFooter, ModalHeader, FormGroup,  Label, Input} from "reactstrap";
import {RemoteCall} from "../../../Services/http/RemoteCall";
import SweetAlert from "react-bootstrap-sweetalert";
import Pagination from "react-js-pagination";
import { ClipLoader } from 'react-spinners';
import Moment from 'react-moment';
import moment from "moment/moment";
import countryData from "../../../Services/Helper/ContryList";
//import usersData from './UsersData'

class Feedback extends Component {
  state = {
    loading: true,
    feedbackData: [],
    activePage: 1,
    lengthPage: 50,
    countPage: 1,
    orderBy: "ts,desc",
    filterByDate : "",
    filterByIsRead : false,
    filterByBug : false

  };
  handlePageChange = this.handlePageChange.bind(this);
  filterDateChange      = this.filterDateChange.bind(this);
  filterIsReadChange    = this.filterIsReadChange.bind(this);
  filterBugChange       = this.filterBugChange.bind(this);

  handlePageChange(pageNumber) {
    this.setState({activePage: pageNumber});
    this.getFeedbackList(pageNumber);
  }
  handleChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }
  hideAlert() {
    this.setState({
      alert: null
    });
  }
  componentDidMount() {
    this.getFeedbackList();
  }
  getFeedbackList = (pageNumber) => {
    this.setState({loading:true});
    let paramObj = {
      ts :this.state.filterByDate,
      isRead :this.state.filterByIsRead?false:"",
      isBug :this.state.filterByBug?true:"",
      orderBy :this.state.orderBy,
      page: pageNumber || 1
    };
    RemoteCall.feedbackServices()
      .getFeedbackList(paramObj)
      .then(
        result => {
          console.log(result);
          if (
            result.data &&
            result.data.settings &&
            result.data.settings.status
          ) {
            this.setState({feedbackData: result.data.data.rows,
              activePage: result.data.data.page,
              countPage: result.data.data.count,
              loading:false
            });
          }
        },
        err => {
          console.log(err);
        }
      );
  };

  markAsReadSubmit = (data) => {
    this.setState({
      alert: null
    });
    this.setState({loading:true});
    RemoteCall.feedbackServices()
      .markAsReadSubmit({
        id: data.id,
        isRead: true
      })
      .then(
        resp => {
          this.getFeedbackList(this.state.activePage);
          const getAlert = () => (<SweetAlert success title="Marked as read successfully!" onConfirm={() => this.hideAlert()}></SweetAlert>);
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

  filterDateChange(event){
    this.setState({filterByDate:event.target.value}, () => {
      this.getFeedbackList();
    });
  }
  filterIsReadChange(event){
    console.log(event.target.checked);
    this.setState({filterByIsRead:event.target.checked}, () => {
      this.getFeedbackList();
    });
  }
  filterBugChange(event){
    this.setState({filterByBug:event.target.checked}, () => {
      this.getFeedbackList();
    });
  }

  render() {
    //const userList = this.state.usersData.filter(user => user.id < 10);
    const FeedbackRows = (props) => {
      const feedback = props.feedback;
      return (
        <tr key={"fb"+feedback.id.toString()} className={feedback.isRead?null:"font-weight-bold"}>
          <td>
            {feedback.isRead ? null :
              <Button className="btn-sm" outline color="success" onClick={() => this.markAsReadSubmit(feedback)}>Read</Button>
            }
          </td>
          <td>{feedback.description}</td>
          <td>{feedback.userId}</td>
          <td><Badge className="mr-1" color={feedback.isBug?"danger":"success"}>{feedback.isBug?"Yes":"No"}</Badge></td>
          <td>{feedback.email || ""}</td>
          <td><Moment format="DD-MMM-YYYY HH:MM a">
            {feedback.ts}
          </Moment></td>
          <td>{feedback.email? <Link className="mr-1" to={{ pathname: '/email', state: { email: feedback.email }}}  ><Button className="btn-sm" outline color="primary">Email</Button></Link> : null}</td>
        </tr>
      );
    }
    return (
      <>
        <div className="animated fadeIn">
          <Row>
            <Col sm="3">
              <div className="callout callout-info ">
                <small className="text-muted">Unread</small>
                <br />
                <div className="custom-checkbox custom-control mt-2">
                  <input type="checkbox" id="filterByIsReadUserInput"  defaultChecked={this.state.filterByIsRead} onChange={this.filterIsReadChange} className="custom-control-input"/><label className="custom-control-label" htmlFor="filterByIsReadUserInput">Unread Feedback</label>
                </div>
              </div>
            </Col>
            <Col sm="3">
              <div className="callout callout-danger ">
                <small className="text-muted">Bug</small>
                <br />
                <div className="custom-checkbox custom-control mt-2">
                  <input type="checkbox" id="filterByBugUserInput"  defaultChecked={this.state.filterByBug} onChange={this.filterBugChange} className="custom-control-input"/><label className="custom-control-label" htmlFor="filterByBugUserInput">Bugs</label>
                </div>
              </div>
            </Col>

            <Col sm="3">
              <div className="callout callout-info">
                <small className="text-muted">Duration</small>
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
            <Col xl={12}>
              <Card>
                <CardHeader>
                  <i className="fa fa-align-justify" /> Feedbacks{" "}
                  <small className="text-muted"></small>
                </CardHeader>
                <CardBody>
                  <Table responsive hover>
                    <thead>
                    <tr>
                      <th scope="col">Read</th>
                      <th scope="col">Feedback</th>
                      <th scope="col">User Id</th>
                      <th scope="col">Bug</th>
                      <th scope="col">Email</th>
                      <th scope="col">Date Time</th>
                      <th scope="col">Reply</th>
                    </tr>
                    </thead>
                    <tbody>
                    {this.state.feedbackData.map((feedback, index) => (
                        <FeedbackRows key={index} feedback={feedback} />
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
        {this.state.alert}{(this.state.loading)?(<div className='sweet-loading'><ClipLoader sizeUnit={"px"} size={80} color={'#123abc'} loading={this.state.loading} /> </div>):null }
      </>
    );
  }
}

export default Feedback;
