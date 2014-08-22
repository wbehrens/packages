"use strict";
define([ "lib/helper"
       , "lib/gui/signalgraph"
       ], function (Helper, SignalGraph) {

  function listEntry(parent, stream, mgmtBus) {
    var el = document.createElement("li");
    var wrapper = document.createElement("div");
    wrapper.className = "wrapper";

    var canvas = document.createElement("canvas");
    el.appendChild(wrapper);
    wrapper.appendChild(canvas);
    parent.appendChild(el);

    canvas.className = "signal-history";
    canvas.height = 100;
    var chart = new SignalGraph(canvas, -100, 0, 5, true);

    var info = document.createElement("div");
    info.className = "info";

    var hostname = document.createElement("h3");
    info.appendChild(hostname);

    var p = document.createElement("p");
    info.appendChild(p);

    wrapper.appendChild(info);

    var infoSet = false;
    var unsubscribe = stream.onValue(update);

    el.destroy = function () {
      unsubscribe();
    }

    return el;

    function update(d) {
      var signal = d.signal;
      var inactive = d.inactive;

      if (inactive > 200)
        signal = null;

      chart(signal);

      if (!infoSet) {
        if ("nodeInfo" in d) {
          infoSet = true;

          var link = document.createElement("a");
          link.textContent = d.nodeInfo.hostname;
          link.href = "#";
          link.nodeInfo = d.nodeInfo;
          link.onclick = function () {
            mgmtBus.pushEvent("goto", this.nodeInfo);
            return false;
          }

          while (hostname.firstChild)
            hostname.removeChild(hostname.firstChild);

          hostname.appendChild(link);
          p.textContent = [ d.ifname
                          , d.nodeInfo.hardware.model
                          , d.nodeInfo.software.firmware.release
                          ].join(', ');
        } else {
          hostname.textContent = station;
          p.textContent = d.ifname;
        }
      }
    }
  }

  return function (stream, mgmtBus) {
    var el = document.createElement("ul");
    el.className = "list-neighbour";

    var stopStream = stream.onValue(update);

    var children = {};

    function update(d) {
      for (var station in children)
        if (!(station in d)) {
          el.removeChild(children[station]);
          children[station].destroy();
          delete children[station];
        }

      for (var station in d)
        if (!(station in children)) {
          var bus = new Bacon.Bus();
          children[station] = new listEntry(el, bus, mgmtBus);

          bus.push(d[station]);
          bus.plug(stream.map("." + station));
        }
    }

    function destroy() {
      stopStream();
      for (var station in children) {
        el.removeChild(children[station]);
        children[station].destroy();
        delete children[station];
      }
    }

    return { title: document.createTextNode("Nachbarn")
           , content: el
           , destroy: destroy
           }
  }
})
