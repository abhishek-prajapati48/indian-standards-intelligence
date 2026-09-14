export class ApiError extends Error {constructor(status,message,errorCode='ERROR'){super(message);this.status=status;this.errorCode=errorCode;}}
