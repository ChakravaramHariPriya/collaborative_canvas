// main.js - connects UI, canvas manager, and socket.io
import { CanvasManager } from "./canvas.js";

const socket = io(); // connect to server at same origin
const canvasEl = document.getElementById("canvas");
const cm = new CanvasManager("canvas");

// UI references
const colorPicker = document.getElementById("colorPicker");
const brushSizeEl = document.getElementById("brushSize");
const brushTypeEl = document.getElementById("brushType");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const statusText = document.getElementById("statusText");

let color = colorPicker.value || "#000000";
let size = parseInt(brushSizeEl.value) || 5;
let brushType = brushTypeEl.value || "normal";
let isLocalDrawing = false;
let clientId = null;

// Show connection status
socket.on("connect", () => {
  clientId = socket.id;
  statusText.textContent = "Status: connected (" + clientId + ")";
});
socket.on("disconnect", () => {
  statusText.textContent = "Status: disconnected";
});

// Listen for draw events from server
socket.on("draw", (msg) => {
  if (!msg) return;
  const { type, id, x, y, color, size, brushType } = msg;
  // ignore our own events if echoed back
  if (id === clientId) return;

  if (type === "start") cm.remoteStart(id, x, y, color, size, brushType);
  else if (type === "move") cm.remoteDraw(id, x, y);
  else if (type === "end") cm.remoteEnd(id);
});

socket.on("undo", () => {
  cm.undo();
});
socket.on("redo", () => {
  cm.redo();
});

// UI bindings
colorPicker.addEventListener("input", e => color = e.target.value);
brushSizeEl.addEventListener("input", e => size = parseInt(e.target.value));
brushTypeEl.addEventListener("change", e => brushType = e.target.value);

undoBtn.addEventListener("click", () => {
  cm.undo();
  socket.emit("undo");
});
redoBtn.addEventListener("click", () => {
  cm.redo();
  socket.emit("redo");
});

// helper to emit draw events (throttled)
let lastEmit = 0;
function emitDraw(type, x, y) {
  const now = Date.now();
  // throttle move emissions to ~30-60 FPS
  if (type === "move" && now - lastEmit < 16) return;
  lastEmit = now;
  socket.emit("draw", {
    type,
    id: clientId,
    x,
    y,
    color,
    size,
    brushType
  });
}

// Mouse / touch handlers
function getCanvasPoint(e) {
  const rect = canvasEl.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

canvasEl.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const p = getCanvasPoint(e);
  isLocalDrawing = true;
  cm.startDrawing(p.x, p.y, color, size, brushType);
  emitDraw("start", p.x, p.y);
});

canvasEl.addEventListener("pointermove", (e) => {
  if (!isLocalDrawing) return;
  const p = getCanvasPoint(e);
  cm.drawLine(p.x, p.y);
  emitDraw("move", p.x, p.y);
});

window.addEventListener("pointerup", (e) => {
  if (!isLocalDrawing) return;
  const p = getCanvasPoint(e);
  cm.stopDrawing();
  emitDraw("end", p.x, p.y);
  isLocalDrawing = false;
});

// initialize sizing to match CSS container (equal height)
function initSizing() {
  // Ensure the canvas parent has a computed height (via CSS stage)
  // Set the canvas element's CSS height to fill parent
  const stage = document.querySelector('.stage');
  const sidebar = document.querySelector('.sidebar');
  // compute stage height (use 68vh of window if stage doesn't have fixed)
  const stageHeight = Math.min(window.innerHeight * 0.72, window.innerHeight - 120);
  // set fixed height to stage children so canvas and sidebar match
  stage.style.height = stageHeight + "px";
  // set canvas element to fill
  const canvasWrap = document.querySelector('.canvas-wrap');
  canvasWrap.style.height = "100%";
  // after CSS sizes set, call internal resize to set pixel buffer
  cm.resizeCanvas();
}
window.addEventListener("load", initSizing);
window.addEventListener("resize", () => {
  initSizing();
  cm.resizeCanvas();
});
