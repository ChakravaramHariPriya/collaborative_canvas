// websocket.js
export class WebSocketManager {
  constructor(canvasManager) {
    this.socket = io();
    this.canvasManager = canvasManager;
  }

  setup() {
    // Listen for drawing from other users
    this.socket.on("draw", (data) => {
      const ctx = this.canvasManager.ctx;
      ctx.beginPath();
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.size;
      ctx.moveTo(data.prevX, data.prevY);
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    });

    this.socket.on("undo", () => this.canvasManager.undo());
    this.socket.on("redo", () => this.canvasManager.redo());
  }

  sendDrawEvent(data) {
    this.socket.emit("draw", data);
  }

  sendUndo() {
    this.socket.emit("undo");
  }

  sendRedo() {
    this.socket.emit("redo");
  }
}
