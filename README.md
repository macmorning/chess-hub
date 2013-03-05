chess-hub
=========

Project for a Chess Hub for online play, server + client.


server
=========

Built with NodeJS. In a first version at least without framework.

1st version Goals :
- do everything with nodejs : routing, server static files, connecting, messaging
- simple login (no login/password database, IRC style) : give a login name, if it's free then you're in
- use a simple dialog protocol based on json post requests, allowing the use of custome clients
- should enforce chess rules (don't delegate all to clients)
- messaging : 1 main lobby, 1 channel per game, direct messages, IRC style
- find a partner based on : self-estimated level (beginner, experienced, master, great master)
- learning games : have a willing master+ and a willing beginner play together
- must be playable through proxies => long polling instead of web sockets
- allow a user to watch an ongoing game
- allow a user to open multiple boards
- limit the number of clients
- do not broadcast every messages to everyone
- save games to files ?
- user timeout ?

client
=========

Built in HTML/CSS/JS, using jQuery. Maybe angularJS if needed.

1st version Goals :
- as simple as possible
- 3 pages :
  - login screen (no auth, just give a username)
  - main page : preferences, search a game, chat lobby
  - board page : board, local chat, users list (black player, white player, spectators)
- responsive design
- save games into local storage and replay
- export saved games
- offline capable :
  - play a saved game
  - ...?
