export const X = Symbol("X"), O = Symbol("O");

export class Board {
  #winner;
  #subboards;
  #width; #subwidth;
  static #SIZE = 3n;

  constructor(subboards, winner = null) {
    if (subboards != null) {
      if (subboards.length != Board.#SIZE || subboards.some(row => row.length != Board.#SIZE || row.some(board => !(board instanceof Board)))) throw new TypeError("invalid subboards");
      this.#subboards = subboards.map(row => row.slice());
      this.#subwidth = subboards[0][0].#width;
      this.#width = Board.#SIZE * this.#subwidth;
    } else {
      this.#subboards = null;
      this.#winner = winner;
      this.#width = 1n;
    }
    this.#winner = winner;
  }

  toJSON(key) {
    return key ? JSON.stringify(this, (key, value) => {
      if (typeof value == "symbol") {
        return value == X ? 1 : 0;
      } else return value;
    }) : {winner: value.#winner, subboards: value.#subboards};
  }
  static reviver(key, value) {
    if (typeof value == "number") {
      switch (value) {
        case 1: return X;
        case 0: return O;
        default: throw new SyntaxError("invalid Board json");
      }
    } else if (typeof value == "object" && !Array.isArray(value)) {
      return new Board(value.subboards, value.winner);
    } else return value;
  }
  static fromJSON(json) {
    return JSON.parse(json, (key, value) => Board.reviver(key, value));
  }

  static nested(nestLevel) {
    return new Board(nestLevel > 0n
      ? Array.from({length: Number(Board.#SIZE)}, ()=>Array.from({length: Number(Board.#SIZE)}, ()=>Board.nested(nestLevel - 1n)))
      : null);
  }

  // puts the symbol, and returns whether this board was won as a result of the move
  put(symbol, x, y) {
    if (symbol != X && symbol != O) throw new TypeError("expected a tic-tac-toe piece");
    x = BigInt(x); y = BigInt(y);
    if (!this.isOpen(x, y)) throw new ValueError("position is taken");
    return this.#put(symbol, x, y);
  }

  // is the space open?
  isOpen(x, y) {
    x = BigInt(x); y = BigInt(y);
    if (!this.#isInRange(x, y)) throw new ValueError("position out of range");
    let board = this;
    do {
      if (board.#winner) return false;
    } while (board = board.#subboard(x, y));
    return true;
  }

  #isInRange(x, y) {
    return x >= 0 && x < this.#width && y >= 0 && y < this.#width;
  }

  // helper
  #subboard(x, y) {
    return this.#subboards?.[y / this.#subwidth % Board.#SIZE][x / this.#subwidth % Board.#SIZE];
  }

  // puts the symbol, and returns whether this board was won as a result of the move. does not error-check.
  #put(symbol, x, y) {
    if (!this.#subboards || (
      this.#subboard(x, y).#put(symbol, x, y) && this.#checkWinner(symbol, x, y)
    )) {
      this.#winner = symbol;
      return true;
    } else return false;
  }

  // did the given move win this board?
  #checkWinner(symbol, x, y) {
    y = y / this.#subwidth % Board.#SIZE; x = x / this.#subwidth % Board.#SIZE;
    const n = 3;
    {
      let count = 1;
      for (let i = 1n; i < n; i++) if (this.#subboards[y]?.[x + i]?.#winner == symbol) count++; else break;
      for (let i = 1n; i < n; i++) if (this.#subboards[y]?.[x - i]?.#winner == symbol) count++; else break;
      if (count >= n) return true;
    }
    {
      let count = 1;
      for (let i = 1n; i < n; i++) if (this.#subboards[y + i]?.[x]?.#winner == symbol) count++; else break;
      for (let i = 1n; i < n; i++) if (this.#subboards[y - i]?.[x]?.#winner == symbol) count++; else break;
      if (count >= n) return true;
    }
    {
      let count = 1;
      for (let i = 1n; i < n; i++) if (this.#subboards[y + i]?.[x + i]?.#winner == symbol) count++; else break;
      for (let i = 1n; i < n; i++) if (this.#subboards[y - i]?.[x - i]?.#winner == symbol) count++; else break;
      if (count >= n) return true;
    }
    {
      let count = 1;
      for (let i = 1n; i < n; i++) if (this.#subboards[y + i]?.[x - i]?.#winner == symbol) count++; else break;
      for (let i = 1n; i < n; i++) if (this.#subboards[y - i]?.[x + i]?.#winner == symbol) count++; else break;
      if (count >= n) return true;
    }
    return false;
  }

  // ctx: 2d canvas context; board drawn in middle
  // x, y: location of most recent move
  draw(ctx, x, y) {
    const K = Number(Board.#SIZE) + 1;
    if (this.#subboards) {
      ctx.save();
      if (this.#winner) ctx.globalAlpha *= .5;
      ctx.scale(1/K, 1/K);
      ctx.translate(0.5, 0.5);
      for (const [i, row] of this.#subboards.entries()) {
        const rowTransform = ctx.getTransform();
        const ty = y - this.#subwidth * BigInt(i);
        for (const [j, subboard] of row.entries()) {
          const tx = x - this.#subwidth * BigInt(j);
          subboard.draw(ctx, tx, ty);
          ctx.translate(1, 0);
        }
        ctx.setTransform(rowTransform);
        ctx.translate(0, 1);
      }
      // we're translated s.t. origin's at what was previously (0, K), so:
      ctx.strokeStyle = "black";
      ctx.lineWidth = 0.5/K;
      ctx.beginPath();
      for (let i = 1; i < Board.#SIZE; i++) {
        ctx.moveTo(i, -.1);
        ctx.lineTo(i, .1-Number(Board.#SIZE));  // these two lines are never connected
        ctx.moveTo(.1, -i);
        ctx.lineTo(Number(Board.#SIZE)-.1, -i);
      }
      ctx.stroke();
      ctx.restore();
    }
    if (this.#winner) {
      ctx.save();
      ctx.translate(0.5, 0.5);
      ctx.scale((K-1)/K, (K-1)/K);
      if (this.#isInRange(x,y)) {
        ctx.fillStyle = "red";
      } else ctx.fillStyle = "black";
      if (this.#winner == X) {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = .1;
        ctx.beginPath();
        ctx.moveTo(-.5,-.5);
        ctx.lineTo(.5,.5);
        ctx.moveTo(.5,-.5);
        ctx.lineTo(-.5,.5);
        ctx.stroke();
      } else if (this.#winner == O) {
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.5, 0.5, 0, 0, 2 * Math.PI);
        ctx.ellipse(0, 0, 0.4, 0.4, 0, 0, 2 * Math.PI);
        ctx.fill("evenodd");
      }
      ctx.restore();
    }
  }

  rangeFollowing(prevX, prevY) {
    let x = prevX * Board.#SIZE % this.#width , y = prevY * Board.#SIZE % this.#width;
    return this.#rangeWith(x, y);
  }
  #rangeWith(x, y) {
    if (this.#winner || !this.#subboards || this.#subboards.every(row => row.every(board => board.winner))) {
      return false;
    } else {
      const nextRange = this.#subboard(x, y).#rangeWith(x % this.#subwidth, y % this.#subwidth);
      if (!nextRange) return Array(2).fill(new Range(0n, this.#width));
      const [xRange, yRange] = nextRange;
      const dx = x / this.#subwidth * this.#subwidth, dy = y / this.#subwidth * this.#subwidth;
      return [xRange.offset(dx), yRange.offset(dy)];
    }
  }

  get winner() { return this.#winner; }
  get size() { return this.#width; }

  static lettersToNumber(letters) {
    if (!(typeof letters == "string") || !letters.match(/^[A-Z]+$/i)) throw new TypeError("expected a string of letters");
    let total = 0n;
    for (const i of letters) {
      total = total * 26n + BigInt(i.toUpperCase().charCodeAt(0) - "A".charCodeAt(0) + 1);
    }
    return total;
  }
  static numberToLetters(num) {
    num = BigInt(num);
    let str = "";
    while (num > 0) {
      str = String.fromCharCode(Number(--num % 26n) + "A".charCodeAt(0)) + str;
      num /= 26n;
    }
    return str;
  }
  static get SIZE() { return Board.#SIZE; }
}

class Range {
  #min; #max;

  constructor(min, max) {
    this.#min = min; this.#max = max;
  }

  get min() { return this.#min; }
  get max() { return this.#max; }

  contains(x) { return this.#min <= x && x < this.#max; }

  offset(x) { return new Range(this.#min + x, this.#max + x); }

  *[Symbol.iterator]() {
    for (let i = this.#min; i < this.#max; i++) {
      yield i;
    }
  }
}

export class Game {
  #board;
  #whoseTurn;
  #lastTurn;
  #moveRequirements;

  constructor(board, whoseTurn, lastTurn, extraData) {
    this.#board = board;
    this.#whoseTurn = whoseTurn;
    this.#lastTurn = lastTurn;
    this.#moveRequirements = lastTurn ? board.rangeFollowing(...lastTurn) : Array(2).fill(new Range(0n, this.#board.size));
    this.extraData = extraData;
  }

  static empty(board, firstPlayer = X) {
    if (!(board instanceof Board)) throw new TypeError("expected a Board");
    if (firstPlayer != O && firstPlayer != X) throw new TypeError("expected a tic-tac-toe piece");
    return new Game(board, firstPlayer, null);
  }

  toJSON() {
    return {board: obj.#board, whoseTurn: obj.#whoseTurn, lastTurn: obj.#lastTurn, extraData};
  }

  static fromJSON(json) {
    return JSON.parse(json, (key, value) => {
      if (key) return Board.reviver(key, value);
      else return new Game(value.board, value.whoseTurn, value.lastTurn, value.extraData);
    })
  }

  get whoseTurn() { return this.#whoseTurn; }

  isValid(x, y) {
    const [rx, ry] = this.#moveRequirements;
    return rx.contains(x) && ry.contains(y);
  }
  isOpen(x, y) {
    return this.#board.isOpen(x, y);
  }

  play(x, y) {
    if (!this.#whoseTurn) throw new Error("game's over");
    if (this.isValid(x, y) && this.isOpen(x, y)) {
      if (this.#board.put(this.#whoseTurn, x, y)) {
        this.#whoseTurn = null;
      } else this.#whoseTurn = (this.#whoseTurn == X) ? O : X;
      this.#lastTurn = [x,y];
      this.#moveRequirements = this.#board.rangeFollowing(x, y);
    } else throw new ValueError("invalid move");
  }
  getSize() { return 20 * Number(Board.SIZE + 1n) ** (Math.log(Number(this.#board.size))/Math.log(Number(Board.SIZE))); }
  draw(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(canvas.width, canvas.height);
    this.#drawColLabels(ctx);
    this.#drawRowLabels(ctx);
    this.#board.draw(ctx, ...this.#lastTurn??[-1n,-1n]);
    ctx.restore();
  }
  #drawColLabels(ctx) {
    ctx.save();
    const SIZE = Number(Board.SIZE), K = SIZE + 1;
    ctx.translate(0, .5/K);
    for (let i = this.#board.size; i > 0n; i /= Board.SIZE + 1n) {
      ctx.scale(1/K, 1/K);
      ctx.translate(.5, 0);
    }
    // ctx.translate(0.5,-0.5)
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "black";
    for (let i = 0n; i < this.#board.size; i++) {
      ctx.globalAlpha = this.#moveRequirements[0].contains(i) ? 1 : .5;
      ctx.font = this.#moveRequirements[0].contains(i) ? "bold 1px sans-serif" : "1px sans-serif";
      // centered in a 1 wide by .5 tall rectangle
      ctx.fillText(Board.numberToLetters(i + 1n), .5, -.25);
      {
        let total = 1;
        let factor = 1/K;
        for (let n = i+1n; n % Board.SIZE == 0n; n /= Board.SIZE) {
          factor *= K;
          total += factor;
        }
        ctx.translate(total, 0);
      }
    }
    ctx.restore();
  }
  #drawRowLabels(ctx) {
    ctx.save();
    const SIZE = Number(Board.SIZE), K = SIZE + 1;
    ctx.translate(.5/K, 0);
    for (let i = this.#board.size; i > 0n; i /= Board.SIZE + 1n) {
      ctx.translate(0, .5/K);
      ctx.scale(1/K, 1/K);
    }
    ctx.translate(0,-0.2)
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "black";
    for (let i = 0n; i < this.#board.size; i++) {
      ctx.globalAlpha = this.#moveRequirements[1].contains(i) ? 1 : .5;
      ctx.font = this.#moveRequirements[1].contains(i) ? "bold 1px sans-serif" : "1px sans-serif";
      // centered in a 1 wide by .5 tall rectangle
      ctx.fillText(String(i + 1n), 0.25, .5);
      {
        let total = 1;
        let factor = 1/K;
        for (let n = i+1n; n % Board.SIZE == 0n; n /= Board.SIZE) {
          factor *= K;
          total += factor;
        }
        ctx.translate(0, total);
      }
    }
    ctx.restore();

  }

  get winner() { return this.#board.winner; }
}
