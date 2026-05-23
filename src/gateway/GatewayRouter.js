function MNURLCreateGatewayRouter() {
  var handlers = {
    ping: MNURLHandlePingAction,
    read: MNURLHandleReadAction,
    ls: MNURLHandleLsAction,
    find: MNURLHandleFindAction,
    write: MNURLHandleWriteAction,
    delete: MNURLHandleDeleteAction,
    tree: MNURLHandleTreeAction,
  };

  return {
    route: function (request) {
      var handler = handlers[request.action];
      if (!handler) {
        throw MNURLNotFound("Unknown action", {
          action: request.action,
        });
      }

      return handler(request);
    },
  };
}
