import contentTypes from './contentTypes.json';

const getContentType = (extension) => {
	return contentTypes[extension.toLowerCase()];
}

module.exports = {
	getContentType
}