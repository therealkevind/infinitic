import {X, O, Board, Game} from "./board.js";

document.addEventListener("DOMContentLoaded", ()=>{

  let game;

  // const game = Game.empty(Board.nested(3n));

  const gameCanvas = document.getElementById("game-board"),
    gameForm = document.getElementById("game"),
    coordInput = document.getElementById("coords"),
    moveButton = document.getElementById("move");

  {
    const widthInput = document.getElementById("width"),
      heightInput = document.getElementById("height"),
      depthInput = document.getElementById("depth"),
      goalInput = document.getElementById("goal"),
      settingsForm = document.getElementById("settings");

    const onSizeInput = () => {
      goalInput.placeholder = Math.min(widthInput.value || 3, heightInput.value || 3);
      goalInput.max = Math.max(widthInput.value || 3, heightInput.value || 3);
    }

    widthInput.addEventListener("input", onSizeInput);
    heightInput.addEventListener("input", onSizeInput);
    onSizeInput();

    settingsForm.addEventListener("submit", e => {
      e.preventDefault();

      game = Game.empty(Board.nested(BigInt(depthInput.value || depthInput.placeholder), BigInt(widthInput.value || widthInput.placeholder), BigInt(heightInput.value || heightInput.placeholder), BigInt(goalInput.value || goalInput.placeholder)));
      gameCanvas.width = game.getWidth();
      gameCanvas.height = game.getHeight();
      try {
        game.draw(gameCanvas);
      } catch {
        alert("It seems this game is too big for your browser to render. Try a smaller game.");
        gameCanvas.width = 0;
        gameCanvas.height = 0;

        let cause;
        if (depthInput.value > 1) {
          cause = depthInput;
        } else if ((widthInput.value || widthInput.placeholder) ** 2 < heightInput.value) {
          cause = heightInput;
        } else {
          cause = widthInput;
        }
        cause.focus();
        cause.select();
        return;
      }

      coordInput.disabled = false;
      moveButton.disabled = false;
      coordInput.placeholder = game.requirementsA1();
      coordInput.value = "";

      coordInput.focus();
    });
  }

  gameForm.addEventListener("submit", e => {
    e.preventDefault();

    if (!game.whoseTurn) return alert("Game's over.");

    const coordText = coordInput.value;

    const [, letters, number] = coordText.match(/^([A-Z]+)([0-9]+)$/i) ?? [];

    if (number) {
      const x = Board.lettersToNumber(letters)-1n, y = BigInt(number)-1n;
      if (!game.isValid(x, y)) alert("Coordinates are outside the usable range!");
      else if (!game.isOpen(x, y)) alert("Those coordinates are taken!");
      else {
        if (game.play(x, y)) switch (game.winner) {
          case X: alert("X wins!"); break;
          case O: alert("O wins!"); break;
          default: alert("It's a tie.");
        } else coordInput.placeholder = game.requirementsA1();
        game.draw(gameCanvas);
      }
    } else alert("Invalid coordinates!");

    coordInput.value = "";
    if (game.winner) {
      coordInput.disabled = true;
      moveButton.disabled = true;
      document.getElementById("settings-detail").open = true;
    } else {
      coordInput.focus();
      coordInput.select();
    }
  });
});
