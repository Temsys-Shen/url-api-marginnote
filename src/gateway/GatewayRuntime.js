function MNURLCreateGatewayRuntime(context) {
  var logger = MNURLCreateGatewayLogger();
  var router = MNURLCreateGatewayRouter();
  var authPolicy = MNURLCreateAuthPolicy();
  var callbackClient = MNURLCreateCallbackClient(logger);

  return {
    handleUrl: function (rawUrl, contextInfo) {
      var startedAt = Date.now();
      var traceId = MNURLCreateGatewayTraceId();
      var request = null;
      var callbacks = null;
      var rawErrorCallbackUrl = "";

      try {
        rawErrorCallbackUrl = MNURLResolveRawErrorCallbackUrl(rawUrl);
        request = MNURLParseGatewayRequest(rawUrl);
        callbacks = MNURLResolveGatewayCallbacks(request);
        request = MNURLPrepareGatewayRequest(request, callbacks);
        request.contextInfo = contextInfo || {};
        request.traceId = traceId;

        logger.info("request.received", {
          traceId: traceId,
          requestId: request.requestId,
          action: request.action,
          url: MNURLSummarizeUrl(request.rawUrl),
        });

        var authentication = authPolicy.authenticate(request);
        if (!authentication.allowed) {
          throw MNURLAuthFailed("Authentication failed", authentication);
        }

        var authorization = authPolicy.authorize(request);
        if (!authorization.allowed) {
          throw MNURLForbidden("Authorization denied", authorization);
        }

        var response = router.route(request);
        callbackClient.sendSuccess(callbacks, response);

        logger.info("request.completed", {
          traceId: traceId,
          requestId: request.requestId,
          action: request.action,
          code: response.code,
          durationMs: Date.now() - startedAt,
        });
      } catch (error) {
        var response = MNURLBuildErrorResponse(error, request);

        logger.error("request.failed", {
          traceId: traceId,
          requestId: request ? request.requestId : null,
          action: request ? request.action : null,
          code: response.code,
          message: response.message,
          durationMs: Date.now() - startedAt,
          url: MNURLSummarizeUrl(rawUrl),
        });

        if (callbacks) {
          callbackClient.sendError(callbacks, response);
          return;
        }

        if (rawErrorCallbackUrl) {
          callbackClient.sendErrorToUrl(rawErrorCallbackUrl, response);
          return;
        }

        logger.error("callback.missing", {
          traceId: traceId,
          code: response.code,
          message: "Cannot send error response because no callback URL is available.",
        });
        console.log(
          "[Url Apis Gateway] no callback URL is available; cannot return error response.",
          "traceId:",
          traceId,
          "code:",
          response.code,
        );
      }
    },
    getContext: function () {
      return context;
    },
  };
}
