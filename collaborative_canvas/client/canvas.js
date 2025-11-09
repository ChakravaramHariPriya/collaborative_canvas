export class CanvasManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    this.isDrawing = false;
    this.paths = [];
    this.redoStack = [];
    this.brushType = "normal";

    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  resizeCanvas() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const ratio = window.devicePixelRatio || 1;

    this.canvas.width = w * ratio;
    this.canvas.height = h * ratio;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // Always set fresh white background
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.redrawAll();
  }

  startDrawing(x, y, color, size, brushType) {
    this.isDrawing = true;
    this.brushType = brushType;

    this.currentPath = { points: [{ x, y }], color, size, brushType };

    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  drawLine(x, y) {
    if (!this.isDrawing || !this.currentPath) return;

    this.currentPath.points.push({ x, y });
    const ctx = this.ctx;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (this.brushType) {
      case "normal":
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = this.currentPath.color;
        ctx.lineWidth = this.currentPath.size;
        ctx.lineTo(x, y);
        ctx.stroke();
        break;

      case "calligraphy":
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = this.currentPath.color;
        ctx.lineWidth = this.currentPath.size * 1.4;
        ctx.lineTo(x, y);
        ctx.stroke();
        break;

      case "highlighter":
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = this._alpha(this.currentPath.color, 0.3);
        ctx.lineWidth = this.currentPath.size * 3;
        ctx.lineTo(x, y);
        ctx.stroke();
        break;

      case "spray":
        ctx.globalCompositeOperation = "source-over";
        this.spray(x, y, this.currentPath.color, this.currentPath.size);
        break;

      case "eraser":
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = this.currentPath.size * 3;
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
        break;
    }
  }

  stopDrawing() {
    if (!this.isDrawing) return;

    this.isDrawing = false;
    if (this.currentPath.points.length > 0) {
      this.paths.push(this.currentPath);
    }
    this.currentPath = null;
    this.ctx.beginPath();
    this.redoStack = [];
  }

  spray(x, y, color, size) {
    const ctx = this.ctx;
    ctx.fillStyle = this._alpha(color, 0.4);
    const density = Math.max(10, size * 1.5);
    for (let i = 0; i < density; i++) {
      const offsetX = (Math.random() - 0.5) * size * 2;
      const offsetY = (Math.random() - 0.5) * size * 2;
      ctx.beginPath();
      ctx.arc(x + offsetX, y + offsetY, size / 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  undo() {
    if (!this.paths.length) return;
    this.redoStack.push(this.paths.pop());
    this.redrawAll();
  }

  redo() {
    if (!this.redoStack.length) return;
    this.paths.push(this.redoStack.pop());
    this.redrawAll();
  }

  redrawAll() {
    const ctx = this.ctx;

    // Reset canvas + white background
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let p of this.paths) {
      ctx.beginPath();
      ctx.moveTo(p.points[0].x, p.points[0].y);
      this.applyStyle(p);

      p.points.forEach((pt) => {
        if (p.brushType === "spray") {
          this.spray(pt.x, pt.y, p.color, p.size);
        } else {
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
        }
      });
      ctx.globalCompositeOperation = "source-over";
    }
  }

  applyStyle(p) {
    const ctx = this.ctx;

    switch (p.brushType) {
      case "highlighter":
        ctx.strokeStyle = this._alpha(p.color, 0.3);
        ctx.lineWidth = p.size * 3;
        break;

      case "calligraphy":
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 1.4;
        break;

      case "eraser":
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = p.size * 3;
        break;

      default:
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.globalCompositeOperation = "source-over";
        break;
    }
  }

  _alpha(hex, val) {
    let c = hex.slice(1);
    if (c.length === 3) c = c.split("").map(x => x + x).join("");
    const r = parseInt(c.slice(0,2),16);
    const g = parseInt(c.slice(2,4),16);
    const b = parseInt(c.slice(4,6),16);
    return `rgba(${r},${g},${b},${val})`;
  }
}
