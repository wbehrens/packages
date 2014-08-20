require([ "vendor/bacon"
        , "lib/helper"
        , "lib/streams"
        , "lib/gui"
        , "lib/neighbourstream"
        ], function(Bacon, Helper, Streams, GUI, NeighbourStream) {
  var bootstrapUrl = "http://[fdef:ffc0:3dd7:0:76ea:3aff:febe:223e]/cgi-bin/nodeinfo";

  var gui;

  var foo;

  var nodeBus = new Bacon.Bus();
  var moveBus = new Bacon.Bus();

  function statuspage() {
    gui = new GUI(document, moveBus);

    Helper.getJSON(bootstrapUrl).then(moveBus.push);
  }

  function tryIp(ip) {
    return Helper.request(ip, "nodeinfo").then(function(d) {
      return { ip: ip
             , nodeinfo: d
             }
    });
  }

  moveBus.onValue(function (nodeinfo) {
    console.log("Moving to", nodeinfo);
    if (foo)
      foo();

    gui.nodeChanged(nodeinfo);

    var addresses = nodeinfo.network.addresses.filter(function (d) { return !/^fe80:/.test(d) });
    Promise.race(addresses.map(tryIp)).then(nodeBus.push);
  });

  nodeBus.onValue(function(current) {
    var stream = new NeighbourStream(current);
    foo = stream.onValue(gui.update);
  });

  statuspage()
})
