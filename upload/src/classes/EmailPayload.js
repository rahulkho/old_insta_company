class EmailPayload {
	constructor(subject, body, receiver, receiverId, sender = 'insta@email.atlansys.in') {
		this.subject = subject;
		this.body = body;
		this.receiver = receiver;
		this.sender = sender;
		this.receiverId = receiverId;
	}
}

export default EmailPayload;