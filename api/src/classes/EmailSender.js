import AWS from 'aws-sdk';

class EmailSender {

  constructor() {
    this.AWS = AWS;
    this.AWS.config.update({
      accessKeyId: process.env.SES_API_KEY,
      secretAccessKey: process.env.SES_API_SECRET,
      region: 'us-east-1'
    });
    this.ses = new this.AWS.SES({
      apiVersion: '2010-12-01'
    });
  }

  sendEmail(payload) {
    const params = {
      Source: 'contact@lellenge.com',
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
      ConfigurationSetName: 'SESDefault',
      // Tags: [{
      //   Name: 'receiver',
      //   Value: payload.receiverId
      // }]
    };
    // console.log(`[sendEmail] params: ${JSON.stringify(params)}`);
    return new Promise((resolve, reject) => {
      this.ses.sendEmail(params, function(err, result){
        if(err){
          return reject(err);
        }
        resolve(result);
      });
    })

  }
}

export default EmailSender;