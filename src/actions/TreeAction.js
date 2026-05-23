function MNURLHandleTreeAction(request) {
  return MNURLBuildSuccessResponse(request, MNURLBuildFileSystemTree(request.payload));
}
