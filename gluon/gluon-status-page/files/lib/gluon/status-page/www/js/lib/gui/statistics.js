"use strict";
define(["lib/helper"], function (Helper) {
  return function () {
    var el = document.createElement("pre");
    el.className = "nodeinfo";
    el.update = update;

    function update(statistics) {
      if (!statistics)
        el.textContent = ""
      else
        el.textContent = JSON.stringify(statistics, undefined, 2);
    }

    return el;
  }
})
