function MNURLIsGatewayApiUrl(rawUrl) {
  if (rawUrl === undefined || rawUrl === null) {
    return false;
  }

  var url = String(rawUrl);
  if (url.indexOf(MNURLGatewayProtocol.URL_PREFIX) !== 0) {
    return false;
  }

  var nextChar = url.charAt(MNURLGatewayProtocol.URL_PREFIX.length);
  return nextChar === "" || nextChar === "?";
}

function MNURLParseGatewayRequest(rawUrl) {
  var url = String(rawUrl);
  if (!MNURLIsGatewayApiUrl(url)) {
    throw MNURLBadRequest("URL path is not /api", {
      expectedPrefix: MNURLGatewayProtocol.URL_PREFIX,
    });
  }

  var query = MNURLExtractQuery(url);
  var queryParams = MNURLParseQuery(query);
  var requestId = MNURLRequireQueryField(
    queryParams,
    MNURLGatewayProtocol.REQUEST_FIELDS.REQUEST_ID,
  );
  var action = MNURLRequireQueryField(
    queryParams,
    MNURLGatewayProtocol.REQUEST_FIELDS.ACTION,
  );
  var secret = MNURLRequireQueryField(
    queryParams,
    MNURLGatewayProtocol.REQUEST_FIELDS.SECRET,
  );
  var payload = {};

  if (queryParams[MNURLGatewayProtocol.REQUEST_FIELDS.PAYLOAD] !== undefined) {
    payload = MNURLParsePayload(
      queryParams[MNURLGatewayProtocol.REQUEST_FIELDS.PAYLOAD],
    );
  }

  return {
    rawUrl: url,
    requestId: requestId,
    action: action,
    secret: secret,
    payload: payload,
    query: queryParams,
    receivedAt: new Date().toISOString(),
  };
}

function MNURLExtractQuery(url) {
  var hashIndex = url.indexOf("#");
  var urlWithoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  var queryIndex = urlWithoutHash.indexOf("?");

  if (queryIndex < 0) {
    return "";
  }

  return urlWithoutHash.slice(queryIndex + 1);
}

function MNURLParseQuery(query) {
  var params = {};
  if (!query) {
    return params;
  }

  var pairs = query.split("&");
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i];
    if (!pair) {
      continue;
    }

    var equalIndex = pair.indexOf("=");
    var rawKey = equalIndex >= 0 ? pair.slice(0, equalIndex) : pair;
    var rawValue = equalIndex >= 0 ? pair.slice(equalIndex + 1) : "";
    var key = MNURLDecodeQueryComponent(rawKey, "query key");
    var value = MNURLDecodeQueryComponent(rawValue, key);

    params[key] = value;
  }

  return params;
}

function MNURLDecodeQueryComponent(value, fieldName) {
  try {
    return decodeURIComponent(String(value).replace(/\+/g, "%20"));
  } catch (error) {
    throw MNURLBadRequest("Invalid URL encoding", {
      field: fieldName,
      input: String(value),
    });
  }
}

function MNURLRequireQueryField(queryParams, fieldName) {
  var value = queryParams[fieldName];
  if (value === undefined || value === "") {
    throw MNURLBadRequest("Missing required query field", {
      field: fieldName,
    });
  }

  return value;
}

function MNURLParsePayload(payloadText) {
  if (payloadText === "") {
    throw MNURLBadRequest("Invalid payload JSON", {
      payload: payloadText,
    });
  }

  try {
    return JSON.parse(payloadText);
  } catch (error) {
    throw MNURLBadRequest("Invalid payload JSON", {
      payload: payloadText,
      error: error.message,
    });
  }
}
