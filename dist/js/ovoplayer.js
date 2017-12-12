function init(){if(localStorage)var e=localStorage.getItem("server"),t=localStorage.getItem("port");e||(e="127.0.0.1"),t||(t="6860"),localStorage&&(localStorage.setItem("server",e),localStorage.setItem("port",t)),webSocketConnect(e,t)}function byId(e){return document.getElementById(e)}function toast(e){var t=byId("toast");t.innerText=e,t.className="show",setTimeout(function(){t.className=t.className.replace("show","")},4e3)}function openImg(e){var t=window.open();return t.document.body.innerHTML='<img src="'+e+'">',!1}function showinfo(e){var t=byId("songinfo");t.className="show"}function closeinfo(){var e=byId("songinfo");e.className=e.className.replace("show","")}function webSocketConnect(e,t){"undefined"!=typeof MozWebSocket?socket=new MozWebSocket(get_appropriate_w_url(e,t)):socket=new WebSocket(get_appropriate_w_url(e,t));try{socket.onopen=function(){toast("Connected"),connected()},socket.onmessage=function(e){handle_message(e)},socket.onclose=function(){toast("Connection lost: retrying in 5 seconds"),console.log("disconnected"),setTimeout(function(){webSocketConnect(e,t)},5e3)}}catch(e){alert("<p>Error"+e)}}function sendCommand(e,t,n){var a=e+":"+t;null!=n&&(a+="="+n),a=encodeOvoLength(a.length)+a,socket.send(a)}function connected(){console.log("connected"),sendCommand("cfg","keep"),sendCommand("cfg","autopos"),sendCommand("cfg","size",1),sendCommand("req","state"),sendCommand("req","meta"),sendCommand("req","coverimg"),sendCommand("req","vol"),sendCommand("req","mute"),sendCommand("req","playlist"),sendCommand("req","index"),sendCommand("req","loop")}function get_appropriate_w_url(e,t){return"ws://"+e+":"+t+"/player"}function decodeOvoLength(e){for(var t=window.atob(e),n=t.length,a=0,o=0;o<n;o++)a|=t.charCodeAt(o)<<8*(n-o-1);return a}function encodeOvoLength(e){for(var t="",n=0;n<3;n++)t+=String.fromCharCode(e>>8*(2-n)&255);return btoa(t)}function decodeMeta(e){function t(){len=decodeOvoLength(e.substr(a,4)),a+=4;var t=a;return a+=len,e.substr(t,len)}var n=new ovoMeta,a=4;return n.Index=t(),n.ID=t(),n.FileName=t(),n.Album=t(),n.AlbumArtist=t(),n.Artist=t(),n.Comment=t(),n.Duration=t(),n.Genre=t(),n.Title=t(),n.TrackString=t(),n.Year=t(),n}function decodePlayList(e){var t=4,n=[],a=decodeOvoLength(e.substr(0,4)),o=1*e.substr(4,a);for(t+=a;o>0;){var s=decodeOvoLength(e.substr(t,4));n.push(decodeMeta(e.substr(t,s))),t+=s+4,o-=1}return n}function split_message(e){var t=new ovoCommand;t.size=decodeOvoLength(e.substr(0,4));var n=e.indexOf(":");t.category=e.slice(4,n);var a=e.indexOf("=");return a>-1?(t.command=e.slice(n+1,a),t.param=e.slice(a+1)):t.command=e.slice(n+1),t}function msToTime(e){var t=(parseInt(e%1e3/100),parseInt(e/1e3%60)),n=parseInt(e/6e4%60),a=parseInt(e/36e5%24);return a>0?(a+=":",n=n<10?"0"+n:n):a="",t=t<10?"0"+t:t,a+n+":"+t}function handle_message(e){if(0!=e.data.length)switch(message=split_message(e.data),message.category){case"inf":switch(message.command){case"pos":byId("songpos").value=message.param,byId("textPos").innerText=msToTime(message.param);break;case"vol":byId("volume").value=message.param;break;case"mute":toggleMute(message.param);break;case"meta":var t=decodeMeta(message.param);t.Index==-1&&(byId("songpos").max=t.Duration,byId("title").innerText=t.Title,byId("artist").innerText=t.Artist,byId("album").innerText=t.Album,byId("textDuration").innerText=msToTime(t.Duration)),byId("i_tile").innerText=t.Title,byId("i_album").innerText=t.Album,byId("i_albumartist").innerText=t.AlbumArtist,byId("i_artist").innerText=t.Artist,byId("i_track").innerText=t.TrackString,byId("i_genre").innerText=t.Genre,byId("i_year").innerText=t.Year,byId("i_Comment").innerText=t.Comment;break;case"coverurl":case"coverimg":""===message.param?byId("cover").src="asset/nocover.png":byId("cover").src=message.param;break;case"playlist":var n=decodePlayList(message.param),a=byId("pl-data");a.innerText="";for(var o=0;o<n.length;o++){var s=a.insertRow(-1),r=s.insertCell(0);r.innerText=n[o].Title;var i=s.insertCell(1);i.innerText=n[o].Artist;var c=s.insertCell(2);c.innerText=msToTime(n[o].Duration);var m=s.insertCell(3);m.innerHTML='<i class="ico-info-circled"></i>',r.onclick=function(){return function(){sendCommand("act","play",this.parentElement.rowIndex-1)}}(),m.onclick=function(){return function(){sendCommand("req","meta",this.parentElement.rowIndex),showinfo()}}()}break;case"state":switch(byId("playbtn").classList.remove("ico-play","ico-pause"),message.param){case"0":byId("plstate").className="ico-stop",byId("playbtn").classList.add("ico-play");break;case"1":byId("plstate").className="ico-play",byId("playbtn").classList.add("ico-pause"),sendCommand("req","meta"),sendCommand("req","coverimg");break;case"2":byId("plstate").className="ico-pause",byId("playbtn").classList.add("ico-play")}break;case"loop":for(var d=byId("loopctrl").getElementsByTagName("input"),o=0;o<d.length;o++)"radio"===d[o].type&&d[o].value==message.param?d[o].checked=!0:d[o].checked=!1;break;case"index":for(var l=byId("tabpl").getElementsByTagName("TR"),o=0;o<l.length;o++)l[o].classList.remove("selected");l.length>1&&l[message.param].classList.add("selected")}break;case"app":switch(message.command){case"plchange":sendCommand("req","playlist"),sendCommand("req","index")}}}function toggleMute(e){0==e?(byId("mute").classList.remove("ico-volume-off"),byId("mute").classList.add("ico-volume-up")):1==e?(byId("mute").classList.remove("ico-volume-up"),byId("mute").classList.add("ico-volume-off")):byId("mute").classList.contains("ico-volume-off")?sendCommand("act","unmute"):sendCommand("act","mute")}function setVolume(){sendCommand("act","vol",byId("volume").value)}function loopChange(e){sendCommand("act","loop",e.value)}function seek(){sendCommand("act","seek",byId("songpos").value)}var ovoCommand=function(){this.size=0,this.category="",this.command="",this.param=""},ovoMeta=function(){this.Index=0,this.ID=0,this.FileName="",this.Album="",this.AlbumArtist="",this.Artist="",this.Comment="",this.Duration=0,this.Genre="",this.Title="",this.TrackString="",this.Year=""};