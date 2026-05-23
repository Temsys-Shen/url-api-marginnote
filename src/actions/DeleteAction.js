function MNURLHandleDeleteAction(request) {
  return MNURLBuildSuccessResponse(request, MNURLDeleteFileSystem(request.payload));
}
