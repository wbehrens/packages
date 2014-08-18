define(function () {
  return function (canvas, min, max, holdtime) {
    var i = 0;
    var v = null;

    var ctx = canvas.getContext('2d');
    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height;
    var canvasData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

    var graphWidth = canvasWidth - 20;
    
    window.requestAnimationFrame(step);
    
    var last = 0;

    var fadei = 0;
    var peakHold = null;
    var peakTime = null;

    function peak() {
      if (v != null)
        if (peakHold == null || v > peakHold) {
          peakHold = v;
          peakTime = new Date().getTime();
        }

      ctx.fillStyle = "#13B6F4";
      ctx.clearRect(0, 0, 18, canvasHeight);

      if (v) {
        var x = Math.round(scale(v, min, max, canvasHeight));
        ctx.fillRect(0, x, 18, canvasHeight);
      }

      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, Math.round(scale(peakHold, min, max, canvasHeight)) - 2, 18, 2);
    }

    function step(timestamp) {
      var delta = timestamp - last;
      
      if (delta > 20) {
        draw();
        fadei++;
        if (fadei > 2) {
          fade();
          fadei = 0;
        }

        var peakAge = (new Date().getTime()) - peakTime

        if (peakAge > holdtime*1000)
          peakHold = null;

        peak();

        last = timestamp;
      }
      
      window.requestAnimationFrame(step);
    }

    function draw() {
      ctx.save();
      ctx.rect(20, 0, canvasWidth, canvasHeight);
      ctx.clip();
      var x = Math.round(scale(v, min, max, canvasHeight));
      if (x)
        drawPixel(i + 20, x);

      ctx.restore();

      i = (i + 1) % graphWidth;
    }
    
    function drawPixel (x, y) {
      var radius = 1.5;
      ctx.save();
      ctx.fillStyle = "#13B6F4";
      ctx.shadowBlur = 15; 
      ctx.shadowColor = "#13B6F4";    
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();

      ctx.arc(x, y, radius, 0, Math.PI * 2, false);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    
    function fade() {
      var lastImage = ctx.getImageData(19, 0, graphWidth + 1, canvasHeight);
      var pixelData = lastImage.data;
      
      for (var i = 0; i < pixelData.length; i += 4) {
        pixelData[i+3] -= 2;
      }

      ctx.putImageData(lastImage, 19, 0);
    }

    function scale(n, min, max, height) {
      return (1 - (n-min)/(max-min)) * height; 
    }
    
    return function (n) {
      v = n;
    }
  }
})
