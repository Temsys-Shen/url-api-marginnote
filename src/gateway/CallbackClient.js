function MNURLCreateCallbackClient(logger) {
  return {
    sendSuccess: function (callbacks, response) {
      MNURLSendGatewayCallback(
        MNURLSelectSuccessCallbackUrl(callbacks),
        response,
        "x-success",
        logger,
      );
    },
    sendError: function (callbacks, response) {
      MNURLSendGatewayCallback(
        MNURLSelectFailureCallbackUrl(callbacks),
        response,
        "x-error",
        logger,
      );
    },
    sendErrorToUrl: function (callbackUrl, response) {
      MNURLSendGatewayCallback(callbackUrl, response, "x-error", logger);
    },
  };
}

function MNURLSelectSuccessCallbackUrl(callbacks) {
  return callbacks.successUrl;
}

function MNURLSelectFailureCallbackUrl(callbacks) {
  if (!callbacks) {
    return "";
  }

  return callbacks.errorUrl;
}

function MNURLSendGatewayCallback(callbackUrl, response, callbackType, logger) {
  if (!callbackUrl) {
    throw MNURLBadRequest("Missing callback URL", {
      callbackType: callbackType,
    });
  }

  var directCallbackUrl = String(callbackUrl);
  var separator = directCallbackUrl.indexOf("?") >= 0 ? "&" : "?";
  var payload = encodeURIComponent(JSON.stringify(response));
  var finalUrl = directCallbackUrl + separator + "payload=" + payload;
  var nsUrl = NSURL.URLWithString(finalUrl);
  Application.sharedInstance().openURL(nsUrl);

  logger.info("callback.sent", {
    callbackType: callbackType,
    requestId: response.requestId,
    code: response.code,
    url: MNURLSummarizeUrl(finalUrl),
  });
}
