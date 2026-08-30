function init() {
  var params = loadParams()
  webSocketConnect(params.server, params.port, params.useSSL)
}

function saveParams() {
  if (localStorage) {
    localStorage.setItem('server', byId('server').value)
    localStorage.setItem('port', byId('port').value)
    localStorage.setItem('useSSL', byId('SSL').checked)
    init()
  }

}

function loadParams() {
  if (localStorage) {
    server = localStorage.getItem('server')
    port = localStorage.getItem('port')
    useSSL = localStorage.getItem('useSSL')
  }

  if (!server) {
    server = '127.0.0.1'
  }

  if (!port) {
    port = '6860'
  }

  if (!useSSL) {
    useSSL = false
  } else {
    useSSL = useSSL === 'true'
  }

  if (localStorage) {
    localStorage.setItem('server', server)
    localStorage.setItem('port', port)
    localStorage.setItem('useSSL', useSSL)
  }

  byId('server').value = server
  byId('port').value = port
  byId('SSL').checked = useSSL
  return { server, port, useSSL }

}

// Simple element cache to avoid repeated document.getElementById lookups
var _elCache = Object.create(null)
function byId(id) {
  // return cached element if present
  var el = _elCache[id]
  if (el) return el
  el = document.getElementById(id)
  // cache only if exists
  if (el) _elCache[id] = el
  return el
}

function toast(message) {
  var x = byId('toast')
  if (!x) return
  x.innerText = message
  x.classList.add('show')
  setTimeout(function() {
    x.classList.remove('show')
  }, 4000)
}

function openImg(src) {
  var newTab = window.open()
  newTab.document.body.innerHTML = '<img src="' + src + '">'
  //  window.open(largeImgSrc, "title here", "width=400, height=300")
  return false
}

function showbox(id) {
  var x = byId(id)
  if (x) x.classList.add('show')
}

function closebox(id) {
  var x = byId(id)
  if (x) x.className = x.className.replace('show', '')
}

function webSocketConnect(server, port, useSSL) {
  if (typeof MozWebSocket != 'undefined') {
    socket = new MozWebSocket(get_appropriate_w_url(server, port, useSSL))
  } else {
    socket = new WebSocket(get_appropriate_w_url(server, port, useSSL))
  }

  try {
    socket.onopen = function() {
      toast('Connected')
      connected()
    }
    socket.onmessage = function(msg) {
      handle_message(msg)
    }
    socket.onclose = function() {
      toast('Connection lost: retrying in 5 seconds')
      console.log('disconnected')
      setTimeout(function() {
        var params = loadParams()
        webSocketConnect(params.server, params.port, params.useSSL)
      }, 5000)
    }
  } catch (exception) {
    alert('<p>Error' + exception)
  }
}

function sendCommand(category, command, params) {
  var msg = category + ':' + command
  if (!(params == null)) msg += '=' + params

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
  sendCommand('req', 'mute')
  sendCommand('req', 'playlist')
  sendCommand('req', 'index')
  sendCommand('req', 'loop')
}

