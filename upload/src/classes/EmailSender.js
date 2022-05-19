import AWS from 'aws-sdk';

class EmailSender {

  constructor() {
    this.AWS = AWS;
    this.AWS.config.update({
      accessKeyId: process.env.SES_API_KEY,
      secretAccessKey: process.env.SES_API_SECRET,
      region: 'us-west-2'
    });
    this.ses = new this.AWS.SES({
      apiVersion: '2010-12-01'
    });
  }

  sendEmail(payload, callback) {
    const params = {
      Source: payload.sender,
      Destination: {
        ToAddresses: [payload.receiver]
      },
      Message: {
        Subject: {
          Data: payload.subject,
          Charset: 'utf-8'
        },
        Body: {
          Html: {
            Data: payload.body,
            Charset: 'utf-8'
          }
        }
      },
      ConfigurationSetName: 'SesDefault',
      Tags: [{
        Name: 'receiver',
        Value: payload.receiverId
      }]
    };
    // console.log(`[sendEmail] params: ${JSON.stringify(params)}`);
    this.ses.sendEmail(params, callback);
  }
}

export default EmailSender;