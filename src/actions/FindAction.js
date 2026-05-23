function MNURLHandleFindAction(request) {
  return MNURLBuildSuccessResponse(request, MNURLFindFileSystem(request.payload));
}
