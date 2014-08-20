define(['lib/signalgraph'], function (SignalGraph) {
  function nodeInfoBlock() {
    var div = document.createElement("div");

    return this;
  }

  return function (document, moveBus) {
    var main = document.createElement("div");
    main.setAttribute("class", "main");
    var header = document.createElement("h1");
    var model = document.createElement("p");
    var neighbours = document.createElement("ul");
    neighbours.setAttribute("class", "list-neighbour");

    var neighboursList = {};

    main.appendChild(header);
    main.appendChild(model);
    main.appendChild(neighbours);
    document.body.appendChild(main);

    this.nodeChanged = function (nodeInfo) {
      header.textContent = nodeInfo.hostname;
      model.textContent = nodeInfo.hardware.model;
      neighboursList = {};

      while (neighbours.firstChild)
        neighbours.removeChild(neighbours.firstChild);
    }

    this.update = function (d) {
      var stations = {};
      for (var station in d.neighbours) {
        if ('signal' in d.neighbours[station])
          stations[station] = null;

        if (!(station in neighboursList)) {
          var el = document.createElement("li");
          var hostname = document.createElement("h3");
          el.appendChild(hostname);
          var div = document.createElement("div");
          var canvas = document.createElement("canvas");
          neighbours.appendChild(el);
          el.appendChild(div);
          canvas.setAttribute("class", "signal-history");
          canvas.setAttribute("width", div.clientWidth);
          canvas.setAttribute("height", "100");
          div.appendChild(canvas);

          var chart = new SignalGraph(canvas, -100, 0, 15);

          neighboursList[station] = { signal: chart
                                    , hostname: hostname
                                    , el: el
                                    , infoSet: false
                                    }
        } else {
          var signal = d.neighbours[station].signal;
          var inactive = d.neighbours[station].inactive;

          if (inactive > 200)
            signal = null;

          neighboursList[station].signal(signal);

          if (!neighboursList[station].infoSet) {
            var hostname = neighboursList[station].hostname;

            if ("nodeId" in d.neighbours[station]) {
              neighboursList[station].infoSet = true;

              var nodeId = d.neighbours[station].nodeId;
              var link = document.createElement("a");

              link.textContent = d.nodes[nodeId].hostname;
              link.setAttribute("href", "#");
              link.onclick = function () {
                moveBus.push(d.nodes[nodeId]);
                return false;
              }

              while (hostname.firstChild)
                hostname.removeChild(hostname.firstChild);

              hostname.appendChild(link);
            } else {
              hostname.textContent = station;
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
