"use strict";
define([ 'lib/gui/nodeinfo'
       , 'lib/gui/statistics'
       , 'lib/gui/neighbourlist'
       , 'lib/streams'
       , 'lib/neighbourstream'
       , 'vendor/svg-injector'
       ], function ( NodeInfo
                   , Statistics
                   , NeighbourList
                   , Streams
                   , NeighbourStream
                   , SVGInjector
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

    var menuButton = document.createElement("button");
    menuButton.onclick = function () {console.log("foo")}

    var icon = document.createElement("img");
    icon.src = "icons/dots-vertical.svg";
    SVGInjector(icon);
    menuButton.appendChild(icon);
    header.appendChild(menuButton);

    var main = document.createElement("div");
    main.className = "main";

    var nodeInfoBlock;
    var statisticsBlock;
    var neighbourListBlock;

    var nodesList = document.createElement("ul");
    nodesList.className = "list-nodes";

    main.appendChild(header);

    var content = new Container(main);

    setTitle();

    document.body.appendChild(main);
    document.body.appendChild(nodesList);

    function nodeChanged(nodeInfo) {
      setTitle(nodeInfo, "connecting");

      if (nodeInfoBlock)
        nodeInfoBlock();

      if (statisticsBlock)
        statisticsBlock();

      if (neighbourListBlock)
        neighbourListBlock();

      nodeInfoBlock = content.push(new NodeInfo(nodeInfo));
    }

    function nodeNotArrived(nodeInfo) {
      setTitle(nodeInfo, "failed to connect");
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
