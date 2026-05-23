var MNURLPermissionGroupIds = {
  EMPTY: "empty",
  READ: "read",
  WRITE: "write",
  ADMIN: "admin",
  ALL: "all",
};

var MNURLPermissionGroups = [
  {
    id: MNURLPermissionGroupIds.EMPTY,
    title: "空权限",
    actions: [],
  },
  {
    id: MNURLPermissionGroupIds.READ,
    title: "只读权限",
    actions: ["ping", "read", "ls", "find", "tree"],
  },
  {
    id: MNURLPermissionGroupIds.WRITE,
    title: "写入权限",
    actions: ["ping", "read", "ls", "find", "tree", "write"],
  },
  {
    id: MNURLPermissionGroupIds.ADMIN,
    title: "管理权限",
    actions: ["ping", "read", "ls", "find", "tree", "write", "delete"],
  },
  {
    id: MNURLPermissionGroupIds.ALL,
    title: "全部权限",
    actions: ["*"],
  },
];

function MNURLGetPermissionGroup(groupId) {
  for (var i = 0; i < MNURLPermissionGroups.length; i++) {
    if (MNURLPermissionGroups[i].id === groupId) {
      return MNURLPermissionGroups[i];
    }
  }

  throw MNURLBadRequest("Unknown permission group", {
    groupId: groupId,
  });
}

function MNURLDescribePermissionGroups(groupIds) {
  var titles = [];
  for (var i = 0; i < groupIds.length; i++) {
    titles.push(MNURLGetPermissionGroup(groupIds[i]).title);
  }

  return titles.join(" + ");
}

function MNURLMergePermissionGroups(groupIds) {
  var actionMap = {};

  for (var i = 0; i < groupIds.length; i++) {
    var group = MNURLGetPermissionGroup(groupIds[i]);
    for (var j = 0; j < group.actions.length; j++) {
      actionMap[group.actions[j]] = true;
    }
  }

  return {
    hasAction: function (action) {
      return actionMap["*"] === true || actionMap[action] === true;
    },
    actions: actionMap,
  };
}
