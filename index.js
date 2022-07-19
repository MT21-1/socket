const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { start } = require("repl");

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
let room_participants = {};
io.on("connection", (socket) => {
  console.log(`User Connected ${socket.id}`);

  socket.on("disconnect", function () {
    console.log("disconnecting.. ", socket.id);
    HOST_ID = socket_host_id[socket.id];
    if (HOST_ID != undefined) {
      console.log(HOST_ID);
      let room = rooms.find((r) => r.hostId === HOST_ID);
      if (room != undefined) {
        const ROOM_ID = room.roomId;
        rooms.pop(room);
        console.log(ROOM_ID + " Successfuly CLOSED ");
        io.to(ROOM_ID).emit("leave_room", { roomId: ROOM_ID });
        socket.leave(ROOM_ID);
      }
    } else {
      //emit ke host participan dah out.
      if (room_participants[socket.id] != undefined){
        const participantData = room_participants[socket.id];
        console.log(participantData);
        const ROOM_ID = participantData.roomId;
        const participantId = participantData.participantId;
  
        let room = rooms.find((r) => r.roomId === ROOM_ID);
        console.log("participant leave");
        socket.leave(ROOM_ID);
        if (room != undefined) {
          host_socket = host_socket_id[room.hostId];
          io.to(host_socket).emit("new_participant_leave", {
            participantId: participantId,
          });
        }

      }


    }
  });
  //host rights
  //data = {roomId: "xxx", isStarted: "xxx"}
  socket.on("create_room", (data) => {
    let ROOM_ID = data.roomId;
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
    if (data.roomId != "") {
      console.log(data);
      const ROOM_ID = data.roomId;
      let room = rooms.find((r) => r.roomId === ROOM_ID);
      rooms.pop(room);
      console.log(ROOM_ID + " Successfuly CLOSED ");
      io.to(ROOM_ID).emit("leave_room", { roomId: ROOM_ID });
      socket.leave(ROOM_ID);
    }
  });
  //participan rights
  socket.on("join_room", (data) => {
    //data = {roomId, userId}
    //validate room isstarted sama exist
    console.log(data);
    let ROOM_ID = data.roomId;
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
    room_participants[socket.id] = {
      roomId: data.roomId,
      participantId: data.participantId,
    };
    //SEND SIGNAL KE ROOM MASTER dia MASUK
    io.to(host_socket_id[room.hostId]).emit("new_participant_join", {
      participantId: data.participantId,
    });
  });

  socket.on("leave_room", (data) => {
    let ROOM_ID = data.roomId;
    let room = rooms.find((r) => r.roomId === ROOM_ID);
    console.log("participant leave");
    console.log(data);
    socket.leave(ROOM_ID);
    if (room != undefined) {
      host_socket = host_socket_id[room.hostId];
      io.to(host_socket).emit("new_participant_leave", {
        participantId: data.participantId,
      });
    }
  });

  // data ->
  // - roomId
  // - hasEnded
  // - question
  const startQuestion = (data) => {
    let ROOM_ID = data.roomId;
    if (data.hasEnded == false) {
      // console.log(data)
      rooms.find((r) => (r.roomId = ROOM_ID)).isStarted = true;
      let question = data.question;
      console.log(ROOM_ID)
      // question ->
      // questionId
      // question
      // answers

      //kirim question ke participant dan start timer
      io.to(ROOM_ID).emit("start_question", {
        question: question,
        roomId : ROOM_ID,
        quizId : data.quizId
      });

    } else {
      //minta participan ngeup score ke db
      console.log("room end")
      io.to(ROOM_ID).emit("question_end", {});
    }
  };


  socket.on("start_room", (data) => {
    startQuestion(data);
  });

  socket.on("timer_end", (data)=>{
    if (data != undefined){
      io.to(data.roomId).emit("redirect_loading", {
        roomId : data.roomId 
      })


    }
  })

});

server.listen(3333, () => {
  console.log("listening on *:3333");
});
