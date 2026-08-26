// Optimized ovoplayer client: cached DOM refs, playlist batching, throttled updates, debounced volume

var socket;
var elSongPos, elTextPos, elTitle, elArtist, elAlbum, elCover, plTableBody, tabPl, elVolume, elMute, elPlayBtn, elLoopCtrl;
var posPending = null;
var posFrameRequested = false;
var volumeTimer = null;

function init() {
  var params = loadParams();

  // cache frequently used elements
  elSongPos = byId('songpos');
  elTextPos = byId('textPos');
  elTitle = byId('title');
  elArtist = byId('artist');
  elAlbum = byId('album');
  elCover = byId('cover');
  plTableBody = byId('pl-data');
  tabPl = byId('tabpl');
  elVolume = byId('volume');
  elMute = byId('mute');
  elPlayBtn = byId('playbtn');
  elLoopCtrl = byId('loopctrl');

  // event delegation for playlist clicks
  if (tabPl) {
    tabPl.addEventListener('click', function(e) {
      var tr = e.target.closest && e.target.closest('tr');
      if (!tr) return;
      var idx = parseInt(tr.dataset.index, 10);
      if (isNaN(idx)) return;
      if (e.target.closest && e.target.closest('.ico-info-circled')) {
        sendCommand('req', 'meta', idx);
        showbox('songinfo');
      } else {
        sendCommand('act', 'play', idx);
      }
    });
  }

  webSocketConnect(params.server, params.port, params.useSSL);
}

function saveParams() {
  if (localStorage) {
    localStorage.setItem('server', byId('server').value);
    localStorage.setItem('port', byId('port').value);
    localStorage.setItem('useSSL', byId('SSL').checked);
    init();
  }
}

function loadParams() {
  var server, port, useSSL;
  if (localStorage) {
    server = localStorage.getItem('server');
    port = localStorage.getItem('port');
    useSSL = localStorage.getItem('useSSL');
  }

  if (!server) server = '127.0.0.1';
  if (!port) port = '6860';
  if (!useSSL) useSSL = false;
  else useSSL = useSSL === 'true';

  if (localStorage) {
    localStorage.setItem('server', server);
    localStorage.setItem('port', port);
    localStorage.setItem('useSSL', useSSL);
  }

  try { if (byId('server')) byId('server').value = server; } catch(e){}
  try { if (byId('port')) byId('port').value = port; } catch(e){}
  try { if (byId('SSL')) byId('SSL').checked = useSSL; } catch(e){}
  return { server: server, port: port, useSSL: useSSL };
}

function byId(id) { return document.getElementById(id); }

function toast(message) {
  var x = byId('toast');
  if (!x) return;
  x.textContent = message;
  x.classList.add('show');
  setTimeout(function() { x.classList.remove('show'); }, 4000);
}

function openImg(src) {
  var newTab = window.open();
  if (!newTab) return false;
  newTab.document.body.innerHTML = '<img src="' + src + '">';
  return false;
}

function showbox(id) { var x = byId(id); if (x) x.classList.add('show'); }
function closebox(id) { var x = byId(id); if (x) x.className = x.className.replace('show', ''); }

function webSocketConnect(server, port, useSSL) {
  if (typeof MozWebSocket != 'undefined') {
    socket = new MozWebSocket(get_appropriate_w_url(server, port, useSSL));
  } else {
    socket = new WebSocket(get_appropriate_w_url(server, port, useSSL));
  }

  try {
    socket.onopen = function() { toast('Connected'); connected(); };
    socket.onmessage = function(msg) { handle_message(msg); };
    socket.onclose = function() {
      toast('Connection lost: retrying in 5 seconds');
      console.log('disconnected');
      setTimeout(function() {
        var params = loadParams();
        webSocketConnect(params.server, params.port, params.useSSL);
      }, 5000);
    };
  } catch (exception) {
    alert('<p>Error' + exception);
  }
}

function sendCommand(category, command, params) {
  var msg = category + ':' + command;
  if (!(params == null)) msg += '=' + params;
  msg = encodeOvoLength(msg.length) + msg;
  if (socket && socket.readyState === WebSocket.OPEN) socket.send(msg);
}

function connected() {
  console.log('connected');
  sendCommand('cfg', 'keep');
  sendCommand('cfg', 'autopos');
  sendCommand('cfg', 'size', 1);
  sendCommand('req', 'state');
  sendCommand('req', 'meta');
  sendCommand('req', 'coverimg');
  sendCommand('req', 'vol');
  sendCommand('req', 'mute');
  sendCommand('req', 'playlist');
  sendCommand('req', 'index');
  sendCommand('req', 'loop');
}

