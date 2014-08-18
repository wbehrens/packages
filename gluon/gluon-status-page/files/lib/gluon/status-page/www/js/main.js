require.config({
    paths: { baconjs: 'vendor/bacon'
           , getJSON: 'lib/getJSON'
           , helper: 'lib/helper'
           , streams: 'lib/streams'
           , gui: 'lib/gui'
           , signalgraph: 'lib/signalgraph'
           }
});

require(["baconjs", "getJSON", "helper", "streams", "gui"], function(Bacon, getJSON, Helper, Streams, GUI) {
  var bootstrapUrl = "http://[fdef:ffc0:3dd7::92f6:52ff:fe82:602]/cgi-bin/nodeinfo";

  var gui;

  var foo;

  var nodeBus = new Bacon.Bus();
  var moveBus = new Bacon.Bus();

  function statuspage() {
    gui = new GUI(document, moveBus);

    getJSON(bootstrapUrl).then(moveBus.push);
  }

  function request(ip, object, param) {
    return getJSON(Helper.buildUrl(ip, object, param));
  }

  function tryIp(ip) {
    return request(ip, "nodeinfo").then(function(d) { return { ip: ip
                                                             , nodeinfo: d
                                                             }});
  }

  moveBus.onValue(function (nodeinfo) {
    console.log("Moving to", nodeinfo);
    var addresses = nodeinfo.network.addresses.filter(function (d) { return !/^fe80:/.test(d) });
    Promise.race(addresses.map(tryIp)).then(nodeBus.push);
  });

  nodeBus.onValue(function(current) {
    if (foo)
      foo();

    gui.nodeChanged(current.nodeinfo);

    request(current.ip, "interfaces").then(function (d) {magic(current, d)});
  });

  function nodeQuerier(node, bus) {
    var out = new Bacon.Bus();
  
    bus.onValue(function (ifname) {
      var stream = Streams.nodeInfo(node.ip, ifname);
      out.plug(stream.scan({}, addNode));
    });


    return out;
  }

  function addNode(a, b) {
    if (!(b.node_id in a))
      a[b.node_id] = b;

    return a;
  }

  function foldQuerier(a, nodes) {
    for (var nodeId in nodes) {
      if (!(nodeId in a.nodes))
        a.nodes[nodeId] = nodes[nodeId];

      var macs = nodes[nodeId].network.mesh_interfaces;

      macs.forEach(function (mac) {
        if (!(mac in a.macs))
          a.macs[mac] = nodeId;
      });
    }

    return a;
  }

  function magic(node, interfaces) {
    var bus = new Bacon.Bus();

    var querier = nodeQuerier(node, bus);

    querier = querier.scan({ nodes: {}
                           , macs: {}
                           }, foldQuerier);

    var stations = []
    for (var ifname in interfaces) {
      var stream = new Streams.stations(node.ip, ifname);
      stream = stream.map(
        function (d) {
          for (var station in d)
            d[station].ifname = ifname;

          return d;
        });
      stations.push(stream.toProperty({}));
    }

    var wifiStream = Bacon.combineAsArray(stations).map(function (d) {
      return d.reduce(function (p, c) {
        for (var station in c)
          p[station] = c[station];

        return p;
      }, {});
    });

    var batadvStream = new Streams.batadv(node.ip);

    var stream3 = wifiStream.toProperty()
                    .combine(batadvStream.toProperty(), combineWifiBatadv)

    stream3 = Bacon.combineTemplate({ stations: stream3
                                    , nodes: querier.toProperty()
                                    })
                    .scan({ internal: { asked: []
                                      }
                          , external: { neighbours: {}
                                      , nodes: {}
                                      }
                          }, foldNeighbours(bus))
                    .map(".external");

    foo = stream3.onValue(gui.update);
  }

  function arrayNub(a) {
    return a.sort().reduce(
      function (a, b) {
        if (a.length == 0)
          return [b];
        else if (b != a[a.length-1])
          return a.push(b);
        else
          return a;
      }, []);
  }

  function haveAsked(a, s) {
    return a.filter(function (d) {
      return d.station == s;
    }).length > 0;
  }

  function foldNeighbours(bus) {
    return function(a, b) {
      var toAsk = [];

      var now = new Date().getTime();

      a.internal.asked = a.internal.asked.filter(function (d) {
        return (now - d.timestamp) < 5 * 1000;
      });

      for (var station in b.stations) {
        if ("node" in b.stations[station]) {
          continue;
        } else if (station in b.nodes.macs) {
          b.stations[station].nodeId = b.nodes.macs[station];
        } else if (!haveAsked(a.internal.asked, station)) {
          a.internal.asked.push({ station: station
                                , timestamp: new Date().getTime()
                                });
          toAsk.push(b.stations[station].ifname);
        }
      }

      arrayNub(toAsk).forEach(bus.push);

      a.external.neighbours = b.stations;
      a.external.nodes = b.nodes.nodes;

      return a;
    }
  }

  function batadvToDict(batadv) {
    var o = {};

    for (var station in batadv) {
      var a = batadv[station];

      if (!(a.ifname in o))
        o[a.ifname] = {};

      o[a.ifname][station] = {};
      o[a.ifname][station].batadvTQ = a.tq;
    }

    return o;
  }

  function combineWifiBatadv(wifi, batadv) {
    for (var station in batadv) {
      if (!(station in wifi))
        wifi[station] = {}

      for (var a in batadv[station])
        wifi[station][a] = batadv[station][a];
      }

    return wifi;
  }

  statuspage()
})
