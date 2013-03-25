chess-hub
=========

The goal of this project is to provide a set of web components for online chess play.
- chess server (the hub)
- JS client library for hub connection
- JS client library for board & pieces creation & manipulation
- HTML+CSS+JS client

The 1st version is "hit & run" style. The user provides a login name (no auth) and is directed to the main page, which includes a basic chat system and a form. The form allows the user to search for a game (level, and level span tolerancy). If no game is found, a new one is created. The user is then directed to the board. He "sits" in one of the free chairs (blacks or whites). The game starts when both chairs are occupied.

___
Current state
---------

    server  : |=====================================================================>                              | 70%

Handles connection, polling & messaging (through channels), serving static files, searching for games.


    client  : |==================================================>                                                | 50%

Handles connections, polling & messaging, searching for games and redirecting to the board page.
A lot of work remains on the chessHubBoard lib. Some troubles getting it to scale with browser's width & height, while maintaining ratio and keep it all visible.
Need to enforce pieces moves, turns, and the "sitting" mechanism.


___
server - the Hub
=========

Built with NodeJS. No framework.

1st version Goals :
--------
- do everything with nodejs : routing, serving static files, handling connections and messaging
- simple login (no login/password database, IRC style) : give a login name, if it's free then you're in
- use a simple dialog protocol based on json post requests, allowing the use of custom clients
- should enforce chess rules (don't delegate all to clients)
- messaging : 1 main lobby, 1 channel per game, direct messages, IRC style ("XX has joined #MyGame", "@YY Hey !", ...)
- find a partner based on : self-estimated level (beginner, experienced, master, great master)
- learning games : have a willing master+ and a willing beginner play together
- must be playable through proxies => long polling instead of web sockets (will implement sockets later with polling as a fallback method)
- limit the number of clients
- user timeout

Nice to have :
--------
- save games to files
- web sockets connection
- allow a user to watch an ongoing game
- allow a user to open multiple boards


TODO
---------
- [ ] handle the user key (to avoid user impersonnification)
- [ ] handle user timeout
- [ ] handle multiple channel polling for each client


___
client - chessHubClient
=========

Built in JS.
Requires jQuery, mostly for asynchronous calls.

Library that handles connection and messaging with the Hub.


TODO
---------
- [ ] handle the user key (to avoid user impersonnification)
- [ ] handle user timeout
- [ ] handle multiple channel polling for each client



___
client - chessHubBoard
=========

Built in JS.
Requires jQuery, mostly for DOM objects manipulation.

Library that handles board and pieces creation & manipulation.

TODO
---------
- [x] generate the board
- [x] generated pieces objects
- [x] spawn the pieces and place them
- [ ] handle the moves



___
client
=========

Built in HTML/CSS/JS and jQuery Mobile.
Requires jQuery.

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


TODO
---------
- [ ] correctly place & render the board (css issue)
- [ ] add chat to games
- [ ] finis the main page design

