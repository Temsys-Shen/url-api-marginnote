function MNURLHandleWriteAction(request) {
  return MNURLBuildSuccessResponse(request, MNURLWriteFileSystem(request.payload));
}
