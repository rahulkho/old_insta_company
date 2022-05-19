import AWS from 'aws-sdk';

class FileUploader {

	constructor() {
		this.AWS = AWS;
		this.AWS.config.update({
			region: 'us-west-1'
		});
		
		this.s3 = new this.AWS.S3({
			accessKeyId: process.env.S3_ACCESS_KEY,
			secretAccessKey: process.env.S3_ACCESS_KEY_SECRET,
			apiVersions: {
				's3': '2006-03-01'
			}
		});
	}

	uploadFile(args, callback) {
		const params = {
			Bucket: 'instausercontent',
			Key: args.fileName,
			Body: args.file,
			ACL: 'public-read',
			ContentType: args.contentType
		};
		this.s3.putObject(params, callback);
	}
}

export default FileUploader;

// {
// 	"Version": "2012-10-17",
// 	"Id": "Policy1550143856579",
// 	"Statement": [{
// 		"Sid": "Stmt1550143850842",
// 		"Effect": "Allow",
// 		"Principal": "*",
// 		"Action": "s3:GetObject",
// 		"Resource": "arn:aws:s3:::insta-public/*"
// 	}]
// }