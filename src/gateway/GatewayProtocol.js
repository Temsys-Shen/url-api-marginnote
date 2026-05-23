var MNURLGatewayProtocol = {
  VERSION: "0.1.0",
  URL_PREFIX: "marginnote4app://addon/api",
  REQUEST_FIELDS: {
    REQUEST_ID: "requestId",
    ACTION: "action",
    SECRET: "secret",
    PAYLOAD: "payload",
  },
  CALLBACK_FIELDS: {
    SUCCESS: "x-success",
    ERROR: "x-error",
  },
  ACTIONS: {
    PING: "ping",
    READ: "read",
    LS: "ls",
    FIND: "find",
    WRITE: "write",
    DELETE: "delete",
    TREE: "tree",
  },
  ERROR_CODES: {
    OK: "OK",
    BAD_REQUEST: "BAD_REQUEST",
    AUTH_FAILED: "AUTH_FAILED",
    FORBIDDEN: "FORBIDDEN",
    NOT_FOUND: "NOT_FOUND",
    REPLAY_DETECTED: "REPLAY_DETECTED",
    INTERNAL_ERROR: "INTERNAL_ERROR",
  },
};

function MNURLBuildGatewayResponse(code, message, requestId, data, details) {
  return {
    code: code,
    message: message,
    requestId: requestId || null,
    data: data === undefined ? null : data,
    details: details === undefined ? null : details,
  };
}

function MNURLBuildSuccessResponse(request, data) {
  return MNURLBuildGatewayResponse(
    MNURLGatewayProtocol.ERROR_CODES.OK,
    "OK",
    request ? request.requestId : null,
    data,
    null,
  );
}

function MNURLBuildErrorResponse(error, request) {
  var code = error && error.code
    ? error.code
    : MNURLGatewayProtocol.ERROR_CODES.INTERNAL_ERROR;
  var message = error && error.message ? error.message : "Internal error";
  var details = error && error.details ? error.details : null;
  var requestId = request && request.requestId ? request.requestId : null;

  return MNURLBuildGatewayResponse(code, message, requestId, null, details);
}

function MNURLCreateGatewayTraceId() {
  return "trace_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);
}
