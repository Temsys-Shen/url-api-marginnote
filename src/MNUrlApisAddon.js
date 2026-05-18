function createMNUrlApisAddon(mainPath) {
  return JSB.defineClass(
    "MNUrlApisAddon : JSExtension",
    {
      sceneWillConnect: function () {
        self.mainPath = mainPath;
        console.log("[Url Apis] initialized");
      },
      sceneDidDisconnect: function () {
        console.log("[Url Apis] disconnected");
      },
      queryAddonCommandStatus: function () {
        return {
          image: "icon.png",
          object: self,
          selector: "sayHello:",
          checked: false,
        };
      },
      sayHello: function () {
        console.log("[Url Apis] Hello, MarginNote!");
      },
    },
  );
}
