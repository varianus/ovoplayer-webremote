# [ovoplayer-webremote](https://github.com/varianus/ovoplayer-webremote) <img src="https://github.com/varianus/ovoplayer/raw/master/images/icon.png" width="64">


## ovoplayer-webremote is a cross-browser web GUI for my [ovoplayer](https://github.com/varianus/ovoplayer) audio player.

It's developed as a single page web app, using only a custom CSS framework and pure javascript code (NO jquery).

To configure the ovoplayer connetion, press the "Settings" button on the top right corner of the page and fill the form with the address of the ovoplayer host and port. The default port is 6860. 
Ovoplayer web remote could also use SSL encryption if you have configured ovoplayer to use SSL. 

This web app do not need any hosting or server application, just copy the repository content on some folder of your file system and point your browser to index.html. 

You can also use try the [https://varianus.github.io/ovoplayer-webremote/](https://varianus.github.io/ovoplayer-webremote/) hosted version, but note that this version may not be able to connect to your local ovoplayer instance due to browser security restrictions.


#### Note: Communication with ovoplayer is done via websocket protocol. Actually this is implemented only on development version (>= 1.4) of ovoplayer. Note also that [net communication protocol](https://github.com/varianus/ovoplayer/wiki/NetProtocol) is also under development and not stable.



