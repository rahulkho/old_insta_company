import React, { Component } from 'react';
import { Button, Badge, Card, CardBody, CardHeader, Col, Pagination, PaginationItem, PaginationLink, Row, Table } from 'reactstrap';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {GlobalConfig} from "../../../Services/Helper/GlobalConfig";
import {RemoteCall} from "../../../Services/http/RemoteCall";
import SweetAlert from "react-bootstrap-sweetalert";
import {ClipLoader} from "react-spinners";

class EmailEditor extends Component {
  constructor(props) {
    super(props)
    console.log("props");
    console.log(this.props);

    this.state = {
      subject:'',
      emailText: '',
      toEmail: "",
      ccEmail:"",
      bccEmail:"",
      alert:null
    } // You can also pass a Quill Delta here
    if (true && (!this.props.location || !this.props.location.state)) {
      this.props.history.push("/dashboard");
      return false;
    }

    this.handleChange = this.handleChange.bind(this)
    this.handleEmailTextChange = this.handleEmailTextChange.bind(this)
  }
  hideAlert() {
    this.setState({
      alert: null
    });
  }
  componentDidMount(){
    if(this.props.location.state){
      this.setState({toEmail:this.props.location.state.email});
    }

  }

  handleChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }

  handleEmailTextChange(value) {
    this.setState({ emailText: value })
  }


   validateEmail(email) {
     email = email.split(",");
     let valid = true;
     email.map(ele=>{
       const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if(!re.test(String(email).toLowerCase())){
          valid = false;
        };
     })
     return valid;
  }
  sendEmail(e){
    e.preventDefault();
    let errorMsg = ""
    if(!this.state.subject.trim()){
      errorMsg = "Subject required !";
    }
    if(!errorMsg && !this.state.toEmail.trim() && !this.validateEmail(this.state.toEmail)){
      errorMsg = "Valid Email required !";
    }
    if(!errorMsg && !this.state.toEmail.trim()){
      errorMsg = "Email required !";
    }

    if(errorMsg){
      const getAlert = () => (<SweetAlert warning title={errorMsg} onConfirm={() => this.hideAlert()}></SweetAlert>);
      this.setState({
        alert: getAlert()
      });
    }else{
      RemoteCall.sendEmail()
        .sendMail({
          to: this.state.toEmail,
          subject: this.state.subject,
          body: this.state.emailText
        })
        .then(
          resp => {
            const getAlert = () => (<SweetAlert success title="Email sent !" onConfirm={() => this.hideAlert()}></SweetAlert>);
            this.setState({alert: getAlert(),subject:'',emailText: '',toEmail: "",ccEmail:"",bccEmail:""});
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
  }
  render() {
    return (
      <div className="animated fadeIn">
        <Row>
          <Col xs="12" lg="12">
            <Card>
              <CardHeader>
                <i className="fa fa-align-justify"></i> Email
              </CardHeader>
              <CardBody>
                <form className="">
                  <div className="mb-3 position-relative row form-group"><label htmlFor="to" className="col-2 col-sm-1 col-form-label">Subject:</label>
                    <div className="col-10 col-sm-11"><input id="subject" name="subject" placeholder="Type subject"  value={this.state.subject}   onChange={e => this.handleChange(e)} className="form-control"/></div>
                  </div>
                  <div className="mb-3 position-relative row form-group"><label htmlFor="to" className="col-2 col-sm-1 col-form-label">To:</label>
                    <div className="col-10 col-sm-11"><input id="to" name="toEmail" placeholder="Type email" autoComplete="email" value={this.state.toEmail}  type="email"  onChange={e => this.handleChange(e)} className="form-control"/></div>
                  </div>
                  {/*<div className="mb-3 position-relative row form-group"><label htmlFor="cc" className="col-2 col-sm-1 col-form-label">CC:</label>*/}
                    {/*<div className="col-10 col-sm-11"><input id="cc"  name="ccEmail" placeholder="Type email" autoComplete="email" type="email" defaultValue={this.state.ccEmail}  onChange={e => this.handleChange(e)}  className="form-control"/></div>*/}
                  {/*</div>*/}
                  {/*<div className="mb-3 position-relative row form-group"><label htmlFor="bcc" className="col-2 col-sm-1 col-form-label">BCC:</label>*/}
                    {/*<div className="col-10 col-sm-11"><input id="bcc"  name="bccEmail" placeholder="Type email" autoComplete="email"  type="email" defaultValue={this.state.bccEmail}  onChange={e => this.handleChange(e)} className="form-control"/></div>*/}
                  {/*</div>*/}
                </form>
                <div className="row">
                  <div className="ml-auto col-sm-11">
                  <ReactQuill value={this.state.emailText} onChange={this.handleEmailTextChange} />
                    <Button className="mt-2" color="primary" onClick={e => this.sendEmail(e)}>Send</Button>
                  </div>

                </div>

              </CardBody>
            </Card>
          </Col>


        </Row>

        {this.state.alert}{(this.state.loading)?(<div className='sweet-loading'><ClipLoader sizeUnit={"px"} size={80} color={'#123abc'} loading={this.state.loading} /> </div>):null }

      </div>

    );
  }
}

export default EmailEditor;
