function MNURLHandleLsAction(request) {
  return MNURLBuildSuccessResponse(request, MNURLListFileSystem(request.payload));
}
