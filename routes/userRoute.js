const express = require("express");
const user_route = express();
const body_parser = require("body-parser");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const userControllers = require("../controllers/userControllers");
const session = require("express-session");
const auth = require("../middlewares/auth");
const { SESSION_SECRET } = process.env;
user_route.use(session({ secret: SESSION_SECRET }));
user_route.use(express.json());
user_route.use(body_parser.json());
user_route.use(body_parser.urlencoded({ extended: true }));
user_route.use(cookieParser());
user_route.set("view engine", "ejs");
user_route.set("views", "./views");
user_route.use(express.static("public"));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/images"));
  },
  filename: function (req, file, cb) {
    const name = Date.now() + "-" + file.originalname;
    cb(null, name);
  },
});

const upload = multer({ storage: storage });

user_route.get("/register", auth.isLogout, userControllers.registerLoad);
user_route.post("/register", upload.single("image"), userControllers.register);
user_route.get("/", auth.isLogout, userControllers.loadLogin);
user_route.post("/", userControllers.login);
user_route.get("/logout", auth.isLogin, userControllers.logout);
user_route.get("/dashboard", auth.isLogin, userControllers.loadDashboard);
user_route.post("/save-chat", userControllers.saveChat);
user_route.post("/delete-chat", userControllers.deleteChat);
user_route.post("/update-chat", userControllers.updateChat);
user_route.get("/groups",auth.isLogin,userControllers.loadGroups);
user_route.post("/groups",upload.single("image"),userControllers.createGroup);
user_route.post("/get-members",auth.isLogin,userControllers.getMembers);
user_route.post("/add-members",auth.isLogin,userControllers.addMembers);
user_route.post("/update-chat-group",auth.isLogin,upload.single("image"),userControllers.updateChatGroup);
user_route.post("/delete-chat-group",auth.isLogin,userControllers.deleteChatGroup);
user_route.get("/share-group/:id",userControllers.shareGroup);
user_route.post("/join-group",auth.isLogin,userControllers.joinGroup);

user_route.get("/groups-chat",auth.isLogin,userControllers.groupChats);
user_route.post("/group-chat-save", userControllers.groupChatSave);
user_route.post("/load-group-chats", userControllers.loadGroupChats);
user_route.post("/delete-group-chat", userControllers.deleteGroupChats);
user_route.post("/update-group-chat", userControllers.updateGroupChats);



user_route.get("*", function (req, res) {
  res.redirect("/");
});

module.exports = user_route;
