function MNURLCreateGatewayLogger() {
  return {
    info: function (eventName, fields) {
      MNURLLogGatewayEvent("info", eventName, fields);
    },
    error: function (eventName, fields) {
      MNURLLogGatewayEvent("error", eventName, fields);
    },
  };
}

function MNURLLogGatewayEvent(level, eventName, fields) {
  var normalizedFields = fields || {};
  console.log("[Url Apis Gateway]");
  console.log("  level:", level.toUpperCase());
  console.log("  event:", eventName);
  MNURLPrintLogFields(normalizedFields);
}

function MNURLPrintLogFields(fields) {
  var keys = Object.keys(fields);

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = fields[key];
    if (value === undefined || value === null || value === "") {
      continue;
    }

    console.log("  " + key + ":", MNURLFormatLogValue(value));
  }
}

function MNURLFormatLogValue(value) {
  if (typeof value === "string") {
    return MNURLRedactLogString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

function MNURLRedactLogString(value) {
  return MNURLRedactUrlSensitiveParams(value).replace(
    /(secret=)([^&#\\s]*)/g,
    "$1[REDACTED]",
  );
}

function MNURLSummarizeUrl(url) {
  if (!url) {
    return "";
  }

  var text = MNURLRedactUrlSensitiveParams(String(url));
  if (text.length <= 240) {
    return text;
  }

  return text.slice(0, 240) + "...";
}

function MNURLRedactUrlSensitiveParams(url) {
  return url
    .replace(/([?&]secret=)([^&#]*)/g, "$1[REDACTED]");
}
