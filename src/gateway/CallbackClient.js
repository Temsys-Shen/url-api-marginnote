function MNURLCreateCallbackClient(logger) {
  return {
    sendSuccess: function (callbacks, response) {
      return MNURLSendGatewayCallbackIfAvailable(
        MNURLSelectSuccessCallbackUrl(callbacks),
        response,
        "x-success",
        logger,
      );
    },
    sendError: function (callbacks, response) {
      return MNURLSendGatewayCallbackIfAvailable(
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
  if (!callbacks) {
    return "";
  }

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

function MNURLSendGatewayCallbackIfAvailable(callbackUrl, response, callbackType, logger) {
  if (!callbackUrl) {
    logger.info("callback.skipped", {
      callbackType: callbackType,
      requestId: response ? response.requestId : null,
      code: response ? response.code : null,
      reason: "missing_callback_url",
    });
    console.log(
      "[Url Apis Gateway] callback skipped because callback URL is missing.",
      "callbackType:",
      callbackType,
      "requestId:",
      response ? response.requestId : null,
      "code:",
      response ? response.code : null,
    );
    return false;
  }

  MNURLSendGatewayCallback(callbackUrl, response, callbackType, logger);
  return true;
}
