define([ 'lib/signalgraph'
       , 'lib/gui/nodeinfo'
       ], function (SignalGraph, NodeInfo) {

  return function (document, moveBus) {
    var header = document.createElement("header");
    var h1 = document.createElement("h1");
    h1.textContent = "Statuspage";
    header.appendChild(h1);

    var content = document.createElement("section");

    var main = document.createElement("div");
    main.setAttribute("class", "main");

    var nodeInfoBlock = new NodeInfo();

    var neighboursDiv = document.createElement("div");
    neighboursDiv.setAttribute("class", "list-neighbour");

    var h2 = document.createElement("h2");
    h2.textContent = "Nachbarknoten";
    neighboursDiv.appendChild(h2);

    var neighbours = document.createElement("ul");
    neighboursDiv.appendChild(neighbours);

    var neighboursList = {};

    main.appendChild(header);
    content.appendChild(nodeInfoBlock);
    content.appendChild(neighboursDiv);
    main.appendChild(content);
    document.body.appendChild(main);

    this.nodeChanged = function (nodeInfo) {
      neighboursList = {};

      while (neighbours.firstChild)
        neighbours.removeChild(neighbours.firstChild);

      nodeInfoBlock.update(nodeInfo);
    }

    this.update = function (d) {
      var stations = {};
      for (var station in d.neighbours) {
        if ('signal' in d.neighbours[station])
          stations[station] = null;

        if (!(station in neighboursList)) {
          var el = document.createElement("li");
          var wrapper = document.createElement("div");
          wrapper.setAttribute("class", "wrapper");

          var canvas = document.createElement("canvas");
          el.appendChild(wrapper);
          wrapper.appendChild(canvas);
          neighbours.appendChild(el);

          canvas.setAttribute("class", "signal-history");
          canvas.setAttribute("height", "100");
          var chart = new SignalGraph(canvas, -100, 0, 5, true);

          var info = document.createElement("div");
          info.setAttribute("class", "info");

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
          var signal = d.neighbours[station].signal;
          var inactive = d.neighbours[station].inactive;

          var neighbour = d.neighbours[station];

          if (inactive > 200)
            signal = null;

          neighboursList[station].signal(signal);

          if (!neighboursList[station].infoSet) {
            var hostname = neighboursList[station].hostname;
            var info = neighboursList[station].info;

            if ("nodeId" in d.neighbours[station]) {
              neighboursList[station].infoSet = true;

              var nodeId = d.neighbours[station].nodeId;
              var link = document.createElement("a");
              var node = d.nodes[nodeId];

              link.textContent = node.hostname;
              link.setAttribute("href", "#");
              link.onclick = function () {
                moveBus.push(d.nodes[nodeId]);
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

    return this;
  }
})
