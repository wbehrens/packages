"use strict";
define(["lib/helper"], function (Helper) {
  return function (stream) {
    var el = document.createElement("pre");

    var stopStream = stream.onValue(update);

    function update(statistics) {
      el.textContent = JSON.stringify(statistics, undefined, 2);
    }

    function destroy() {
      stopStream();
    }

    return { title: document.createTextNode("Statistik")
           , content: el
           , destroy: destroy
           }
  }
})
