define(function () {
  function get(url) {
    return new Promise(function(resolve, reject) {
      var req = new XMLHttpRequest();
      req.open('GET', url);

      req.onload = function() {
        if (req.status == 200) {
          resolve(req.response);
        }
        else {
          reject(Error(req.statusText));
        }
      };

      req.onerror = function() {
        reject(Error("Network Error"));
      };

      req.send();
    });
  }

  function getJSON(url) {
    return get(url).then(JSON.parse);
  }

  function buildUrl(ip, object, param) {
    var url = "http://[" + ip + "]/cgi-bin/" + object;
    if (param) url += "?" + param;

    return url;
  }

  function request(ip, object, param) {
    return getJSON(buildUrl(ip, object, param));
  }

  return { buildUrl: buildUrl
         , request: request
         , getJSON: getJSON
         }
})
