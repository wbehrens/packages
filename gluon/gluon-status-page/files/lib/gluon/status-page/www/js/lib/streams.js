"use strict";
define(["vendor/bacon", "lib/helper"], function(Bacon, Helper) {
  function nodeInfo(ip, ifname) {
    return Bacon.fromBinder(function (sink) {
      var url = Helper.buildUrl(ip, "dyn/neighbours-nodeinfo", ifname);
      var evtSource = new EventSource(url);

      evtSource.addEventListener("neighbour", function(e) {
        var r = sink(new Bacon.Next(JSON.parse(e.data)));

        if (r == Bacon.noMore)
          tearDown();
      }, false)

      evtSource.addEventListener("eot", function(e) {
        evtSource.close();
        sink(new Bacon.End);
      }, false)

      function tearDown() {
        evtSource.close();
      }

      return tearDown;
    })
  }

  function simpleStream(url) {
    return Bacon.fromBinder(function (sink) {
      var evtSource = new EventSource(url);

      evtSource.onmessage = function (e) {
        var r = sink(new Bacon.Next(JSON.parse(e.data)));
        if (r == Bacon.noMore)
          tearDown();
      }

      function tearDown() {
        evtSource.close();
      }

      return tearDown;
    })
  }

  function batadv(ip) {
    var url = Helper.buildUrl(ip, "dyn/neighbours-batadv");
    return simpleStream(url);
  }

  function stations(ip, ifname) {
    var url = Helper.buildUrl(ip, "dyn/stations", ifname);
    return simpleStream(url);
  }

  function statistics(ip) {
    var url = Helper.buildUrl(ip, "dyn/statistics");
    return simpleStream(url);
  }

  return { nodeInfo: nodeInfo
         , batadv: batadv
         , stations: stations
         , statistics: statistics
         }
})
