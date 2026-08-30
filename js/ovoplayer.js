var params;

function init() {
  params = loadParams()
  webSocketConnect(params.server, params.port, params.useSSL)
}

function saveParams() {
  if (localStorage) {
    localStorage.setItem('server', byId('server').value)
    localStorage.setItem('port', byId('port').value)
    localStorage.setItem('useSSL', String(byId('SSL').checked))
    closebox('setup') 
    init()
  }

}

function loadParams() {
  let server, port, useSSL
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
    localStorage.setItem('useSSL', String(useSSL))
  }

  const sEl = byId('server')
  const pEl = byId('port')
  const sslEl = byId('SSL')
  if (sEl) sEl.value = server
  if (pEl) pEl.value = port
  if (sslEl) sslEl.checked = useSSL
  return { server, port, useSSL }

}

// Simple element cache to avoid repeated document.getElementById lookups
let _elCache = Object.create(null)
function byId(id) {
  // return cached element if present
  const el = _elCache[id]
  if (el) return el
  const found = document.getElementById(id)
  // cache only if exists
  if (found) _elCache[id] = found
  return found
}

function clearElCache() {
  _elCache = Object.create(null)
}
// expose for environments that may rebuild parts of the DOM
window.clearElCache = clearElCache

function toast(message) {
  const x = byId('toast')
  if (!x) return
  x.textContent = message
  x.classList.add('show')
  setTimeout(function() {
    x.classList.remove('show')
  }, 4000)
}

function openImg(src) {
  const newTab = window.open()
  if (!newTab) return false
  const img = newTab.document.createElement('img')
  img.src = src
  newTab.document.body.appendChild(img)
  //  window.open(largeImgSrc, "title here", "width=400, height=300")
  return false
}

function showbox(id) {
  const dlg = byId(id)
  if (dlg) dlg.classList.add('show')
}

function closebox(id) {
  const dlg = byId(id)
  if (dlg) dlg.className = dlg.className.replace('show', '')
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
        webSocketConnect(params.server, params.port, params.useSSL)
      }, 5000)
    }
  } catch (exception) {
    alert('<p>Error' + exception)
  }
}

function sendCommand(category, command, params) {
  let msg = category + ':' + command
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
  const protocol = useSSL ? 'wss://' : 'ws://'
  return protocol + server + ':' + port + '/player'
}

function decodeOvoLength(base64) {
  const binary_string = window.atob(base64)
  const len = binary_string.length
  let num = 0
  for (let i = 0; i < len; i++) {
    num = num | (binary_string.charCodeAt(i) << (len - i - 1) * 8)
  }
  return num
}

