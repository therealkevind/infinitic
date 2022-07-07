export const X = Symbol("X"), O = Symbol("O");

export class Board {
  #winner;
  #subboards;
  #width; #subwidth;
  #height; #subheight;
  static #WIDTH = 4n;
  static #HEIGHT = 2n;

  constructor(subboards, winner = null) {
    if (subboards != null) {
      if (subboards.length != Board.#HEIGHT || subboards.some(row => row.length != Board.#WIDTH || row.some(board => !(board instanceof Board)))) throw new TypeError("invalid subboards");
      this.#subboards = subboards.map(row => row.slice());
      this.#subwidth = subboards[0][0].#width;
      this.#subheight = subboards[0][0].#height;
      this.#width = Board.#WIDTH * this.#subwidth;
      this.#height = Board.#HEIGHT * this.#subheight;
    } else {
      this.#subboards = null;
      this.#winner = winner;
      this.#width = 1n;
      this.#height = 1n;
    }
    this.#winner = winner;
  }

  toJSON(key) {
    return key ? JSON.stringify(this, (key, value) => {
      if (typeof value == "symbol") {
        return value == X ? 1 : 0;
      } else return value;
    }) : {winner: this.#winner, subboards: this.#subboards};
  }
  static reviver(key, value) {
    if (typeof value == "number") {
      switch (value) {
        case 1: return X;
        case 0: return O;
        default: throw new SyntaxError("invalid Board json");
      }
    } else if (typeof value == "string") {
      const val = Board.fromJSON(value);
      return new Board(val.subboards, val.winner);
    } else return value;
  }
  static fromJSON(json) {
    return JSON.parse(json, (key, value) => Board.reviver(key, value));
  }

  static nested(nestLevel) {
    return new Board(nestLevel > 0n
      ? Array.from({length: Number(Board.#HEIGHT)}, ()=>Array.from({length: Number(Board.#WIDTH)}, ()=>Board.nested(nestLevel - 1n)))
      : null);
  }

  // puts the symbol, and returns whether this board was won as a result of the move
  put(symbol, x, y) {
    if (symbol != X && symbol != O) throw new TypeError("expected a tic-tac-toe piece");
    x = BigInt(x); y = BigInt(y);
    if (!this.isOpen(x, y)) throw new Error("position is taken");
    return this.#put(symbol, x, y);
  }

  // is the space open?
  isOpen(x, y) {
    x = BigInt(x); y = BigInt(y);
    if (!this.#isInRange(x, y)) throw new Error("position out of range");
    let board = this;
    do {
      if (board.#winner) return false;
    } while (board = board.#subboard(x, y));
    return true;
  }

  #isInRange(x, y) {
    return x >= 0 && x < this.#width && y >= 0 && y < this.#height;
  }

  // helper
  #subboard(x, y) {
    return this.#subboards?.[y / this.#subheight % Board.#HEIGHT][x / this.#subwidth % Board.#WIDTH];
  }

  // puts the symbol, and returns whether this board was won or tied as a result of the move. does not error-check.
  #put(symbol, x, y) {
    if (!this.#subboards || (
      this.#subboard(x, y).#put(symbol, x, y) && this.#checkWinner(symbol, x, y)
    )) {
      this.#winner = symbol;
      return true;
    } else {
      if (this.#subboards.every(row => row.every(subboard => subboard.#winner))) {
        this.#winner = true;
        return true;
      }
      return false;
    }
  }

  // did the given move win this board?
  #checkWinner(symbol, x, y) {
    y = y / this.#subheight % Board.#HEIGHT; x = x / this.#subwidth % Board.#WIDTH;
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
    const KX = Number(Board.#WIDTH) + 1, KY = Number(Board.#HEIGHT) + 1, K = Math.min(KX, KY);
    if (this.#subboards) {
      ctx.save();
      if (this.#winner) ctx.globalAlpha *= .5;
      ctx.scale(1/KX, 1/KY);
      ctx.translate(0.5, 0.5);
      for (const [i, row] of this.#subboards.entries()) {
        const rowTransform = ctx.getTransform();
        const ty = y - this.#subheight * BigInt(i);
        for (const [j, subboard] of row.entries()) {
          const tx = x - this.#subwidth * BigInt(j);
          subboard.draw(ctx, tx, ty);
          ctx.translate(1, 0);
        }
        ctx.setTransform(rowTransform);
        ctx.translate(0, 1);
      }
      const [adjX, adjY] = ((phyX, phyY, phyM = Math.min(phyX, phyY)) => [phyM/phyX, phyM/phyY])(this.getPhysicalWidth()/KX, this.getPhysicalHeight()/KY);
      // we're translated s.t. origin's at what was previously (0, KY), so:
      ctx.strokeStyle = "black";
      ctx.lineWidth = 0.5/K * adjX;
      ctx.beginPath();
      for (let i = 1; i < Board.#WIDTH; i++) {
        ctx.moveTo(i, -.1);
        ctx.lineTo(i, .1-Number(Board.#HEIGHT));
      }
      ctx.stroke();
      ctx.lineWidth = 0.5/K * adjY;
      ctx.beginPath();
      for (let i = 1; i < Board.#HEIGHT; i++) {
        ctx.moveTo(.1, -i);
        ctx.lineTo(Number(Board.#WIDTH)-.1, -i);
      }
      ctx.stroke();
      ctx.restore();
    }
    if (this.#winner) {
      const [adjX, adjY] = ((phyX, phyY, phyM = Math.min(phyX, phyY)) => [phyM/phyX, phyM/phyY])(this.getPhysicalWidth(), this.getPhysicalHeight());
      ctx.save();
      ctx.translate(0.5, 0.5);
      ctx.scale((K-1)/K * adjX, (K-1)/K * adjY);
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
    let x = prevX * Board.#WIDTH % this.#width , y = prevY * Board.#HEIGHT % this.#height;
    return this.#rangeWith(x, y);
  }
  #rangeWith(x, y) {
    if (this.#winner || !this.#subboards || this.#subboards.every(row => row.every(board => board.#winner))) {
      return false;
    } else {
      const nextRange = this.#subboard(x, y).#rangeWith(x % this.#subwidth, y % this.#subheight);
      if (!nextRange) return [new Range(0n, this.#width), new Range(0n, this.#height)];
      const [xRange, yRange] = nextRange;
      const dx = x / this.#subwidth * this.#subwidth, dy = y / this.#subheight * this.#subheight;
      return [xRange.offset(dx), yRange.offset(dy)];
    }
  }

  get winner() { return this.#winner; }
  get width() { return this.#width; }
  get height() { return this.#height; }
  getPhysicalWidth() { return this.#height > 1 ? Number(Board.#WIDTH + 1n) ** (Math.log(Number(this.#width))/Math.log(Number(Board.#WIDTH))) : 1; }
  getPhysicalHeight() { return this.#height > 1 ? Number(Board.#HEIGHT + 1n) ** (Math.log(Number(this.#height))/Math.log(Number(Board.#HEIGHT))) : 1; }

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
  static get WIDTH() { return Board.#WIDTH; }
  static get HEIGHT() { return Board.#HEIGHT; }
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
    if (!(board instanceof Board)) throw new TypeError("expected a Board");
    if (whoseTurn != X && whoseTurn != O) throw new TypeError("expected a tic-tac-toe piece");
    this.#board = board;
    this.#whoseTurn = whoseTurn;
    this.#lastTurn = lastTurn;
    this.#moveRequirements = lastTurn ? board.rangeFollowing(...lastTurn) : this.#defaultRange();
    this.extraData = extraData;
  }

  #defaultRange() {
    return [new Range(0n, this.#board.width), new Range(0n, this.#board.height)];
  }

  static empty(board, firstPlayer = X) {
    return new Game(board, firstPlayer, null);
  }

  toJSON() {
    return {board: this.#board, whoseTurn: this.#whoseTurn == X ? 1 : 0, lastTurn: this.#lastTurn?.map(i => i.toString()), extraData: this.extraData};
  }

  static fromJSON(json) {
    return JSON.parse(json, (key, value) => {
      if (key == "board") return Board.reviver(key, value);
      else if (key) return value;
      else return new Game(value.board, value.whoseTurn ? X : O, value.lastTurn?.map(i => BigInt(i)), value.extraData);
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
      return !this.#whoseTurn;
    } else throw new Error("invalid move");
  }
  getWidth() { return 20 * this.#board.getPhysicalWidth(); }
  getHeight() { return 20 * this.#board.getPhysicalHeight(); }
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
    const WIDTH = Number(Board.WIDTH), KX = WIDTH + 1, KY = Number(Board.HEIGHT) + 1;
    ctx.translate(0, .5/KY);
    for (let i = this.#board.width; i > 1n; i /= Board.WIDTH) {
      ctx.scale(1/KX, 1/KY);
      ctx.translate(.5, 0);
    }
    ctx.translate(0.5,0.05)
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "black";
    for (let i = 0n; i < this.#board.width; i++) {
      ctx.globalAlpha = this.#moveRequirements[0]?.contains(i) ? 1 : .5;
      ctx.font = this.#moveRequirements[0]?.contains(i) ? "bold 1px Calibri" : "1px Calibri";
      // centered in a 1 wide by .5 tall rectangle
      ctx.save();
      if (this.#board.width >= 26n) ctx.rotate(-3*Math.PI/8), ctx.textAlign = "left", ctx.translate(-0.3,-0.15);
      ctx.fillText(Board.numberToLetters(i + 1n), 0, -0.2);
      ctx.restore();
      {
        let total = 1;
        let factor = 1/KX;
        for (let n = i+1n; n % Board.WIDTH == 0n; n /= Board.WIDTH) {
          factor *= KX;
          total += factor;
        }
        ctx.translate(total, 0);
      }
    }
    ctx.restore();
  }
  #drawRowLabels(ctx) {
    ctx.save();
    const HEIGHT = Number(Board.HEIGHT), KY = HEIGHT + 1, KX = Number(Board.WIDTH) + 1;
    ctx.translate(.5/KX, 0);
    for (let i = this.#board.height; i > 1n; i /= Board.HEIGHT) {
      ctx.translate(0, .5/KY);
      ctx.scale(1/KX, 1/KY);
    }
    ctx.translate(0,-0.2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "black";
    for (let i = 0n; i < this.#board.height; i++) {
      ctx.globalAlpha = this.#moveRequirements[1]?.contains(i) ? 1 : .5;
      ctx.font = this.#moveRequirements[1]?.contains(i) ? "bold 1px Calibri" : "1px Calibri";
      // centered in a .5 wide by 1 tall rectangle
      ctx.fillText(String(i + 1n), 0.25, .5);
      {
        let total = 1;
        let factor = 1/KY;
        for (let n = i+1n; n % Board.HEIGHT == 0n; n /= Board.HEIGHT) {
          factor *= KY;
          total += factor;
        }
        ctx.translate(0, total);
      }
    }
    ctx.restore();
  }

  requirementsAreTrivial() {
    const [rx, ry] = this.#moveRequirements;
    return rx.min == 0 && ry.min == 0 && rx.max == this.#board.width && ry.max == this.#board.height;
  }
  requirementsA1() {
    const [rx, ry] = this.#moveRequirements;
    return `${Board.numberToLetters(rx.min + 1n)}${ry.min + 1n}:${Board.numberToLetters(rx.max)}${ry.max}`
  }

  get winner() { return this.#board.winner; }
}
