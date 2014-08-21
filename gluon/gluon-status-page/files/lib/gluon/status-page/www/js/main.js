"use strict";
require([ "vendor/bacon"
        , "lib/helper"
        , "lib/streams"
        , "lib/gui"
        ], function(Bacon, Helper, Streams, GUI) {
  var bootstrapUrl = "http://[fdef:ffc0:3dd7:0:76ea:3aff:febe:223e]/cgi-bin/nodeinfo";

  function ManagementBus() {
    Bacon.Bus.call(this);
    var self = this;

    this.pushEvent = function (key, a) {
      var f = function (a) {
        return self.push([key, a]);
      }

      if (a !== undefined)
        return f(a);

      return f;
    }

    this.onEvent = function (events) {
      return self.onValue(function (e) {
        var e = e.slice(); // shallow copy so calling shift doesn't change it
        var ev = e.shift();
        if (ev in events)
          events[ev].apply(self, e);
      });
    }
  }

  ManagementBus.prototype = Object.create(Bacon.Bus.prototype);
  ManagementBus.prototype.constructor = ManagementBus;

  var mgmtBus = new ManagementBus();

  var gui = new GUI(mgmtBus);

  function tryIp(ip) {
    return Helper.request(ip, "nodeinfo").then(function(d) { return ip });
  }

  mgmtBus.onEvent({ "goto": gotoNode });

  function gotoNode(nodeInfo) {
    var addresses = nodeInfo.network.addresses.filter(function (d) { return !/^fe80:/.test(d) });
    Promise.race(addresses.map(tryIp)).then(mgmtBus.pushEvent("arrived"), mgmtBus.pushEvent("gotoFailed"));
  }

  mgmtBus.log("mgmt");

  Helper.getJSON(bootstrapUrl).then(function (d) {
    mgmtBus.pushEvent("nodeinfo", d);
    mgmtBus.pushEvent("goto", d);
  }, function (d) {
    console.log("FIXME bootstrapping failed");
  });
})
