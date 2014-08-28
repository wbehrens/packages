"use strict";
define(function () {
  return function (menu) {
    function noScroll(e) {
      e.preventDefault();
    }
    return function (e) {
      var background = document.createElement("div");
      background.className = "menu-background";
      document.body.appendChild(background);
      document.body.classList.add("noscroll");
      document.body.addEventListener('touchmove', noScroll);

      var offset = this.getBoundingClientRect();
      var container = document.createElement("ul");
      container.className = "menu";
      container.style.top = offset.top + "px";
      container.style.left = offset.left + "px";

      background.onclick = destroy;

      menu.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item[0];
        li.action = item[1];
        li.onclick = function () {
          destroy();
          this.action();
        }

        container.appendChild(li);
      });

      document.body.appendChild(container);

      function destroy() {
        document.body.classList.remove("noscroll");
        document.body.removeEventListener('touchmove', noScroll);
        document.body.removeChild(background);
        document.body.removeChild(container);
      }
    }
  }
})
