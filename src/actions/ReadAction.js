function MNURLHandleReadAction(request) {
  return MNURLBuildSuccessResponse(request, MNURLReadFileSystem(request.payload));
}
