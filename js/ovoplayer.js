function byId (id) {
  return document.getElementById(id)
}

function webSocketConnect () {
  if (typeof MozWebSocket != 'undefined') {
    socket = new MozWebSocket(get_appropriate_ws_url())
  } else {
    socket = new WebSocket(get_appropriate_ws_url())
  }

  try {
    socket.onopen = function () {
      connected()
    }
    socket.onmessage = function (msg) {
      handle_message(msg)
    }
    socket.onclose = function () {
      console.log('disconnected')
    }
  } catch (exception) {
    alert('<p>Error' + exception)
  }
}

function sendCommand (category, command, params) {
  var msg = category + ':' + command
  if (params)
    msg += '=' + params

  msg = encodeOvoLength(msg.length) + msg

  socket.send(msg)
}

function connected () {
  console.log('connected')
  sendCommand('cfg', 'keep')
  sendCommand('cfg', 'autopos')
  sendCommand('req', 'meta')
  sendCommand('req', 'coverurl')  
}

function get_appropriate_ws_url () {
  return 'ws://127.0.0.1:6860/player'
}

function decodeOvoLength (base64) {
  var binary_string = window.atob(base64)
  var len = binary_string.length
  var num = 0
  for (var i = 0; i < len; i++) {
    num = num | (binary_string.charCodeAt(i) << (len - i - 1) * 8)
  }
  return num
}

function encodeOvoLength (len) {
  var binary_string = ''
  for (var i = 0; i < 3; i++) {
    binary_string += String.fromCharCode(len >> ((2 - i) * 8) & 0xff)
  }
  return btoa(binary_string)
}

var ovoCommand = function () {
  this.size = 0
  this.category = ''
  this.command = ''
  this.param = ''
}

var ovoMeta = function () {
  this.ID = 0
  this.FileName = ''
  this.Album = ''
  this.AlbumArtist = ''
  this.Artist = ''
  this.Comment = ''
  this.Duration = 0
  this.Genre = ''
  this.Title = ''
  this.TrackString = ''
  this.Year = ''
}

function decodeMeta (meta) {
  var obj = new ovoMeta()
  var startpos = 4

  function extractfield () {
    len = decodeOvoLength(meta.substr(startpos, 4))
    startpos += 4
    var oldpos = startpos
    startpos += len
    return meta.substr(oldpos, len)
  }

  obj.ID = extractfield()
  obj.FileName = extractfield()
  obj.Album = extractfield()
  obj.AlbumArtist = extractfield()
  obj.Artist = extractfield()
  obj.Comment = extractfield()
  obj.Duration = extractfield()
  obj.Genre = extractfield()
  obj.Title = extractfield()
  obj.TrackString = extractfield()
  obj.Year = extractfield()
  return obj
}

function split_message (msg) {
  var obj = new ovoCommand()
  obj.size = decodeOvoLength(msg.substr(0, 4))

  /*var tokens = msg.slice(4).split(new RegExp('[:=](.+)', 'g'))
  obj.category = tokens[0]
  obj.command = tokens[1]
  obj.param = tokens[2]*/
  var colon =  msg.indexOf(':')
  obj.category = msg.slice(4, colon)
  var pos = msg.indexOf('=')
  if (pos > -1) {
    obj.command = msg.slice(colon + 1, pos)
    obj.param = msg.slice(pos+1)
  } else {
    obj.command = msg.slice(colon + 1)
  }

  return obj
}

function handle_message (msg) {
  if (msg.data.length == 0)
    return

  message = split_message(msg.data)

  switch (message.category) {
    case 'info':
      switch (message.command) {
        case 'pos':
          byId('songpos').value = message.param
          break
        case 'meta':
          var meta = decodeMeta(message.param)
          byId('songpos').max = meta.Duration
          byId('title').innerText = meta.Title
          byId('artist').innerText = meta.Artist
          byId('album').innerText = meta.Album          
          break
        case 'coverurl':
          byId('cover').src = message.param
          break
        case 'coverimg':
          byId('cover').src = "data:image/jpeg;base64, "+ message.param
          break  
            
      }
      break
  }
}
