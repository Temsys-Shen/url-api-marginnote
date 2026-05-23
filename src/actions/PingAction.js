function MNURLHandlePingAction(request) {
  return MNURLBuildSuccessResponse(request, {
    ok: true,
    version: MNURLGatewayProtocol.VERSION,
    time: new Date().toISOString(),
  });
}
