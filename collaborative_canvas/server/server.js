// server/server.js (exists in your repo)
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

app.use(express.static(path.join(__dirname, "../client")));

io.on("connection", (socket) => {
  console.log("connected", socket.id);

  socket.on("draw", (data) => {
    socket.broadcast.emit("draw", data);
  });

  socket.on("undo", () => socket.broadcast.emit("undo"));
  socket.on("redo", () => socket.broadcast.emit("redo"));

  socket.on("disconnect", () => {
    console.log("disconnected", socket.id);
  });
});

server.listen(PORT, () => console.log("Server running:", PORT));
