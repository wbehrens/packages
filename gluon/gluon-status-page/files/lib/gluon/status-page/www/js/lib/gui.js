"use strict";
define([ 'lib/gui/signalgraph'
       , 'lib/gui/nodeinfo'
       , 'lib/neighbourstream'
       ], function (SignalGraph, NodeInfo, NeighbourStream) {

  return function (mgmtBus, nodesBus) {
    var header = document.createElement("header");
    var h1 = document.createElement("h1");
    h1.textContent = "Statuspage";
    header.appendChild(h1);

    var content = document.createElement("section");

    var main = document.createElement("div");
    main.className ="main";

    var nodeInfoBlock = new NodeInfo();

    var neighboursDiv = document.createElement("div");
    neighboursDiv.className ="list-neighbour";

    var h2 = document.createElement("h2");
    h2.textContent = "Nachbarknoten";
    neighboursDiv.appendChild(h2);

    var neighbours = document.createElement("ul");
    neighboursDiv.appendChild(neighbours);

    var neighboursList = {};

    var nodesList = document.createElement("ul");
    nodesList.className ="list-nodes";

    main.appendChild(header);
    content.appendChild(nodeInfoBlock);
    content.appendChild(neighboursDiv);
    main.appendChild(content);
    main.appendChild(nodesList);
    document.body.appendChild(main);

    var stopNeighbourStream;

    function nodeChanged(nodeInfo) {
      neighboursList = {};

      while (neighbours.firstChild)
        neighbours.removeChild(neighbours.firstChild);

      if (stopNeighbourStream)
        stopNeighbourStream();

      nodeInfoBlock.update(nodeInfo);
    }

    function nodeArrived(ip) {
      var stream = new NeighbourStream(mgmtBus, nodesBus, ip);
      stopNeighbourStream = stream.onValue(updateNeighbours);
    }

    function newNodes(d) {
      while (nodesList.firstChild)
        nodesList.removeChild(nodesList.firstChild);

      for (var nodeId in d) {
        var nodeInfo = d[nodeId];
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.textContent = nodeInfo.hostname;
        a.href = "#";
        a.nodeInfo = nodeInfo;
        a.onclick = function () {
          mgmtBus.pushEvent("goto", this.nodeInfo);
          return false;
        }

        li.appendChild(a);
        nodesList.appendChild(li);
      }
    }

    function updateNeighbours(d) {
      var stations = {};
      for (var station in d) {
        if ('signal' in d[station])
          stations[station] = null;

        if (!(station in neighboursList)) {
          var el = document.createElement("li");
          var wrapper = document.createElement("div");
          wrapper.className ="wrapper";

          var canvas = document.createElement("canvas");
          el.appendChild(wrapper);
          wrapper.appendChild(canvas);
          neighbours.appendChild(el);

          canvas.className ="signal-history";
          canvas.height = 100;
          var chart = new SignalGraph(canvas, -100, 0, 5, true);

          var info = document.createElement("div");
          info.className ="info";

          var hostname = document.createElement("h3");
          info.appendChild(hostname);

          var p = document.createElement("p");
          info.appendChild(p);

          wrapper.appendChild(info);

          neighboursList[station] = { signal: chart
                                    , hostname: hostname
                                    , el: el
                                    , infoSet: false
                                    , info: p
                                    }
        } else {
          var signal = d[station].signal;
          var inactive = d[station].inactive;

          var neighbour = d[station];

          if (inactive > 200)
            signal = null;

          neighboursList[station].signal(signal);

          if (!neighboursList[station].infoSet) {
            var hostname = neighboursList[station].hostname;
            var info = neighboursList[station].info;

            if ("nodeInfo" in d[station]) {
              neighboursList[station].infoSet = true;

              var node = d[station].nodeInfo;
              var link = document.createElement("a");

              link.textContent = node.hostname;
              link.href = "#";
              link.nodeInfo = node;
              link.onclick = function () {
                mgmtBus.pushEvent("goto", this.nodeInfo);
                return false;
              }

              while (hostname.firstChild)
                hostname.removeChild(hostname.firstChild);

              hostname.appendChild(link);
              info.textContent = [ neighbour.ifname
                                 , node.hardware.model
                                 , node.software.firmware.release
                                 ].join(', ');
            } else {
              hostname.textContent = station;
              info.textContent = neighbour.ifname;
            }
          }
        }
      }

      for (var station in neighboursList) {
        if (!(station in stations)) {
          neighbours.removeChild(neighboursList[station].el);
          delete neighboursList[station];
        }
      }
    }

    mgmtBus.onEvent({ "goto": nodeChanged
                    , "arrived": nodeArrived
                    });

    nodesBus.map(".nodes").onValue(newNodes);

    return this;
  }
})
