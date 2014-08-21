define(function () {
  return function () {
    var el = document.createElement("div");
    el.className = "nodeinfo";
    el.update = update;

    function flattenDict(o, n, parentKey) {
      if (n === undefined)
        n = {};

      for (var k in o) {
        var nk = (parentKey?parentKey + ".":"") + k;
        if (typeof o[k] === 'object')
          flattenDict(o[k], n, nk);
        else
          n[nk] = o[k]
      }

      return n;
    }

    function deepGet(dict, key) {
      var k = key.shift();

      if (!(k in dict))
        return null;

      if (key.length == 0)
        return dict[k];

      return deepGet(dict[k], key);
    }

    function dlEntry(dl, dict, key, prettyName) {
      var v = deepGet(dict, key.split("."));

      if (v === null)
        return;

      var dt = document.createElement("dt");
      var dd = document.createElement("dd");

      dt.textContent = prettyName;
      if (v instanceof Array) {
        var tn = v.map(function (d) { return document.createTextNode(d); });
        tn.forEach(function (node) {
          if (dd.hasChildNodes())
            dd.appendChild(document.createElement("br"));

          dd.appendChild(node);
        });
      } else
        dd.textContent = v;

      dl.appendChild(dt);
      dl.appendChild(dd);
    }
    
    function update(nodeInfo) {
      clear();

      var nodename = document.createElement("h1");
      nodename.textContent = nodeInfo.hostname;
      el.appendChild(nodename);

      var list = document.createElement("dl");

      var dict = flattenDict(nodeInfo);

      dlEntry(list, nodeInfo, "owner.contact", "Kontakt");
      dlEntry(list, nodeInfo, "hardware.model", "Modell");
      dlEntry(list, nodeInfo, "network.mac", "Primäre MAC");
      dlEntry(list, nodeInfo, "network.addresses", "IP-Adresse");
      dlEntry(list, nodeInfo, "software.firmware.release", "Firmware Release");
      dlEntry(list, nodeInfo, "software.fastd.enabled", "Mesh-VPN");
      dlEntry(list, nodeInfo, "software.autoupdater.enabled", "Automatische Updates");
      dlEntry(list, nodeInfo, "software.autoupdater.branch", "Branch");

      el.appendChild(list);
    }

    function clear() {
      while (el.firstChild)
        el.removeChild(el.firstChild);
    }

    return el;
  }
})