function encodeOvoLength(len) {
  let binary_string = ''
  for (let i = 0; i < 3; i++) {
    binary_string += String.fromCharCode((len >> ((2 - i) * 8)) & 0xff)
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
  const obj = new ovoMeta()
  let startpos = 4

  function extractfield() {
    const len = decodeOvoLength(meta.substr(startpos, 4))
    startpos += 4
    const oldpos = startpos
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
  let startpos = 4
  const objs = []

  const totlen = decodeOvoLength(meta.substr(0, 4))
  let count = meta.substr(4, totlen) * 1
  startpos += totlen

  while (count > 0) {
    const len = decodeOvoLength(meta.substr(startpos, 4))
    objs.push(decodeMeta(meta.substr(startpos, len)))
    startpos += (len + 4)
    count -= 1
  }
  return objs
}

function split_message(msg) {
  const obj = new ovoCommand()
  obj.size = decodeOvoLength(msg.substr(0, 4))

  const colon = msg.indexOf(':')
  obj.category = msg.slice(4, colon)
  const pos = msg.indexOf('=')
  if (pos > -1) {
    obj.command = msg.slice(colon + 1, pos)
    obj.param = msg.slice(pos + 1)
  } else {
    obj.command = msg.slice(colon + 1)
  }

  return obj
}

function msToTime(duration) {
  // keep integer parsing for legacy numbers
  const milliseconds = parseInt((duration % 1000) / 100)
  const seconds = parseInt((duration / 1000) % 60)
  const minutes = parseInt((duration / (1000 * 60)) % 60)
  const hours = parseInt((duration / (1000 * 60 * 60)) % 24)

  let h = ''
  let m = minutes
  let s = seconds

  if (hours > 0) {
    h = hours + ':'
    m = (m < 10) ? '0' + m : m
  }
  s = (s < 10) ? '0' + s : s

  return h + m + ':' + s
}

function handle_message(msg) {
  if (msg.data.length == 0) return

  const message = split_message(msg.data)

  switch (message.category) {
    case 'inf':
      switch (message.command) {
        case 'pos': {
          const songpos = byId('songpos')
          const textPos = byId('textPos')
          if (songpos) songpos.value = message.param
          if (textPos) textPos.textContent = msToTime(message.param)
        }
        break
        case 'vol': {
          const volume = byId('volume')
          if (volume) volume.value = message.param
        }
        break
        case 'mute':
          toggleMute(message.param)
          break

        case 'meta': {
          const meta = decodeMeta(message.param)

          if (meta.Index == -1) {
            const songpos = byId('songpos')
            if (songpos) songpos.max = meta.Duration
            const title = byId('title')
            if (title) title.textContent = meta.Title
            const artist = byId('artist')
            if (artist) artist.textContent = meta.Artist
            const album = byId('album')
            if (album) album.textContent = meta.Album
            const textDuration = byId('textDuration')
            if (textDuration) textDuration.textContent = msToTime(meta.Duration)
          }
          const i_tile = byId('i_tile')
          if (i_tile) i_tile.textContent = meta.Title
          const i_album = byId('i_album')
          if (i_album) i_album.textContent = meta.Album
          const i_albumartist = byId('i_albumartist')
          if (i_albumartist) i_albumartist.textContent = meta.AlbumArtist
          const i_artist = byId('i_artist')
          if (i_artist) i_artist.textContent = meta.Artist
          const i_track = byId('i_track')
          if (i_track) i_track.textContent = meta.TrackString
          const i_genre = byId('i_genre')
          if (i_genre) i_genre.textContent = meta.Genre
          const i_year = byId('i_year')
          if (i_year) i_year.textContent = meta.Year
          const i_Comment = byId('i_Comment')
          if (i_Comment) i_Comment.textContent = meta.Comment
        }
        break
        case 'coverurl':
        case 'coverimg': {
          const cover = byId('cover')
          if (cover) cover.src = (message.param === '') ? 'asset/nocover.png' : message.param
        }
        break
        case 'playlist': {
          const playlist = decodePlayList(message.param)
          const tableObj = byId('pl-data')
          if (!tableObj) break
          tableObj.textContent = ''
          for (let i = 0; i < playlist.length; i++) {
            const row = tableObj.insertRow(-1)
            const c0 = row.insertCell(0)
            c0.textContent = playlist[i].Title
            c0.setAttribute('data-title', playlist[i].Title)
            const c1 = row.insertCell(1)
            c1.textContent = playlist[i].Artist
            c1.setAttribute('data-title', playlist[i].Artist)
            const c2 = row.insertCell(2)
            c2.textContent = msToTime(playlist[i].Duration)
            const ci = row.insertCell(3)
            // create icon element instead of innerHTML
            const icon = document.createElement('i')
            icon.className = 'ico-info-circled'
            ci.appendChild(icon)
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
          const playbtn = byId('playbtn')
          const plstate = byId('plstate')
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
          const loopctrl = byId('loopctrl')
          const radios = loopctrl && loopctrl.getElementsByTagName('input')
          if (!radios) break
          for (let i = 0; i < radios.length; i++) {
            if ((radios[i].type === 'radio') && (radios[i].value == message.param)) radios[i].checked = true
            else radios[i].checked = false
          }
        }
        break
        case 'index': {
          const tabpl = byId('tabpl')
          if (!tabpl) break
          const trele = tabpl.getElementsByTagName('tr')
          for (let i = 0; i < trele.length; i++) {
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
  const muteEl = byId('mute')
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
  const volume = byId('volume')
  if (!volume) return
  sendCommand('act', 'vol', volume.value)
}

function loopChange(looping) {
  sendCommand('act', 'loop', looping.value)
}

function seek() {
  const songpos = byId('songpos')
  if (!songpos) return
  sendCommand('act', 'seek', songpos.value)
}