function get_appropriate_w_url(server, port, useSSL) { var protocol = useSSL ? 'wss://' : 'ws://'; return protocol + server + ':' + port + '/player'; }

function decodeOvoLength(base64) {
  var binary_string = window.atob(base64);
  var len = binary_string.length;
  var num = 0;
  for (var i = 0; i < len; i++) {
    num = num | (binary_string.charCodeAt(i) << (len - i - 1) * 8);
  }
  return num;
}

function encodeOvoLength(len) {
  var binary_string = '';
  for (var i = 0; i < 3; i++) {
    binary_string += String.fromCharCode((len >> ((2 - i) * 8)) & 0xff);
  }
  return btoa(binary_string);
}

var ovoCommand = function() { this.size = 0; this.category = ''; this.command = ''; this.param = ''; };
var ovoMeta = function() {
  this.Index = 0; this.ID = 0; this.FileName = ''; this.Album = ''; this.AlbumArtist = ''; this.Artist = '';
  this.Comment = ''; this.Duration = 0; this.Genre = ''; this.Title = ''; this.TrackString = ''; this.Year = '';
};

function decodeMeta(meta) {
  var obj = new ovoMeta();
  var startpos = 4;
  function extractfield() {
    var len = decodeOvoLength(meta.substr(startpos, 4));
    startpos += 4;
    var oldpos = startpos;
    startpos += len;
    return meta.substr(oldpos, len);
  }
  obj.Index = extractfield();
  obj.ID = extractfield();
  obj.FileName = extractfield();
  obj.Album = extractfield();
  obj.AlbumArtist = extractfield();
  obj.Artist = extractfield();
  obj.Comment = extractfield();
  obj.Duration = extractfield();
  obj.Genre = extractfield();
  obj.Title = extractfield();
  obj.TrackString = extractfield();
  obj.Year = extractfield();
  return obj;
}

function decodePlayList(meta) {
  var startpos = 4;
  var objs = [];
  var totlen = decodeOvoLength(meta.substr(0, 4));
  var count = meta.substr(4, totlen) * 1;
  startpos += totlen;
  while (count > 0) {
    var len = decodeOvoLength(meta.substr(startpos, 4));
    objs.push(decodeMeta(meta.substr(startpos, len)));
    startpos += (len + 4);
    count -= 1;
  }
  return objs;
}

function split_message(msg) {
  var obj = new ovoCommand();
  obj.size = decodeOvoLength(msg.substr(0, 4));
  var colon = msg.indexOf(':');
  obj.category = msg.slice(4, colon);
  var pos = msg.indexOf('=');
  if (pos > -1) { obj.command = msg.slice(colon + 1, pos); obj.param = msg.slice(pos + 1); }
  else { obj.command = msg.slice(colon + 1); }
  return obj;
}

function msToTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100), seconds = parseInt((duration / 1000) % 60), minutes = parseInt((duration / (1000 * 60)) % 60), hours = parseInt((duration / (1000 * 60 * 60)) % 24);
  if (hours > 0) { hours = hours + ':'; minutes = (minutes < 10) ? '0' + minutes : minutes; } else { hours = ''; }
  seconds = (seconds < 10) ? '0' + seconds : seconds;
  return hours + minutes + ':' + seconds;
}

function schedulePosUpdate(value) {
  posPending = value;
  if (!posFrameRequested) {
    posFrameRequested = true;
    requestAnimationFrame(function() {
      if (elSongPos) elSongPos.value = posPending;
      if (elTextPos) elTextPos.textContent = msToTime(posPending);
      posFrameRequested = false;
    });
  }
}

