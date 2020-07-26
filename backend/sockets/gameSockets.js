const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("../utils/users.js");
const {
  gameJoin,
  setGamePlayer1,
  setGamePlayer2,
  getAllGames,
  playerDisconnectFromGame,
  removeGame,
  isPlayerInGame,
  findGame,
  getPlayerNumber
} = require("../utils/games.js");

  const moment = require("moment");
let now = moment();

const games = getAllGames();

module.exports.listen = function(io, socket){
 //create a game
  socket.on("createGame", (userId) => {
    if (getCurrentUser(userId)) {
      const gameId = Math.floor(Math.random() * 10000).toString();
      gameJoin(gameId);
      socket.emit("gameCreateResponse", gameId);
      return;
    } else
      socket.emit("createGameError", "please register before creating a game");
  });

  socket.on("playerInGame", (player) => {
    const isBusy = isPlayerInGame(player.id);
    socket.emit("playerUnavailable", isBusy);
  });

  //cancel game
  socket.on("removeGame", (gameId) => {
    const removedGame = removeGame(gameId);
    if (removedGame) {
      socket.emit(
        "removedGame",
        "The game was removed. please create another one"
      );
      return;
    } else
      socket.emit("removedGame", "Sorry we couldnt find the game to delete");
  });

  //creator joins game
  socket.on("joinGame", ({ userId, gameId, time }) => {
    if (!getCurrentUser(userId)) {
      socket.emit("joinGameError", "please register before joining a game");
      return;
    }
    const game = games.find((g) => {
      return g.gameId === gameId;
    });
    if (!game) {
      socket.emit("invalidGame", "Sorry, the game does not exist");
      return;
    } else {
      if (game.player1.playerId !== "") {
        socket.emit("player1present", "You are already in game");
        return;
      } else {
        const game = setGamePlayer1(gameId, userId, time);

        if (game) {
          socket.join(gameId);
          socket.emit(
            "gameJoined",
            "You have joined the game. Waiting for other player"
          );
        } else {
          socket.emit("user1Error", "Sorry, could not set you up for the game");
        }
      }
    }
  });

  //invite player 2
  socket.on("gameRequest", ({ userId, gameId, invitedPlayer }) => {
    const game = games.find((g) => {
      return g.gameId === gameId;
    });
    if (!game) {
      socket.emit("invalidGame", "Sorry, the game does not exists");
      return;
    } else {
      if (game.player2.playerId !== "") {
        socket.emit("player2present", "Player has already joined your game");
        return;
      } else {
        let user = getCurrentUser(userId);
        io.to(invitedPlayer.id).emit("invite", { host: user, game: game });
      }
    }
  });

  //player 2 accepts game request
  socket.on("inviteAccepted", async ({ userId, gameId }) => {
    const user = getCurrentUser(userId);
    if (!user) {
      socket.emit("joinGameError", "please register before joining the game");
      return;
    }
    const game = games.find((g) => {
      return g.gameId === gameId;
    });
    if (!game) {
      socket.emit("invalidGame", "Sorry, the game does not exist anymore");
      return;
    }
    if (game.player1.playerId === "") {
      socket.emit("player1left", "The host has left");
      return;
    }
		const Newgame = setGamePlayer2(gameId, userId);
		if (Newgame) {
			socket.join(gameId, function () {
			});
			io.in(gameId).emit("gameJoined2", {game: game})
		} else {
			socket.emit("user2Error", "Sorry, could not set you up for the game");
		}
  });
  

  //GAME FUNCTIONS

  //getTiles
  socket.on("requestTiles", ({ gameId, numTilesNeeded, player }) => {
    const game = findGame(gameId);
    if (!game) { socket.emit("gameEnded", "The game has ended"); return; }
    else {
      console.log("num tiles needed: " +numTilesNeeded)
      tilesToSend = game.gameState.pouch.slice(0, numTilesNeeded)
      console.log("will send: "+ tilesToSend)
      if (player === 0) {
        game.gameState.player1Tiles = [...game.gameState.player1Tiles, ...tilesToSend]
      }
      else {
        game.gameState.player2Tiles =[...game.gameState.player2Tiles, ...tilesToSend]
      }
      game.gameState.pouch.splice(0, numTilesNeeded)
      //send back a slice from the usertiles
      socket.emit("sendingTiles", tilesToSend) //tiles is an array
    }
  })

  socket.on("updateGameState", ({gameId, boardState, playerRackTiles, player, scores }) => {
    const game = findGame(gameId);
    if (!game) { socket.emit("gameEnded", "The game has ended"); return; }
    else {
      game.gameState.boardState = boardState;
      game.gameState.scores = scores
      if (player === 0) {
        game.gameState.player1Tiles = playerRackTiles
        game.gameState.turn = 1
      }
      else {
        game.gameState.player2Tiles = playerRackTiles
        game.gameState.turn = 0
      }
      io.in(gameId).emit("gameUpdated", game)
    }
  })

          socket.on("gameOver", (gameId) => {
    const game = findGame(gameId);
      if (!game) { socket.emit("gameEnded", "The game has ended"); return; }
      else {
        game.gameState.isOver = true;
        removeGame(gameId)
        io.in(gameId).emit("gameEnd", game)
      }
          })
  
  
  
  //USER CHAT 
	socket.on("sendMsg", ({ gameId, currentPlayer, newMessage }) => {
		const game = findGame(gameId);
		if (!game) {
			socket.emit("gameEnded", "The game has ended");
			return;
		}
		const user = getCurrentUser(socket.id);
		if (!user) {
			socket.emit("opponentLeft", "The opponent has left the game");
			return;
		}
		const msgObject = {
			playerFromBackend: currentPlayer,
			playerName: user.name,
			msg: newMessage,
			date: now.format("h:mm:ss a")
		};
		io.in(gameId).emit("recieveMsg", msgObject); //also return time here
	});


};