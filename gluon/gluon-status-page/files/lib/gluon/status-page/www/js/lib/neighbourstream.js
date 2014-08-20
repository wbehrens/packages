define([ "vendor/bacon"
       , "lib/helper"
       , "lib/streams"
       ], function(Bacon, Helper, Streams) {

  function mkNeighbourStream(ip) {
    var out = new Bacon.Bus();
    Helper.request(ip, "interfaces").then(function (d) {
      magic(ip, d, out);
    });

    return out;
  }

  function magic(ip, interfaces, output) {
    var bus = new Bacon.Bus();

    var querier = nodeQuerier(ip, bus);

    querier = querier.scan({ nodes: {}
                           , macs: {}
                           }, foldQuerier);

    var stations = []
    for (var ifname in interfaces) {
      var stream = new Streams.stations(ip, ifname);
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

    var batadvStream = new Streams.batadv(ip);

    var stream3 = wifiStream.combine(batadvStream.toProperty({}), combineWifiBatadv)

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


    output.plug(stream3);
  }


  function nodeQuerier(ip, bus) {
    var out = new Bacon.Bus();
  
    bus.onValue(function (ifname) {
      var stream = Streams.nodeInfo(ip, ifname);
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

  return mkNeighbourStream;
})
