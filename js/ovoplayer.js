function init() {
  if (localStorage) {
    var server = localStorage.getItem('server')
    var port = localStorage.getItem('port')
  }

  if (!server) {
    server = '127.0.0.1'
  }

  if (!port) {
    port = '6860'
  }
  if (localStorage) {
    localStorage.setItem('server', server)
    localStorage.setItem('port', port)
  }
  webSocketConnect(server, port)
}

function byId(id) {
  return document.getElementById(id)
}

function toast(message) {
  var x = byId('toast')
  x.innerText = message
  x.className = 'show'
  setTimeout(function () {
    x.className = x.className.replace('show', '')
  }, 4000)
}

function showinfo(message) {
  var x = byId('songinfo')
  x.className = 'show'
}
function closeinfo() {
  var x = byId('songinfo')
  x.className = x.className.replace('show', '')
}

function webSocketConnect(server, port) {
  if (typeof MozWebSocket != 'undefined') {
    socket = new MozWebSocket(get_appropriate_w_url(server, port))
  } else {
    socket = new WebSocket(get_appropriate_w_url(server, port))
  }

  try {
    socket.onopen = function () {
      toast('Connected')
      connected()
    }
    socket.onmessage = function (msg) {
      handle_message(msg)
    }
    socket.onclose = function () {
      toast('Disconnected')
      console.log('disconnected')
    }
  } catch (exception) {
    alert('<p>Error' + exception)
  }
}

function sendCommand(category, command, params) {
  var msg = category + ':' + command
  if (params)
    msg += '=' + params

  msg = encodeOvoLength(msg.length) + msg

  socket.send(msg)
}

function connected() {
  console.log('connected')
  sendCommand('cfg', 'keep')
  sendCommand('cfg', 'autopos')
  sendCommand('cfg', 'size', 1)
  sendCommand('req', 'state')
  sendCommand('req', 'meta')
  sendCommand('req', 'coverimg')
  sendCommand('req', 'vol')
  sendCommand('req', 'playlist')
  sendCommand('req', 'index')

}

function get_appropriate_w_url(server, port) {
  return 'ws://' + server + ':' + port + '/player'
}

function decodeOvoLength(base64) {
  var binary_string = window.atob(base64)
  var len = binary_string.length
  var num = 0
  for (var i = 0; i < len; i++) {
    num = num | (binary_string.charCodeAt(i) << (len - i - 1) * 8)
  }
  return num
}

function encodeOvoLength(len) {
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
  this.Index = 0
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

function decodeMeta(meta) {
  var obj = new ovoMeta()
  var startpos = 4

  function extractfield() {
    len = decodeOvoLength(meta.substr(startpos, 4))
    startpos += 4
    var oldpos = startpos
    startpos += len
    return meta.substr(oldpos, len)
  }
  obj.Index = extractfield()
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

function decodePlayList(meta) {
  var startpos = 4
  var objs = []

  var totlen = decodeOvoLength(meta.substr(0, 4))
  var count = meta.substr(4, totlen) * 1
  startpos += totlen

  while (count > 0) {
    var len = decodeOvoLength(meta.substr(startpos, 4))
    objs.push(decodeMeta(meta.substr(startpos, len)))
    startpos += (len + 4)
    count -= 1
  }
  return objs
}

function split_message(msg) {
  var obj = new ovoCommand()
  obj.size = decodeOvoLength(msg.substr(0, 4))

  var colon = msg.indexOf(':')
  obj.category = msg.slice(4, colon)
  var pos = msg.indexOf('=')
  if (pos > -1) {
    obj.command = msg.slice(colon + 1, pos)
    obj.param = msg.slice(pos + 1)
  } else {
    obj.command = msg.slice(colon + 1)
  }

  return obj
}

function msToTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = parseInt((duration / 1000) % 60),
    minutes = parseInt((duration / (1000 * 60)) % 60),
    hours = parseInt((duration / (1000 * 60 * 60)) % 24)

  if (hours > 0) {
    hours = hours + ':'
    minutes = (minutes < 10) ? '0' + minutes : minutes
  } else {
    hours = ''
  }
  seconds = (seconds < 10) ? '0' + seconds : seconds

  return hours + minutes + ':' + seconds
}

function handle_message(msg) {
  if (msg.data.length == 0)
    return

  message = split_message(msg.data)

  switch (message.category) {
    case 'info':
      switch (message.command) {
        case 'pos':
          byId('songpos').value = message.param
          byId('textPos').innerText = msToTime(message.param)
          break
        case 'vol':
          byId('volume').value = message.param
          break
        case 'meta':
          var meta = decodeMeta(message.param)

          if (meta.Index == -1) {
            byId('songpos').max = meta.Duration
            byId('title').innerText = meta.Title
            byId('artist').innerText = meta.Artist
            byId('album').innerText = meta.Album
            byId('textDuration').innerText = msToTime(meta.Duration)
          }
          byId('i_tile').innerText = meta.Title
          byId('i_album').innerText = meta.Album
          byId('i_albumartist').innerText = meta.AlbumArtist
          byId('i_artist').innerText = meta.Artist
          byId('i_track').innerText = meta.TrackString
          byId('i_genre').innerText = meta.Genre
          byId('i_year').innerText = meta.Year
          byId('i_Comment').innerText = meta.Comment
          break
        case 'coverurl':
        case 'coverimg':
          if (message.param === "")
            byId('cover').src = 'asset/nocover.png'
          else
            byId('cover').src = message.param
          break
        case 'playlist':
          var playlist = decodePlayList(message.param)
          var tableObj = byId('pl-data')
          tableObj.innerText = ''
          for (var i = 0; i < playlist.length; i++) {
            var row = tableObj.insertRow(-1)
            var c0 = row.insertCell(0)
            c0.innerText = playlist[i].Title
            var c1 = row.insertCell(1)
            c1.innerText = playlist[i].Artist
            var c2 = row.insertCell(2)
            c2.innerText = msToTime(playlist[i].Duration)
            var ci = row.insertCell(3)
            ci.innerHTML = '<i class="ico-info-circled"></i>'
            ci.onclick = (function () {
              return function () {
                sendCommand('req', 'meta', this.parentElement.rowIndex)
                showinfo()
              }
            })()
            /*     row.onclick = (function () {
                  return function () {
                    sendCommand('action', 'play', this.rowIndex - 1)
                  }
                })()*/
          }
          break
        case 'state':
          byId('playbtn').classList.remove('ico-play', 'ico-pause')
          switch (message.param) {
            case '0':
              byId('plstate').className = 'ico-stop'
              byId('playbtn').classList.add('ico-play')
              break
            case '1':
              byId('plstate').className = 'ico-play'
              byId('playbtn').classList.add('ico-pause')
              sendCommand('req', 'meta')
              sendCommand('req', 'coverimg')
              break
            case '2':
              byId('plstate').className = 'ico-stop'
              byId('playbtn').classList.add('ico-play')
              break

          }
          break
        case 'index':
          var trele = byId('tabpl').getElementsByTagName('TR')
          for (var i = 0; i < trele.length; i++) {
            trele[i].classList.remove('selected')
          }
          if (trele.length > 1) {
            trele[message.param].classList.add('selected')
            // trele[message.param].scrollIntoView([])
          }
          break
        case 'plchange':
          sendCommand('req', 'playlist')
          sendCommand('req', 'index')
          break
      }
      break
  }
}

function setVolume() {
  sendCommand('action', 'vol', byId('volume').value)
}

function seek() {
  sendCommand('action', 'seek', byId('songpos').value)
}