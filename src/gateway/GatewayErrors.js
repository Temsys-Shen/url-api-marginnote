var MNURLGatewayErrorCodes = MNURLGatewayProtocol.ERROR_CODES;

function MNURLGatewayError(code, message, details) {
  this.name = "MNURLGatewayError";
  this.code = code;
  this.message = message;
  this.details = details || null;
}

MNURLGatewayError.prototype = Object.create(Error.prototype);
MNURLGatewayError.prototype.constructor = MNURLGatewayError;

function MNURLBadRequest(message, details) {
  return new MNURLGatewayError(
    MNURLGatewayErrorCodes.BAD_REQUEST,
    message,
    details,
  );
}

function MNURLNotFound(message, details) {
  return new MNURLGatewayError(
    MNURLGatewayErrorCodes.NOT_FOUND,
    message,
    details,
  );
}

function MNURLReplayDetected(message, details) {
  return new MNURLGatewayError(
    MNURLGatewayErrorCodes.REPLAY_DETECTED,
    message,
    details,
  );
}

function MNURLAuthFailed(message, details) {
  return new MNURLGatewayError(
    MNURLGatewayErrorCodes.AUTH_FAILED,
    message,
    details,
  );
}

function MNURLForbidden(message, details) {
  return new MNURLGatewayError(
    MNURLGatewayErrorCodes.FORBIDDEN,
    message,
    details,
  );
}

function MNURLInternalError(message, details) {
  return new MNURLGatewayError(
    MNURLGatewayErrorCodes.INTERNAL_ERROR,
    message,
    details,
  );
}
