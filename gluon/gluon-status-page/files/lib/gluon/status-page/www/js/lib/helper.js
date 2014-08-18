define(function () {
  function buildUrl(ip, object, param) {
    var url = "http://[" + ip + "]/cgi-bin/" + object;
    if (param) url += "?" + param;

    return url;
  }
  return { buildUrl: buildUrl
         }
})