function handle_message(msg) {
  if (!msg || !msg.data || msg.data.length == 0) return;
  var message = split_message(msg.data);
  switch (message.category) {
    case 'inf':
      switch (message.command) {
        case 'pos':
          schedulePosUpdate(message.param);
          break;
        case 'vol':
          if (elVolume) elVolume.value = message.param;
          break;
        case 'mute':
          toggleMute(message.param);
          break;
        case 'meta':
          var meta = decodeMeta(message.param);
          if (meta.Index == -1) {
            if (elSongPos) elSongPos.max = meta.Duration;
            if (elTitle) elTitle.textContent = meta.Title;
            if (elArtist) elArtist.textContent = meta.Artist;
            if (elAlbum) elAlbum.textContent = meta.Album;
            if (byId('textDuration')) byId('textDuration').textContent = msToTime(meta.Duration);
          }
          if (byId('i_tile')) byId('i_tile').textContent = meta.Title;
          if (byId('i_album')) byId('i_album').textContent = meta.Album;
          if (byId('i_albumartist')) byId('i_albumartist').textContent = meta.AlbumArtist;
          if (byId('i_artist')) byId('i_artist').textContent = meta.Artist;
          if (byId('i_track')) byId('i_track').textContent = meta.TrackString;
          if (byId('i_genre')) byId('i_genre').textContent = meta.Genre;
          if (byId('i_year')) byId('i_year').textContent = meta.Year;
          if (byId('i_Comment')) byId('i_Comment').textContent = meta.Comment;
          break;
        case 'coverurl':
        case 'coverimg':
          if (message.param === '') {
            if (elCover) elCover.src = 'asset/nocover.png';
          } else if (elCover) {
            elCover.src = message.param;
          }
          break;
        case 'playlist':
          var playlist = decodePlayList(message.param);
          if (!plTableBody) plTableBody = byId('pl-data');
          if (!plTableBody) break;
          // build fragment
          plTableBody.textContent = '';
          var frag = document.createDocumentFragment();
          for (var i = 0; i < playlist.length; i++) {
            var tr = document.createElement('tr');
            tr.dataset.index = i;
            var c0 = document.createElement('td'); c0.textContent = playlist[i].Title; tr.appendChild(c0);
            var c1 = document.createElement('td'); c1.textContent = playlist[i].Artist; tr.appendChild(c1);
            var c2 = document.createElement('td'); c2.textContent = msToTime(playlist[i].Duration); tr.appendChild(c2);
            var ci = document.createElement('td'); ci.innerHTML = '<i class="ico-info-circled"></i>'; tr.appendChild(ci);
            frag.appendChild(tr);
          }
          plTableBody.appendChild(frag);
          break;
        case 'state':
          if (elPlayBtn) elPlayBtn.classList.remove('ico-play', 'ico-pause');
          switch (message.param) {
            case '0':
              if (byId('plstate')) byId('plstate').className = 'ico-stop';
              if (elPlayBtn) elPlayBtn.classList.add('ico-play');
              break;
            case '1':
              if (byId('plstate')) byId('plstate').className = 'ico-play';
              if (elPlayBtn) elPlayBtn.classList.add('ico-pause');
              sendCommand('req', 'meta');
              sendCommand('req', 'coverimg');
              break;
            case '2':
              if (byId('plstate')) byId('plstate').className = 'ico-pause';
              if (elPlayBtn) elPlayBtn.classList.add('ico-play');
              break;
          }
          break;
        case 'loop':
          var radios = elLoopCtrl ? elLoopCtrl.getElementsByTagName('input') : [];
          for (var r = 0; r < radios.length; r++) {
            if ((radios[r].type === 'radio') && (radios[r].value == message.param)) radios[r].checked = true;
            else radios[r].checked = false;
          }
          break;
        case 'index':
          // update selected row
          if (!plTableBody) plTableBody = byId('pl-data');
          if (!plTableBody) break;
          var rows = plTableBody.getElementsByTagName('tr');
          for (var j = 0; j < rows.length; j++) rows[j].classList.remove('selected');
          if (rows.length > 0 && message.param >= 0 && message.param < rows.length) rows[message.param-1].classList.add('selected');
          break;
      }
      break;
    case 'app':
      switch (message.command) {
        case 'plchange':
          sendCommand('req', 'playlist');
          sendCommand('req', 'index');
          break;
      }
      break;
  }
}

function toggleMute(gui) {
  if (gui == 0) {
    if (elMute) { elMute.classList.remove('ico-volume-off'); elMute.classList.add('ico-volume-up'); }
  } else if (gui == 1) {
    if (elMute) { elMute.classList.remove('ico-volume-up'); elMute.classList.add('ico-volume-off'); }
  } else {
    if (elMute && elMute.classList.contains('ico-volume-off')) sendCommand('act', 'unmute');
    else sendCommand('act', 'mute');
  }
}

function setVolume() {
  var val = elVolume ? elVolume.value : (byId('volume') ? byId('volume').value : null);
  clearTimeout(volumeTimer);
  volumeTimer = setTimeout(function() { if (val !== null) sendCommand('act', 'vol', val); }, 100);
}

function loopChange(looping) { sendCommand('act', 'loop', looping.value); }
function seek() { sendCommand('act', 'seek', byId('songpos').value); }