function get_appropriate_w_url(server, port, useSSL) {
  var protocol = useSSL ? 'wss://' : 'ws://'
  return protocol + server + ':' + port + '/player'
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

var ovoCommand = function() {
  this.size = 0
  this.category = ''
  this.command = ''
  this.param = ''
}

var ovoMeta = function() {
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
  if (msg.data.length == 0) return

  var message = split_message(msg.data)

  switch (message.category) {
    case 'inf':
      switch (message.command) {
        case 'pos': {
          var songpos = byId('songpos')
          var textPos = byId('textPos')
          if (songpos) songpos.value = message.param
          if (textPos) textPos.innerText = msToTime(message.param)
        }
        break
        case 'vol': {
          var volume = byId('volume')
          if (volume) volume.value = message.param
        }
        break
        case 'mute':
          toggleMute(message.param)
          break

        case 'meta': {
          var meta = decodeMeta(message.param)

          if (meta.Index == -1) {
            var songpos = byId('songpos')
            if (songpos) songpos.max = meta.Duration
            var title = byId('title')
            if (title) title.innerText = meta.Title
            var artist = byId('artist')
            if (artist) artist.innerText = meta.Artist
            var album = byId('album')
            if (album) album.innerText = meta.Album
            var textDuration = byId('textDuration')
            if (textDuration) textDuration.innerText = msToTime(meta.Duration)
          }
          var i_tile = byId('i_tile')
          if (i_tile) i_tile.innerText = meta.Title
          var i_album = byId('i_album')
          if (i_album) i_album.innerText = meta.Album
          var i_albumartist = byId('i_albumartist')
          if (i_albumartist) i_albumartist.innerText = meta.AlbumArtist
          var i_artist = byId('i_artist')
          if (i_artist) i_artist.innerText = meta.Artist
          var i_track = byId('i_track')
          if (i_track) i_track.innerText = meta.TrackString
          var i_genre = byId('i_genre')
          if (i_genre) i_genre.innerText = meta.Genre
          var i_year = byId('i_year')
          if (i_year) i_year.innerText = meta.Year
          var i_Comment = byId('i_Comment')
          if (i_Comment) i_Comment.innerText = meta.Comment
        }
        break
        case 'coverurl':
        case 'coverimg': {
          var cover = byId('cover')
          if (cover) cover.src = (message.param === '') ? 'asset/nocover.png' : message.param
        }
        break
        case 'playlist': {
          var playlist = decodePlayList(message.param)
          var tableObj = byId('pl-data')
          if (!tableObj) break
          tableObj.innerText = ''
          for (var i = 0; i < playlist.length; i++) {
            var row = tableObj.insertRow(-1)
            var c0 = row.insertCell(0)
            c0.innerText = playlist[i].Title
            c0.setAttribute('data-title', playlist[i].Title)
            var c1 = row.insertCell(1)
            c1.innerText = playlist[i].Artist
            c1.setAttribute('data-title', playlist[i].Artist)
            var c2 = row.insertCell(2)
            c2.innerText = msToTime(playlist[i].Duration)
            var ci = row.insertCell(3)
            ci.innerHTML = '<i class="ico-info-circled"></i>'
            c0.onclick = (function() {
              return function() {
                sendCommand('act', 'play', this.parentElement.rowIndex - 1)
              }
            })()
            ci.onclick = (function() {
              return function() {
                sendCommand('req', 'meta', this.parentElement.rowIndex)
                showbox('songinfo')
              }
            })()
          }
        }
        break
        case 'state': {
          var playbtn = byId('playbtn')
          var plstate = byId('plstate')
          if (playbtn) playbtn.classList.remove('ico-play', 'ico-pause')
          switch (message.param) {
            case '0':
              if (plstate) plstate.className = 'ico-stop'
              if (playbtn) playbtn.classList.add('ico-play')
              break
            case '1':
              if (plstate) plstate.className = 'ico-play'
              if (playbtn) playbtn.classList.add('ico-pause')
              sendCommand('req', 'meta')
              sendCommand('req', 'coverimg')
              break
            case '2':
              if (plstate) plstate.className = 'ico-pause'
              if (playbtn) playbtn.classList.add('ico-play')
              break
          }
        }
        break
        case 'loop': {
          var radios = byId('loopctrl') && byId('loopctrl').getElementsByTagName('input')
          if (!radios) break
          for (var i = 0; i < radios.length; i++) {
            if ((radios[i].type === 'radio') && (radios[i].value == message.param)) radios[i].checked = true
            else radios[i].checked = false
          }
        }
        break
        case 'index': {
          var tabpl = byId('tabpl')
          if (!tabpl) break
          var trele = tabpl.getElementsByTagName('tr')
          for (var i = 0; i < trele.length; i++) {
            trele[i].classList.remove('selected')
          }
          if (trele.length > 1) {
            trele[message.param].classList.add('selected')
            // trele[message.param].scrollIntoView([])
          }
        }
        break
      }
      break
    case 'app':
      switch (message.command) {
        case 'plchange':
          sendCommand('req', 'playlist')
          sendCommand('req', 'index')
          break
      }

      break
  }
}

function toggleMute(gui) {
  var muteEl = byId('mute')
  if (!muteEl) return
  if (gui == 0) {
    muteEl.classList.remove('ico-volume-off')
    muteEl.classList.add('ico-volume-up')
  } else if (gui == 1) {
    muteEl.classList.remove('ico-volume-up')
    muteEl.classList.add('ico-volume-off')
  } else {
    if (muteEl.classList.contains('ico-volume-off')) sendCommand('act', 'unmute')
    else sendCommand('act', 'mute')
  }
}

function setVolume() {
  var volume = byId('volume')
  if (!volume) return
  sendCommand('act', 'vol', volume.value)
}

function loopChange(looping) {
  sendCommand('act', 'loop', looping.value)
}

function seek() {
  var songpos = byId('songpos')
  if (!songpos) return
  sendCommand('act', 'seek', songpos.value)
}
