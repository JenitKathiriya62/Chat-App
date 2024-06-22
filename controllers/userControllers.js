const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const Chat = require("../models/chatModel");
const Group = require("../models/groupModel");
const Member = require("../models/memberModel");
const GroupChat = require("../models/groupChatModel");
const mongoose = require("mongoose");
const { parse } = require("dotenv");
const registerLoad = async (req, res) => {
  try {
    res.render("register");
  } catch (error) {
    console.log(error.message);
  }
};

const register = async (req, res) => {
  try {
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    const user = new User({
      name: req.body.name,
      email: req.body.email,
      image: "images/" + req.file.filename,
      password: passwordHash,
    });

    await user.save();
    return res.render("register", {
      message: "Your Registration Has been Successfull",
    });
  } catch (error) {
    console.log(error.message);
  }
};

const loadLogin = async (req, res) => {
  try {
    return res.render("login");
  } catch (error) {
    console.log(error.message);
  }
};

const login = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const userData = await User.findOne({ email: email });

    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        req.session.user = userData;
        res.cookie(`user`, JSON.stringify(userData));
        return res.redirect("/dashboard");
      } else {
        return res.render("login", {
          message: "Email and Password Wrong !",
        });
      }
    } else {
      return res.render("login", {
        message: "Email and Password Wrong !",
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};
const logout = async (req, res) => {
  try {
    res.clearCookie("user");
    req.session.destroy();
    return res.redirect("/");
  } catch (error) {
    console.log(error.message);
  }
};

const loadDashboard = async (req, res) => {
  try {
    var users = await User.find({ _id: { $nin: [req.session.user._id] } });
    return res.render("dashboard", { user: req.session.user, users: users });
  } catch (error) {
    console.log(error.message);
  }
};

const saveChat = async (req, res) => {
  try {
    var chat = new Chat({
      sender_id: req.body.sender_id,
      receiver_id: req.body.receiver_id,
      message: req.body.message,
    });

    var newChat = await chat.save();
    return res
      .status(200)
      .send({ success: true, msg: "Chat Added", data: newChat });
  } catch (error) {
    return res.status(400).send({ success: false, msg: error.message });
  }
};

const deleteChat = async (req, res) => {
  try {
    await Chat.deleteOne({ _id: req.body.id });
    return res.status(200).send({ success: true });
  } catch (error) {
    return res.status(400).send({ success: false, msg: error.message });
  }
};

const updateChat = async (req, res) => {
  try {
    await Chat.findByIdAndUpdate(
      { _id: req.body.id },
      {
        $set: {
          message: req.body.message,
        },
      }
    );
    return res.status(200).send({ success: true });
  } catch (error) {
    return res.status(400).send({ success: false, msg: error.message });
  }
};

const loadGroups = async (req, res) => {
  try {
    const groups = await Group.find({ creator_id: req.session.user._id });

    return res.render("group", { groups: groups });
  } catch (error) {
    console.log(error.message);
  }
};

const createGroup = async (req, res) => {
  try {
    const group = new Group({
      creator_id: req.session.user._id,
      name: req.body.name,
      image: "images/" + req.file.filename,
      limit: req.body.limit,
    });

    await group.save();
    const groups = await Group.find({ creator_id: req.session.user._id });

    return res.render("group", {
      message: req.body.name + " Group Created Successfully !",
      groups: groups,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const getMembers = async (req, res) => {
  try {
    const groupId = req.body.group_id;
    const userId = req.session.user._id;

    if (
      !mongoose.Types.ObjectId.isValid(groupId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res
        .status(400)
        .send({ success: false, message: "Invalid ID format" });
    }

    const groupObjectId = new mongoose.Types.ObjectId(groupId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    var users = await User.aggregate([
      {
        $lookup: {
          from: "members",
          localField: "_id",
          foreignField: "user_id",
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$group_id", groupObjectId] }],
                },
              },
            },
          ],
          as: "member",
        },
      },
      {
        $match: {
          _id: { $nin: [userObjectId] },
        },
      },
    ]);
    return res.status(200).send({ success: true, data: users });
  } catch (error) {
    console.log(error.message);
  }
};

const addMembers = async (req, res) => {
  try {
    if (!req.body.members) {
      return res
        .status(200)
        .send({ success: false, msg: "Please select any one Member" });
    } else if (req.body.members.length > parseInt(req.body.limit)) {
      return res.status(200).send({
        success: false,
        msg: "You can not select more than " + req.body.limit + " Members.",
      });
    } else {
      await Member.deleteMany({ group_id: req.body.group_id });

      var data = [];
      const members = req.body.members;

      for (let i = 0; i < members.length; i++) {
        //console.log(members[i]);
        data.push({
          group_id: req.body.group_id,
          user_id: members[i],
        });
      }

      await Member.insertMany(data);
      return res
        .status(200)
        .send({ success: true, msg: "Members added Successfully" });
    }
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

const updateChatGroup = async (req, res) => {
  try {
    if (parseInt(req.body.limit) < parseInt(req.body.last_limit)) {
      await Member.deleteMany({ group_id: req.body.id });
    }

    var updateObj;

    if (req.file != undefined) {
      updateObj = {
        name: req.body.name,
        image: "images/" + req.file.filename,
        limit: req.body.limit,
      };
    } else {
      updateObj = {
        name: req.body.name,
        limit: req.body.limit,
      };
    }

    await Group.findByIdAndUpdate(
      { _id: req.body.id },
      {
        $set: updateObj,
      }
    );

    return res
      .status(200)
      .send({ success: true, msg: "Chat Group Updated Successfully" });
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

const deleteChatGroup = async (req, res) => {
  try {
    await Group.deleteOne({ _id: req.body.id });
    await Member.deleteMany({ group_id: req.body.id });
    return res
      .status(200)
      .send({ success: true, msg: "Chat Group Deleted Successfully" });
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

const shareGroup = async (req, res) => {
  try {
    var groupData = await Group.findOne({ _id: req.params.id });

    if (!groupData) {
      return res.render("error", { message: "404 Not Found!" });
    } else if (req.session.user == undefined) {
      return res.render("error", {
        message: "You need to login first to access a Share URL",
      });
    } else {
      var totalMembers = await Member.countDocuments({
        group_id: req.params.id,
      });

      var avilable = groupData.limit - totalMembers;

      var isOwner = groupData.creator_id == req.session.user._id ? true : false;

      var isJoined = await Member.countDocuments({
        group_id: req.params.id,
        user_id: req.session.user._id,
      });

      return res.render("shareLink", {
        group: groupData,
        avilable: avilable,
        totalMembers: totalMembers,
        isOwner: isOwner,
        isJoined: isJoined,
      });
    }
  } catch (error) {
    return res.status(400).send({ success: false, msg: error.message });
  }
};

const joinGroup = async (req, res) => {
  try {
    const member = new Member({
      group_id: req.body.group_id,
      user_id: req.session.user._id,
    });

    await member.save();

    return res
      .status(200)
      .send({ success: true, msg: "Chat Group Joined Successfully" });
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

const groupChats = async (req, res) => {
  try {
    const myGroups = await Group.find({ creator_id: req.session.user._id });
    const joinedGroups = await Member.find({
      user_id: req.session.user._id,
    }).populate("group_id");

    return res.render("chat-group", {
      myGroups: myGroups,
      joinedGroups: joinedGroups,
    });
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

const groupChatSave = async (req, res) => {
  try {
    var groupChat = new GroupChat({
      sender_id: req.body.sender_id,
      group_id: req.body.group_id,
      message: req.body.message,
    });

    var newGroupChat = await groupChat.save();
    return res
      .status(200)
      .send({ success: true, msg: "Chat Added", data: newGroupChat });
  } catch (error) {
    return res.status(400).send({ success: false, msg: error.message });
  }
};

const loadGroupChats = async (req, res) => {
  try {
    var groupChats = await GroupChat.find({ group_id: req.body.group_id });

    return res.status(200).send({ success: true, data: groupChats });
  } catch (error) {
    return res.status(400).send({ success: false, msg: error.message });
  }
};

const deleteGroupChats = async (req, res) => {
  try {
    await GroupChat.deleteOne({ _id: req.body.id });
    return res.status(200).send({ success: true, msg: "Chat Deleted" });
  } catch (error) {
    return res.status(400).send({ success: false, msg: error.message });
  }
};

const updateGroupChats = async (req, res) => {
  try {

    await GroupChat.findByIdAndUpdate(
      { _id: req.body.id },
      {
        $set: {
          message: req.body.message,
        },
      }
    );
    return res.status(200).send({ success: true, msg: "Chat Updated" });
  } catch (error) {
    return res.status(400).send({ success: false, msg: error.message });
  }
};

module.exports = {
  registerLoad,
  register,
  loadLogin,
  login,
  logout,
  loadDashboard,
  saveChat,
  deleteChat,
  updateChat,
  loadGroups,
  createGroup,
  getMembers,
  addMembers,
  updateChatGroup,
  deleteChatGroup,
  shareGroup,
  joinGroup,
  groupChats,
  groupChatSave,
  loadGroupChats,
  deleteGroupChats,
  updateGroupChats,
};
