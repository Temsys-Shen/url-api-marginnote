function MNURLInstallAddonBroadcastObserver(context) {
  var notificationCenter = NSNotificationCenter.defaultCenter();
  var logger = MNURLCreateGatewayLogger();

  notificationCenter.removeObserverName(context, "AddonBroadcast");

  context.gatewayRuntime = MNURLCreateGatewayRuntime(context);

  notificationCenter.addObserverSelectorName(
    context,
    "onAddonBroadcast:",
    "AddonBroadcast",
  );

  logger.info("broadcast.installed", {
    notificationName: "AddonBroadcast",
  });
}

function MNURLRemoveAddonBroadcastObserver(context) {
  var notificationCenter = NSNotificationCenter.defaultCenter();
  notificationCenter.removeObserverName(context, "AddonBroadcast");

  context.gatewayRuntime = null;
  MNURLCreateGatewayLogger().info("broadcast.removed", {
    notificationName: "AddonBroadcast",
  });
}

function MNURLHandleAddonBroadcast(context, notification) {
  var logger = MNURLCreateGatewayLogger();
  var rawUrl = MNURLGetGatewayUrlFromNotification(notification);

  if (!MNURLIsGatewayApiUrl(rawUrl)) {
    logger.info("broadcast.ignored", {
      reason: "not_gateway_api_url",
      url: MNURLSummarizeUrl(rawUrl),
    });
    return;
  }

  logger.info("broadcast.accepted", {
    url: MNURLSummarizeUrl(rawUrl),
  });

  context.gatewayRuntime.handleUrl(rawUrl, {});
}

function MNURLGetGatewayUrlFromNotification(notification) {
  var userInfo = notification.userInfo;
  var rawUrl = MNURLGetUserInfoValue(userInfo, "url");

  if (MNURLIsGatewayApiUrl(rawUrl)) {
    return rawUrl;
  }

  var message = MNURLGetUserInfoValue(userInfo, "message");
  if (message === undefined || message === null || message === "") {
    return rawUrl;
  }

  return "marginnote4app://addon/" + String(message);
}

function MNURLGetUserInfoValue(userInfo, key) {
  if (!userInfo) {
    return null;
  }

  if (userInfo.objectForKey) {
    return userInfo.objectForKey(key);
  }

  return userInfo[key];
}
