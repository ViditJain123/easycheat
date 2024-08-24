var init = true;

var url = "";
var currTab = null;
var tOld = null;
var twitterWin = null;
var apiUrl = "http://localhost:4000/upload"; // URL of your Express server

chrome.extension && chrome.extension.onMessage.addListener(function(image) {
  if (init) {
    init = false;
    document.getElementById('base').style.backgroundImage = 'url(' + image + ')';
    document.getElementById('cropped').style.backgroundImage = 'url(' + image + ')';
  } else {
    if (image.substring(0, 4) == "http") url = image;

    // Create an empty canvas element
    var l = parseInt($('#cropped').css('left'), 10);
    var t = parseInt($('#cropped').css('top'), 10);
    var w = parseInt($('#cropped').css('width'), 10);
    var h = parseInt($('#cropped').css('height'), 10);

    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    // Copy the image contents to the canvas
    var ctx = canvas.getContext('2d');
    var img = new Image();
    img.onload = async function() {
      ctx.drawImage(img, l, t, w, h, 0, 0, w, h);
      var pngDataUrl = canvas.toDataURL('image/png');
      await uploadImage(pngDataUrl);
    };
    img.src = image;
  }
});

async function uploadImage(dataUrl) {
  try {
    // Convert the Data URL to Blob
    var blob = await dataURLtoBlob(dataUrl);
    
    // Prepare FormData for the POST request
    var formData = new FormData();
    formData.append('profile', blob, 'image.png');
    
    // Send the image to the server
    var response = await fetch(apiUrl, {
      method: 'POST',
      body: formData
    });
    var result = await response.json();
    console.log(result);
    
    if (result.success) {
      console.log('Image uploaded successfully');
      // Optionally, you can open the URL of the uploaded image
      window.open(result.profile_url);
    } else {
      console.error('Image upload failed:', result.message);
    }
  } catch (error) {
    console.error('Error uploading image:', error);
  }
}

function dataURLtoBlob(dataURL) {
  var byteString = atob(dataURL.split(',')[1]);
  var mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
  
  var arrayBuffer = new ArrayBuffer(byteString.length);
  var uint8Array = new Uint8Array(arrayBuffer);
  
  for (var i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([uint8Array], { type: mimeString });
}

$(function() {
  $('a[href=#save]').click(function() {
    $('#toolbar').hide();
    chrome.extension.sendMessage({ action: 'capture' });
    return false;
  });
  $('a[href=#close]').click(function() {
    chrome.tabs.getCurrent(function(tab) {
      chrome.tabs.remove(tab.id);
    });
    return false;
  });
  $('.image').each(function() {
    var image = $(this);
    image
      .draggable({
        grid: [5, 5],
        containment: 'document'
      })
      .resizable({
        grid: [5, 5],
        containment: 'document',
        handles: 'n, e, s, w, ne, se, sw, nw'
      })
      .bind('drag', function(event, ui) {
        var left = ui.offset.left;
        var top = ui.offset.top;
        image.css({
          backgroundPosition: (left * -1) + 'px ' + (top * -1) + 'px'
        });
      })
      .bind('resize', function(event, ui) {
        var l = parseInt($(ui.element).css('left'), 10);
        var t = parseInt($(ui.element).css('top'), 10);
        var w = parseInt($(ui.element).css('width'), 10);
        var h = parseInt($(ui.element).css('height'), 10);
        $(ui.element).css({ backgroundPosition: (l * -1) + 'px ' + (t * -1) + 'px' });
        $('.dimensions', image).text(w + 'x' + h);
      });
  });
});
