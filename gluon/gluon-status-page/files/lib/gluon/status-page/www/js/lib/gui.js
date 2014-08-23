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

  function Container(parent) {
    var el = document.createElement("section");
    parent.appendChild(el);

    el.push = function (child) {
      var header = document.createElement("h2");
      header.appendChild(child.title);

      var div = document.createElement("div");
      div.node = child;
      div.appendChild(header);
      div.appendChild(child.content);

      el.appendChild(div);

      return function () {
        div.node.destroy();
        el.removeChild(div);
      }
    }

    return el;
  }

  return function (mgmtBus, nodesBus) {
    function setTitle(node, state) {
      var title = node?node.hostname:"(not connected)";

      document.title = title;
      h1.textContent = title;

      var icon = document.createElement("i");
      icon.className = "icon-down-dir";

      h1.appendChild(icon);

      switch (state) {
        case "connect":
          stateIcon.className = "icon-arrows-cw animate-spin";
          break;
        case "fail":
          stateIcon.className = "icon-attention";
          break;
        default:
          stateIcon.className = "";
          break;
      }
    }

    var header = document.createElement("header");
    var h1 = document.createElement("h1");
    header.appendChild(h1);

    var icons = document.createElement("p");
    icons.className = "icons";
    header.appendChild(icons);

    var stateIcon = document.createElement("i");
    icons.appendChild(stateIcon);

    var nodeInfoBlock;
    var statisticsBlock;
    var neighbourListBlock;

    var nodesList = document.createElement("ul");
    nodesList.className = "list-nodes";

    document.body.appendChild(header);

    setTitle();

    var content = new Container(document.body);

    document.body.appendChild(nodesList);

    function nodeChanged(nodeInfo) {
      setTitle(nodeInfo, "connect");

      if (nodeInfoBlock)
        nodeInfoBlock();

      if (statisticsBlock)
        statisticsBlock();

      if (neighbourListBlock)
        neighbourListBlock();

      nodeInfoBlock = content.push(new NodeInfo(nodeInfo));
    }

    function nodeNotArrived(nodeInfo) {
      setTitle(nodeInfo, "fail");
    }

    function nodeArrived(nodeInfo, ip) {
      setTitle(nodeInfo);

      var neighbourStream = new NeighbourStream(mgmtBus, nodesBus, ip);
      var statisticsStream = new Streams.statistics(ip);

      statisticsBlock = content.push(new Statistics(statisticsStream));
      neighbourListBlock = content.push(new NeighbourList(neighbourStream, mgmtBus));
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
