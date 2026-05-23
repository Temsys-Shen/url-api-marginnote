function createMNUrlApisAddon(mainPath) {
  return JSB.defineClass(
    "MNUrlApisAddon : JSExtension",
    {
      sceneWillConnect: function () {
        self.mainPath = mainPath;
        MNURLInstallAddonBroadcastObserver(self);
        console.log("[Url Apis] gateway initialized");
      },
      sceneDidDisconnect: function () {
        MNURLRemoveAddonBroadcastObserver(self);
        console.log("[Url Apis] gateway disconnected");
      },
      queryAddonCommandStatus: function () {
        return {
          image: "icon.png",
          object: self,
          selector: "openSecretPanel:",
          checked: false,
        };
      },
      openSecretPanel: function () {
        MNURLToggleSecretPanel(self);
      },
      onSecretPanelClose: function () {
        MNURLRemoveSecretPanel(self);
      },
      onSecretPanelGenerateEmpty: function () {
        MNURLGenerateSecretFromPanel(self, [MNURLPermissionGroupIds.EMPTY]);
      },
      onSecretPanelGenerateRead: function () {
        MNURLGenerateSecretFromPanel(self, [MNURLPermissionGroupIds.READ]);
      },
      onSecretPanelGenerateWrite: function () {
        MNURLGenerateSecretFromPanel(self, [MNURLPermissionGroupIds.WRITE]);
      },
      onSecretPanelGenerateAdmin: function () {
        MNURLGenerateSecretFromPanel(self, [MNURLPermissionGroupIds.ADMIN]);
      },
      onSecretPanelGenerateAll: function () {
        MNURLGenerateSecretFromPanel(self, [MNURLPermissionGroupIds.ALL]);
      },
      onSecretPanelSelectSecret: function (sender) {
        MNURLSelectSecretFromPanel(self, sender);
      },
      onSecretPanelSaveNote: function () {
        MNURLSaveSelectedSecretNoteFromPanel(self);
      },
      onSecretPanelCopy: function () {
        MNURLCopySelectedSecretFromPanel(self);
      },
      onSecretPanelDelete: function () {
        MNURLDeleteSelectedSecretFromPanel(self);
      },
      onSecretPanelSetEmpty: function () {
        MNURLSetSelectedSecretPermissionFromPanel(self, MNURLPermissionGroupIds.EMPTY);
      },
      onSecretPanelSetRead: function () {
        MNURLSetSelectedSecretPermissionFromPanel(self, MNURLPermissionGroupIds.READ);
      },
      onSecretPanelSetWrite: function () {
        MNURLSetSelectedSecretPermissionFromPanel(self, MNURLPermissionGroupIds.WRITE);
      },
      onSecretPanelSetAdmin: function () {
        MNURLSetSelectedSecretPermissionFromPanel(self, MNURLPermissionGroupIds.ADMIN);
      },
      onSecretPanelSetAll: function () {
        MNURLSetSelectedSecretPermissionFromPanel(self, MNURLPermissionGroupIds.ALL);
      },
      onAddonBroadcast: function (notification) {
        MNURLHandleAddonBroadcast(self, notification);
      },
    },
  );
}
