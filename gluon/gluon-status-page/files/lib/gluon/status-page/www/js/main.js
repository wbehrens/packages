"use strict";
require([ "vendor/bacon"
        , "lib/helper"
        , "lib/streams"
        , "lib/gui"
        ], function(Bacon, Helper, Streams, GUI) {

  function ManagementBus() {
    Bacon.Bus.call(this);
    var self = this;

    this.pushEvent = function (key, a) {
      var f = function (a) {
        return self.push([key].concat(a));
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

  var nodesBusIn = new Bacon.Bus();

  var nodesBus = nodesBusIn.scan({ "nodes": {}
                                 , "macs": {}
                                 }, scanNodeInfo);

  var gui = new GUI(mgmtBus, nodesBus);

  mgmtBus.onEvent({ "goto": gotoNode
                  , "nodeinfo": nodesBusIn.push
                  });

  function tryIp(ip) {
    return Helper.request(ip, "nodeinfo").then(function(d) { return ip; });
  }

  var gotoEpoch = 0;

  function onEpoch(epoch, f) {
    return function (d) {
      if (epoch == gotoEpoch)
        return f(d);
    }
  }

  function gotoNode(nodeInfo) {
    gotoEpoch++;

    var addresses = nodeInfo.network.addresses.filter(function (d) { return !/^fe80:/.test(d) });
    Promise.race(addresses.map(tryIp)).then(
        onEpoch(gotoEpoch, function (d) {
          mgmtBus.pushEvent("arrived")([nodeInfo, d]);
        })
      ).catch(
        onEpoch(gotoEpoch, function () {
          mgmtBus.pushEvent("gotoFailed")(nodeInfo);
        })
      );
  }

  function scanNodeInfo(a, nodeInfo) {
    a.nodes[nodeInfo.node_id] = nodeInfo;

    var macs = Helper.dictGet(nodeInfo, ["network", "mesh_interfaces"]);

    if (macs)
      macs.forEach(function (mac) {
        a.macs[mac] = nodeInfo;
      });

    return a;
  }

  mgmtBus.log("mgmt");

  if (localStorage.nodes)
    JSON.parse(localStorage.nodes).forEach(nodesBusIn.push);

  nodesBus.map(".nodes").onValue(function (nodes) {
    var out = [];

    for (var k in nodes)
      out.push(nodes[k]);

    localStorage.nodes = JSON.stringify(out);
  });

  Helper.getJSON(bootstrapUrl).then(function (d) {
    mgmtBus.pushEvent("nodeinfo", d);
    mgmtBus.pushEvent("goto", d);
  }, function (d) {
    console.log("FIXME bootstrapping failed");
  });
})