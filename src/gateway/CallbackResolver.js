function MNURLResolveGatewayCallbacks(request) {
  return {
    successUrl: MNURLSelectCallbackUrl(
      request.query,
      MNURLGatewayProtocol.CALLBACK_FIELDS.SUCCESS,
      MNURLGatewayProtocol.LEGACY_CALLBACK_FIELDS.SUCCESS,
    ),
    errorUrl: MNURLSelectCallbackUrl(
      request.query,
      MNURLGatewayProtocol.CALLBACK_FIELDS.ERROR,
      MNURLGatewayProtocol.LEGACY_CALLBACK_FIELDS.ERROR,
    ),
  };
}

function MNURLRequireGatewayCallbacks(callbacks) {
  var missing = [];
  if (!callbacks.successUrl) {
    missing.push(MNURLGatewayProtocol.CALLBACK_FIELDS.SUCCESS);
  }

  if (!callbacks.errorUrl) {
    missing.push(MNURLGatewayProtocol.CALLBACK_FIELDS.ERROR);
  }

  if (missing.length > 0) {
    throw MNURLBadRequest("Missing callback URL", {
      fields: missing,
      legacyFields: [
        MNURLGatewayProtocol.LEGACY_CALLBACK_FIELDS.SUCCESS,
        MNURLGatewayProtocol.LEGACY_CALLBACK_FIELDS.ERROR,
      ],
    });
  }
}

function MNURLResolveRawErrorCallbackUrl(rawUrl) {
  if (!rawUrl) {
    return "";
  }

  var query = MNURLExtractQuery(String(rawUrl));
  if (!query) {
    return "";
  }

  var queryParams = MNURLParseQuery(query);
  return MNURLSelectQueryValue(
    queryParams,
    MNURLGatewayProtocol.CALLBACK_FIELDS.ERROR,
  ) ||
    MNURLSelectQueryValue(
      queryParams,
      MNURLGatewayProtocol.LEGACY_CALLBACK_FIELDS.ERROR,
    );
}

function MNURLPrepareGatewayRequest(request, callbacks) {
  request.callbacks = callbacks;
  request.payload = MNURLStripCallbackTransportFields(request.payload);
  return request;
}

function MNURLSelectCallbackUrl(
  queryParams,
  queryKey,
  legacyQueryKey
) {
  return MNURLSelectQueryValue(queryParams, queryKey) ||
    MNURLSelectQueryValue(queryParams, legacyQueryKey);
}

function MNURLSelectQueryValue(queryParams, key) {
  var value = queryParams ? queryParams[key] : "";
  return value === undefined || value === null ? "" : String(value);
}

function MNURLStripCallbackTransportFields(payload) {
  if (!payload || typeof payload !== "object" || !payload.callbacks) {
    return payload;
  }

  var result = {};
  var keys = Object.keys(payload);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key !== "callbacks") {
      result[key] = payload[key];
    }
  }

  return result;
}
