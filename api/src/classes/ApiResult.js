class ApiResult {
  constructor(message = 'Success', data = null, currentPageId, nextPageId) {
    if (currentPageId) currentPageId = parseInt(currentPageId);
    if (nextPageId) nextPageId = parseInt(nextPageId);
    this.message = message;
    this.data = data;
    this.currentPageId = currentPageId || 0;
    this.nextPageId = nextPageId || 0;

    if (this.currentPageId === this.nextPageId) {
      this.nextPageId = 0;
    }
  }

  success() {
    return {
      settings: {
        status: 1,
        message: this.message,
        currentPageId: this.currentPageId,
        nextPageId: this.nextPageId,
      },
      data: this.data,
    };
  }

  sendStatus(settings) {
    return {
      settings,
    };
  }

  withPayload(settings, data) {
    return {
      settings,
      data,
    };
  }
}

export default ApiResult;
