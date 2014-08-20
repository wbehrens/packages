require([ "vendor/bacon"
        , "lib/helper"
        , "lib/streams"
        , "lib/gui"
        , "lib/neighbourstream"
        ], function(Bacon, Helper, Streams, GUI, NeighbourStream) {
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
  var neighbourBus = new Bacon.Bus();

  var gui = new GUI(document, mgmtBus, neighbourBus);

  var stopStream;

  function tryIp(ip) {
    return Helper.request(ip, "nodeinfo").then(function(d) { return ip });
  }

  var events = { "goto": gotoNode
               , "arrived": startStream
               };

  mgmtBus.onEvent(events);

  function gotoNode(nodeInfo) {
    if (stopStream)
      stopStream();

    var addresses = nodeInfo.network.addresses.filter(function (d) { return !/^fe80:/.test(d) });
    Promise.race(addresses.map(tryIp)).then(mgmtBus.pushEvent("arrived"));
  }

  function startStream(ip) {
    var stream = new NeighbourStream(ip);
    stopStream = neighbourBus.plug(stream);
  }

  mgmtBus.log("mgmt");

  Helper.getJSON(bootstrapUrl).then(mgmtBus.pushEvent("goto"));
})
