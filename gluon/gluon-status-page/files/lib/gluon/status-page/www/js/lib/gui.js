"use strict";
define([ 'lib/gui/nodeinfo'
       , 'lib/gui/statistics'
       , 'lib/gui/neighbourlist'
       , 'lib/streams'
       , 'lib/neighbourstream'
       ], function ( NodeInfo
                   , Statistics
                   , NeighbourList
                   , Streams
                   , NeighbourStream
                   ) {

  return function (mgmtBus, nodesBus) {
    function setTitle(node, prefix) {
      var title = node?node.hostname:"(not connected)";

      if (prefix)
        title = prefix + " " + title

      document.title = title;
      h1.textContent = title;
    }

    var header = document.createElement("header");
    var h1 = document.createElement("h1");
    header.appendChild(h1);

    var content = document.createElement("section");

    var main = document.createElement("div");
    main.className = "main";

    var nodeInfoBlock;
    var statisticsBlock;
    var neighbourListBlock;

    var nodesList = document.createElement("ul");
    nodesList.className = "list-nodes";

    main.appendChild(header);
    main.appendChild(content);

    setTitle();

    document.body.appendChild(main);
    document.body.appendChild(nodesList);

    function nodeChanged(nodeInfo) {
      setTitle(nodeInfo, "connecting");

      if (nodeInfoBlock) {
        content.removeChild(nodeInfoBlock.content);
        nodeInfoBlock.destroy();
      }

      if (statisticsBlock) {
        content.removeChild(statisticsBlock.content);
        statisticsBlock.destroy();
      }

      if (neighbourListBlock) {
        content.removeChild(neighbourListBlock.content);
        neighbourListBlock.destroy();
      }

      nodeInfoBlock = new NodeInfo(nodeInfo);
      content.appendChild(nodeInfoBlock.content);
    }

    function nodeNotArrived(nodeInfo) {
      setTitle(nodeInfo, "failed to connect");
    }

    function nodeArrived(nodeInfo, ip) {
      setTitle(nodeInfo);

      var neighbourStream = new NeighbourStream(mgmtBus, nodesBus, ip);
      var statisticsStream = new Streams.statistics(ip);

      statisticsBlock = new Statistics(statisticsStream);
      content.appendChild(statisticsBlock.content);

      neighbourListBlock = new NeighbourList(neighbourStream, mgmtBus);
      content.appendChild(neighbourListBlock.content);
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

    mgmtBus.onEvent({ "goto": nodeChanged
                    , "arrived": nodeArrived
                    , "gotoFailed": nodeNotArrived
                    });

    nodesBus.map(".nodes").onValue(newNodes);

    return this;
  }
})
