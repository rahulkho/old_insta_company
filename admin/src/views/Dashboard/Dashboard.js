import React, { Component} from 'react';
import {
  Card,
  CardBody,
  Col,
  Row,
} from 'reactstrap';
import {RemoteCall} from "../../Services/http/RemoteCall";
import countryData from '../../Services/Helper/ContryList';
import moment from 'moment';
class Dashboard extends Component {
  constructor(props) {
    super(props);

    this.toggle = this.toggle.bind(this);
    this.onRadioBtnClick = this.onRadioBtnClick.bind(this);


  }
  state = {
    userCount:0,
    activeUserCount:0,
    postCount:0,
    filterByCountry:"",
    filterByDevice:"",
    filterByJoinDate:"",
    filterByReportedUser:false
  };
  filterCountryChange = this.filterCountryChange.bind(this);
  filterDeviceChange = this.filterDeviceChange.bind(this);
  filterJoinDateChange = this.filterJoinDateChange.bind(this);
  filterReportedUserChange = this.filterReportedUserChange.bind(this);
  componentDidMount(){
    this.getDashboardCount();
  }
  filterCountryChange(event){
    this.setState({filterByCountry:event.target.value}, () => {
      this.getDashboardCount();
    });
  }

  filterDeviceChange(event){
    this.setState({filterByDevice:event.target.value}, () => {
      this.getDashboardCount();
    });
  }
  filterJoinDateChange(event){
    this.setState({filterByJoinDate:event.target.value}, () => {
      this.getDashboardCount();
    });
  }
  filterReportedUserChange(event){
    this.setState({filterByReportedUser:event.target.checked}, () => {
      this.getDashboardCount();
    });
  }
  getDashboardCount(){
    this.setState({loading: true});
    let paramObj = {
      country:this.state.filterByCountry.toLowerCase(),
      deviceType:this.state.filterByDevice.toLowerCase(),
      joinedTs :this.state.filterByJoinDate,
      isReported :this.state.filterByReportedUser
    };
    console.log(paramObj);
    RemoteCall.getDashboardCount()
      .getDashboardCount(paramObj)
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
              userCount: result.data.data.users.count,
              postCount: result.data.data.posts.count,
              activeUserCount: result.data.data.activeUserCount ? result.data.data.activeUserCount.count : 0
            });
          }
        },
        err => {
          console.log(err);
        }
      );
  }
  toggle() {
    this.setState({
      dropdownOpen: !this.state.dropdownOpen,
    });
  }

  onRadioBtnClick(radioSelected) {
    this.setState({
      radioSelected: radioSelected,
    });
  }

  loading = () => <div className="animated fadeIn pt-1 text-center">Loading...</div>

  render() {

    return (
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
                  <div className="callout callout-danger">
                    <small className="text-muted">Reported Users</small>
                    <br />
                    <div style={{lineHeight:"35px"}} className="custom-checkbox custom-control mt-2">
                      <input type="checkbox" id="filterByReportedUserInput"  defaultChecked={this.state.filterByReportedUser} onChange={this.filterReportedUserChange} className="custom-control-input"/><label style={{lineHeight:"21px"}} className="custom-control-label" htmlFor="filterByReportedUserInput">Reported Users</label>
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



        </Row>
        <Row>
          <Col xs="12" sm="4" lg="4">
            <Card className="text-white bg-info">
              <CardBody className="pb-0">
                <div className="h1 text-muted text-right mb-2"><i className="icon-people"></i></div>
                <div className="text-value">{this.state.userCount}</div>
                <div>Total Users</div>

              </CardBody>

            </Card>
          </Col>
          <Col xs="12" sm="4" lg="4">
            <Card className="text-white bg-success">
              <CardBody className="pb-0">
                <div className="h1 text-muted text-right mb-2"><i className="icon-people"></i></div>
                <div className="text-value">{this.state.activeUserCount}</div>
                <div>Active Users</div>

              </CardBody>

            </Card>
          </Col>

          <Col xs="12" sm="4" lg="4">
            <Card className="text-white bg-primary">
              <CardBody className="pb-0">
                <div className="h1 text-muted text-right mb-2"><i className="icon-speech"></i></div>
                <div className="text-value">{this.state.postCount}</div>
                <div>Total Posts</div>
              </CardBody>
            </Card>
          </Col>


        </Row>

      </div>
    );
  }
}

export default Dashboard;
