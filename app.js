require("dotenv").config();

var mongoose = require("mongoose");
const app = require("express")();
const userRoute = require("./routes/userRoute");
const http = require("http").Server(app);
const io = require("socket.io")(http);
const User = require("./models/userModel");
const Chat = require("./models/chatModel");

mongoose.connect("mongodb url here");

app.use("/", userRoute);

var usp = io.of("/user-namespace");

usp.on("connection", async function (socket) {
  console.log("User Connected");
  var userId = socket.handshake.auth.token;
  await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: "1" } });
  socket.broadcast.emit("getOnlineUser", { user_id: userId });

  socket.on("disconnect", async function () {
    console.log("user Disconnect");
    var userId = socket.handshake.auth.token;

    await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: "0" } });
    socket.broadcast.emit("getOfflineUser", { user_id: userId });
  });

  socket.on("newChat", function (data) {
    socket.broadcast.emit("loadNewChat", data);
  });

  socket.on("existsChat", async function (data) {
    var chats = await Chat.find({
      $or: [
        { sender_id: data.sender_id, receiver_id: data.receiver_id },
        { sender_id: data.receiver_id, receiver_id: data.sender_id },
      ],
    });

    socket.emit("loadchats", { chats: chats });
  });

  socket.on("chatDeleted", function (id) {
    socket.broadcast.emit("chatMessageDeleted", id);
  });

  socket.on("chatUpdated", function (data) {
    socket.broadcast.emit("chatMessageUpdated", data);
  });

  socket.on("newGroupChat", function (data) {
    socket.broadcast.emit("loadNewGroupChat", data);
  });


  socket.on("groupChatDeleted", function (id) {
    socket.broadcast.emit("groupChatMessageDeleted", id);
  });

  socket.on("groupChatUpdated", function (data) {
    socket.broadcast.emit("groupChatMessageUpdated", data);
  });


});

http.listen(3000, function () {
  console.log("server running");
});
