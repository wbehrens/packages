"use strict";
define([ "vendor/bacon"
       , "lib/helper"
       , "lib/streams"
       ], function(Bacon, Helper, Streams) {

  return function (mgmtBus, nodesBus, ip) {
    var unsubscribe = [];

    function nodeQuerier() {
      var asked = {};
      var timeout = 6000;

      return function (ifname) {
        var now = new Date().getTime();

        if (ifname in asked && now - asked[ifname] < timeout)
          return Bacon.never();

        asked[ifname] = now;
        return Streams.nodeInfo(ip, ifname).map(function (d) {
          return { "ifname": ifname
                 , "nodeInfo": d
                 };
        });
      }
    }

    var querierAsk = new Bacon.Bus();
    var querier = querierAsk.flatMap(nodeQuerier());
    querier.map(".nodeInfo").onValue(mgmtBus, "pushEvent", "nodeinfo");

    return Bacon.fromBinder(function (sink) {
      function wrapIfname(ifname) {
        return function (d) {
          var a = {};
          a[ifname] = d;
          return a;
        }
      }

      function extractIfname(d) {
        var r = {};

        for (var station in d) {
          var ifname = d[station].ifname;
          delete d[station].ifname;

          if (!(ifname in r))
            r[ifname] = {};

          r[ifname][station] = d[station];
        }

        return r;
      }

      function magic(interfaces) {
        var stations = [];
        for (var ifname in interfaces) {
          var stream = new Streams.stations(ip, ifname).toProperty({});
          stations.push(stream.map(wrapIfname(ifname)));
        }

        var wifiStream = Bacon.combineAsArray(stations).map(function (d) {
          return d.reduce(function (p, c) {
            for (var ifname in c)
              p[ifname] = c[ifname];

            return p;
          }, {});
        });

        var batadvStream = new Streams.batadv(ip).toProperty({});

        var stream = Bacon.combineWith(combine, wifiStream
                                              , batadvStream.map(extractIfname)
                                              , nodesBus.map(".macs")
                                              );

        unsubscribe.push(stream.onValue(function (d) {
          for (var ifname in d)
            for (var station in d[ifname])
              if (!("nodeInfo" in d[ifname][station]))
                querierAsk.push(ifname);
        }));

        unsubscribe.push(stream.subscribe(sink));

        for (var ifname in interfaces)
          querierAsk.push(ifname);
      }

      function combine(wifi, batadv, macs) {
        var interfaces = combineWithIfnames(wifi, batadv);

        for (var ifname in interfaces) {
          var stations = interfaces[ifname];
          for (var station in stations) {
            stations[station].id = station;

            if (station in macs)
              stations[station].nodeInfo = macs[station];
          }
        }

        return interfaces;
      }

      function combineWithIfnames(wifi, batadv) {
        var ifnames = Object.keys(wifi).concat(Object.keys(batadv));

        // remove duplicates
        ifnames.filter(function(e, i) {
          return ifnames.indexOf(e) == i;
        });

        var out = {};

        ifnames.forEach(function (ifname) {
          out[ifname] = combineWifiBatadv(wifi[ifname], batadv[ifname]);
        });

        return out;
      }

      function combineWifiBatadv(wifi, batadv) {
        var out = {};

        for (var station in batadv) {
          if (!(station in out))
            out[station] = {};

          out[station].batadv = batadv[station];
        }

        for (var station in wifi) {
          if (!(station in out))
            out[station] = {};

          out[station].wifi = wifi[station];
        }

        return out;
      }

      Helper.request(ip, "interfaces").then(magic);

      return function () {
        unsubscribe.forEach(function (d) { d() });
        querierAsk.end();
      }
    });
  }
})
