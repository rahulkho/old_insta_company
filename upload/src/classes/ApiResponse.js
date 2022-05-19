class ApiResponse {
	constructor(message = 'Success', data, status = 1) {
		this.response = {
			settings: {
				status,
				message
			},
			data
		}
	}
}

export default ApiResponse;