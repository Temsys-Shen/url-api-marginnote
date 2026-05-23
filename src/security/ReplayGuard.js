var MNURLReplayGuardDefaultsKey = "top.museday.urlapi.replay_guard.v1";
var MNURLReplayGuardTtlMs = 120000;

function MNURLCreateReplayGuard() {
  return {
    assertFresh: function (request) {
      var records = MNURLReadReplayRecords();
      var now = Date.now();
      var freshRecords = [];
      var replayKey = MNURLBuildReplayKey(request);

      for (var i = 0; i < records.length; i++) {
        if (now - records[i].createdAt <= MNURLReplayGuardTtlMs) {
          if (records[i].key === replayKey) {
            MNURLWriteReplayRecords(freshRecords.concat(records.slice(i)));
            throw MNURLReplayDetected("Replay detected", {
              reason: "request_replayed",
            });
          }
          freshRecords.push(records[i]);
        }
      }

      freshRecords.push({
        key: replayKey,
        createdAt: now,
      });
      MNURLWriteReplayRecords(freshRecords);
    },
  };
}

function MNURLBuildReplayKey(request) {
  return [
    request.secretRecord ? request.secretRecord.id : request.secret,
    request.requestId,
  ].join(":");
}

function MNURLReadReplayRecords() {
  var rawValue = NSUserDefaults
    .standardUserDefaults()
    .stringForKey(MNURLReplayGuardDefaultsKey);

  if (!rawValue) {
    return [];
  }

  try {
    var records = JSON.parse(String(rawValue));
    return Array.isArray(records) ? records : [];
  } catch (error) {
    throw MNURLInternalError("Cannot read replay guard store", {
      defaultsKey: MNURLReplayGuardDefaultsKey,
      error: error.message,
    });
  }
}

function MNURLWriteReplayRecords(records) {
  NSUserDefaults
    .standardUserDefaults()
    .setObjectForKey(JSON.stringify(records), MNURLReplayGuardDefaultsKey);
  NSUserDefaults.standardUserDefaults().synchronize();
}
