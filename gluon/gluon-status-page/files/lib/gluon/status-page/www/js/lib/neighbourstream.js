"use strict";
define([ "vendor/bacon"
       , "lib/helper"
       , "lib/streams"
       ], function(Bacon, Helper, Streams) {

  return function (mgmtBus, nodesBus, ip) {
    function nodeQuerier(bus) {
      var asked = {};
      var out = new Bacon.Bus();
      var timeout = 6000;

      bus.subscribe(function (e) {
        if (e.isEnd())
          out.end();

        if (e.hasValue()) {
          var now = new Date().getTime();
          var ifname = e.value();

          if (!(ifname in asked) || now - asked[ifname] > timeout) {
            asked[ifname] = now;
            var stream = Streams.nodeInfo(ip, ifname);
            out.plug(stream.map(function (d) {
              return { "ifname": e.value()
                     , "nodeInfo": d
                     };
            }));
          }
        }
      });

      return out;
    }

    var querierAsk = new Bacon.Bus();
    var querier = nodeQuerier(querierAsk);
    querier.map(".nodeInfo").onValue(mgmtBus.pushEvent("nodeinfo"));

    return Bacon.fromBinder(function (sink) {
      function magic(interfaces) {
        for (var ifname in interfaces)
          querierAsk.push(ifname);

        var stations = [];
        for (var ifname in interfaces) {
          var stream = new Streams.stations(ip, ifname).toProperty({});
          stations.push(stream.map(function (d) {
            for (var station in d)
              d[station].ifname = ifname;

            return d;
          }));
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

        stream3.combine(nodesBus.map(".macs"),
          combineNeighoursNodeInfo(querierAsk)
        ).subscribe(sink);
      }

      function combineNeighoursNodeInfo(bus) {
        return function(stations, macs) {
          var toAsk = new Bacon.Bus();
          bus.plug(toAsk.skipDuplicates());

          for (var station in stations)
            if (station in macs)
              stations[station].nodeInfo = macs[station];
            else
              toAsk.push(stations[station].ifname);

          toAsk.end();

          return stations;
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
        querierAsk.end();
      }
    });
  }
})
