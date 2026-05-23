function MNURLCreateAuthPolicy() {
  var secretStore = MNURLCreateSecretStore();
  var replayGuard = MNURLCreateReplayGuard();

  return {
    authenticate: function (request) {
      if (!request.secret) {
        return {
          allowed: false,
          reason: "missing_secret",
        };
      }

      var secretRecord = secretStore.findSecret(request.secret);
      if (!secretRecord) {
        return {
          allowed: false,
          reason: "unknown_secret",
        };
      }

      if (secretRecord.enabled !== true) {
        return {
          allowed: false,
          reason: "disabled_secret",
          secretId: secretRecord.id,
        };
      }

      request.secretRecord = secretRecord;
      replayGuard.assertFresh(request);

      return {
        allowed: true,
        secretId: secretRecord.id,
      };
    },
    authorize: function (request) {
      var permissions = MNURLMergePermissionGroups(request.secretRecord.groupIds);
      if (!permissions.hasAction(request.action)) {
        return {
          allowed: false,
          action: request.action,
          secretId: request.secretRecord.id,
          groupIds: request.secretRecord.groupIds,
        };
      }

      return {
        allowed: true,
        action: request.action,
        secretId: request.secretRecord.id,
      };
    },
  };
}
