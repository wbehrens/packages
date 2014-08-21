"use strict";
define([ "vendor/bacon"
       , "lib/helper"
       , "lib/streams"
       ], function(Bacon, Helper, Streams) {

  return function (mgmtBus, nodesBus, ip) {
    return Bacon.fromBinder(function (sink) {
      function magic(interfaces) {
        var querierAsk = new Bacon.Bus();
        var querier = nodeQuerier(querierAsk);
        querier.map(".nodeInfo").onValue(mgmtBus.pushEvent("nodeinfo"));

        var macsToNodeId = nodesBus.map(".macs");

        var stations = [];
        for (var ifname in interfaces) {
          querierAsk.push(ifname);
          var stream = new Streams.stations(ip, ifname);
          stream = stream.map(function (d) {
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

        var batadvStream = new Streams.batadv(ip).toProperty({});

        var stream3 = wifiStream.combine(batadvStream, combineWifiBatadv);

        stream3 = Bacon.combineTemplate({ stations: stream3
                                        , macs: macsToNodeId
                                        })
                        .scan({ asked: {}, neighbours: {}}, foldNeighbours(querierAsk))
                        .map(".neighbours");

        stream3.onValue(sink);
      }

      function nodeQuerier(bus) {
        var out = new Bacon.Bus();

        bus.onValue(function (ifname) {
          var stream = Streams.nodeInfo(ip, ifname);
          out.plug(stream.map(function (d) {
            return { "ifname": ifname
                   , "nodeInfo": d
                   };
          }));
        });

        return out;
      }

      function foldNeighbours(bus) {
        return function(a, b) {
          var now = new Date().getTime();

          var toAsk = new Bacon.Bus();
          bus.plug(toAsk.skipDuplicates());

          for (var mac in a.asked)
            if (now - a.asked[mac] > 5 * 1000)
              delete a.asked[mac];

          for (var station in b.stations)
            if (station in b.macs) {
              b.stations[station].nodeInfo = b.macs[station];
            } else if (!(station in a.asked)) {
              a.asked[station] = now;
              toAsk.push(b.stations[station].ifname);
            }

          toAsk.end();

          a.neighbours = b.stations;

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

      Helper.request(ip, "interfaces").then(magic);

      return function () {
        console.log("FIXME, unsubscribe");
      }
    });
  }
})
