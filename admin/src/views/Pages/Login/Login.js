import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardGroup, Col, Container, Form, Input, InputGroup, InputGroupAddon, InputGroupText, Row } from 'reactstrap';
import { GlobalConfig } from "../../../Services/Helper/GlobalConfig";
import { RemoteCall } from "../../../Services/http/RemoteCall";
import SweetAlert from "react-bootstrap-sweetalert";
class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: "",
      password: "",
      alert: null
    };
     GlobalConfig.Token = "";
  }
  loginFail(message) {
    const getAlert = () => (
      <SweetAlert danger title="Error" onConfirm={() => this.hideAlert()}>{message}</SweetAlert>
      );
    this.setState({
      alert: getAlert()
    });
  }
  validateForm() {
    return this.state.email.length > 0 && this.state.password.length > 0;
  }

  handleChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }
  hideAlert() {
    this.setState({
      alert: null
    });
  }

  loginSubmit = e =>{
    e.preventDefault();
    let values = {"email":this.state.email,
                  "password":this.state.password}
    RemoteCall.Authenticate()
          .Login(values)
          .then(result => {
            if (result.data.settings &&  result.data.settings.status) {
              GlobalConfig.Token = result.data.data.token;
              GlobalConfig.UserId = result.data.data.userId;
              this.props.history.push("/dashboard");
            } else {
              if(result.data && result.data.settings && result.data.settings.message){
                this.loginFail(result.data.settings.message);
              }else{
                this.loginFail("Network Error");
              }
            }
          })
          .catch(err => {
            console.log(err);
            if(err.response && err.response.data && err.response.data.message){
              this.loginFail(err.response.data.message);
            }else{
              this.loginFail("Network Error");
            }
          });


  }
  render() {
    return (
      <div className="app flex-row align-items-center">
        <Container>
          <Row className="justify-content-center">
            <Col md="8">
              <CardGroup>
                <Card className="p-4">
                  <CardBody>
                    <Form onSubmit={e => this.loginSubmit(e)}>
                      <h1>Login</h1>
                      <p className="text-muted">Sign In to your account</p>
                      <InputGroup className="mb-3">
                        <InputGroupAddon addonType="prepend">
                          <InputGroupText>
                            <i className="icon-user"></i>
                          </InputGroupText>
                        </InputGroupAddon>
                        <Input type="text" placeholder="Email" autoComplete="Email" value={this.state.email}  name="email" onChange={ e => this.handleChange(e)}  />
                      </InputGroup>
                      <InputGroup className="mb-4">
                        <InputGroupAddon addonType="prepend">
                          <InputGroupText>
                            <i className="icon-lock"></i>
                          </InputGroupText>
                        </InputGroupAddon>
                        <Input value={this.state.password} type="password" placeholder="Password" onChange={ e => this.handleChange(e)} name="password" placeholder="Password" autoComplete="current-password" />
                      </InputGroup>
                      <Row>
                        <Col xs="6">
                          <Button color="primary" type="submit"  className="px-4">Login</Button>
                        </Col>
                        {/* <Col xs="6" className="text-right">
                          <Button color="link" className="px-0">Forgot password?</Button>
                        </Col> */}
                      </Row>
                    </Form>
                  </CardBody>
                </Card>
                {/* <Card className="text-white bg-primary py-5 d-md-down-none" style={{ width: '44%' }}>
                  <CardBody className="text-center">
                    <div>
                      <h2>Sign up</h2>
                      <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut
                        labore et dolore magna aliqua.</p>
                      <Link to="/register">
                        <Button color="primary" className="mt-3" active tabIndex={-1}>Register Now!</Button>
                      </Link>
                    </div>
                  </CardBody>
                </Card> */}
              </CardGroup>
            </Col>
          </Row>
        </Container>
        {this.state.alert}
      </div>
    );
  }
}

export default Login;
