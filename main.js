import {X, O, Board, Game} from "./board.js";

document.addEventListener("DOMContentLoaded", ()=>{

  const game = Game.empty(Board.nested(1n));

  const gameCanvas = document.getElementById("game-board"),
    coordInput = document.getElementById("coords"),
    moveButton = document.getElementById("move");

  gameCanvas.width = gameCanvas.height = game.getSize();
  game.draw(gameCanvas);

  moveButton.addEventListener("click", ()=>{
    if (!game.whoseTurn) return alert("Game's over.");

    const coordText = coordInput.value;

    const [, letters, number] = coordText.match(/^([A-Z]+)([0-9]+)$/i) ?? [];

    if (number) {
      const x = Board.lettersToNumber(letters)-1n, y = BigInt(number)-1n;
      if (!game.isValid(x, y)) alert("Coordinates are outside the usable range!");
      else if (!game.isOpen(x, y)) alert("Those coordinates are taken!");
      else {
        if (game.play(x, y)) switch (game.winner) {
          case "X": alert("X wins!"); break;
          case "O": alert("O wins!"); break;
          default: alert("It's a tie.");
        }
        game.draw(gameCanvas);
      }
    } else alert("Invalid coordinates!");
  });

});
