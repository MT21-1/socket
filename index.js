const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

let rooms = [];
let host_socket_id = {};
let socket_host_id = {};
io.on("connection", (socket) => {
  console.log(`User Connected ${socket.id}`);
  socket.on("disconnect", function () {
    console.log("disconnecting.. ", socket.id);
    HOST_ID = socket_host_id[socket.id];
    if (HOST_ID != undefined) {
      console.log(HOST_ID);
      let room = rooms.find((r) => r.hostId === HOST_ID);
      const ROOM_ID = room.roomId;
      rooms.pop(room);
      console.log(ROOM_ID + " Successfuly CLOSED ");
      io.to(ROOM_ID).emit("leave_room", { roomId: ROOM_ID });
      socket.leave(ROOM_ID);
    } else {
      //emit ke host participan dah out.
      console.log("out");
    }
  });
  //host rights
  //data = {roomId: "xxx", isStarted: "xxx"}
  socket.on("create_room", (data) => {
    const ROOM_ID = data.roomId;
    let room = rooms.find((r) => r.roomId === ROOM_ID);
    host_socket_id[data.hostId] = socket.id;
    socket_host_id[socket.id] = data.hostId;
    console.log(host_socket_id);
    console.log(socket_host_id);
    if (room != undefined) {
      //ini roomID exist, minta generate ulang
      io.to(socket.id).emit("room_exist", true);
      return;
    }
    rooms.push(data);
    console.log(ROOM_ID + " Successfuly Created By: " + data.hostId);
    socket.join(ROOM_ID);
    io.to(socket.id).emit("create_room_feedback", data);
  });

  socket.on("close_room", (data) => {
    console.log(data);
    const ROOM_ID = data.roomId;
    let room = rooms.find((r) => r.roomId === ROOM_ID);
    rooms.pop(room);
    console.log(ROOM_ID + " Successfuly CLOSED ");
    io.to(ROOM_ID).emit("leave_room", { roomId: ROOM_ID });
    socket.leave(ROOM_ID);
  });
  //participan rights
  socket.on("join_room", (data) => {
    //data = {roomId, userId}
    //validate room isstarted sama exist
    const ROOM_ID = data.roomId;
    let room = rooms.find((r) => r.roomId === ROOM_ID);

    //ga ada room
    if (room == undefined || room.isStarted == true) {
      console.log(ROOM_ID + " ROOM NOT FOUND");
      io.to(socket.id).emit("join_room_feedback", {
        roomId: ROOM_ID,
        isSuccess: false,
      });
      return;
    }
    //join room
    socket.join(data.roomId);
    //SEND SIGNAL TO USER SUCCESS JOIN
    io.to(socket.id).emit("join_room_feedback", {
      roomId: ROOM_ID,
      isSuccess: true,
    });

    //SEND SIGNAL KE ROOM MASTER dia MASUK
    io.to(host_socket_id[room.hostId]).emit("new_participant_join", {
      participantId: data.participantId,
    });
  });

  socket.on("leave_room", (data) => {
    const ROOM_ID = data.roomId;
    console.log(ROOM_ID + " Successfuly Left ");
    socket.leave(ROOM_ID);
  });
});

server.listen(3333, () => {
  console.log("listening on *:3333");
});
