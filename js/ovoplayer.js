function webSocketConnect() {
  if (typeof MozWebSocket != 'undefined') {
    socket = new MozWebSocket(get_appropriate_ws_url())
  } else {
    socket = new WebSocket(get_appropriate_ws_url())
  }

  try {
    socket.onopen = function() {
      connected()
    }
    socket.onmessage = function(msg) {
      handle_message(msg)
    }
    socket.onclose = function() {
      console.log('disconnected')
    }
  } catch (exception) {
    alert('<p>Error' + exception)
  }
}

function connected() {
  console.log('connected')
  socket.send('xxxxcfg:keep')
  socket.send('xxxxcfg:autopos')
}

function get_appropriate_ws_url() {
  return 'ws://127.0.0.1:6860/player'
}

function decodeOvoLength(base64) {
  var binary_string = window.atob(base64);
  var len = binary_string.length;
  var num = 0;
  for (var i = 0; i < len; i++) {
    num = num | (binary_string.charCodeAt(i) << (len - i - 1) * 8);
  }
  return num
}

var ovoCommand = function() {
  this.size = 0
  this.category = ""
  this.command = ""
  this.param = ""
}

function split_message(msg) {
  var obj = new ovoCommand();
  obj.size = decodeOvoLength(msg.substr(0, 4))

  var tokens = msg.slice(4).split(new RegExp('[:=]', 'g'));
  obj.category = tokens[0]
  obj.command = tokens[1]
  obj.param = tokens[2]
    /* obj.category = msg.slice(4, msg.indexOf(":"))
     obj.command = msg.slice(msg.indexOf(":")+1, msg.indexOf("="))
     obj.param = msg.slice(msg.indexOf("=")+1)*/
  return obj

}

function handle_message(msg) {
  if (msg.data.length == 0)
    return;

  message = split_message(msg.data)
  console.log(message)


}