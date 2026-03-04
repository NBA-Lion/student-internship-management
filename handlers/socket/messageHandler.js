/**
 * Socket: xử lý tin nhắn (NewMessage, delete_message, MarkAsRead)
 * + Trả lời tự động khi sinh viên nhắn tới Admin/Hỗ trợ (chiến lược cấu hình trong autoReplyService).
 */
const User = require("../../models/User");
const Message = require("../../models/Message");
const {
  shouldSendAutoReply,
  createAutoReplyMessage,
  SYSTEM_DISPLAY_NAME,
} = require("../../services/autoReplyService");

function registerMessageHandler(io, socket, userId) {
  socket.on("NewMessage", async (data) => {
    try {
      const { to, message: content, type: msgType } = data || {};
      const from = userId;

      if (!to || content == null || String(content).trim() === "") {
        socket.emit("MessageError", { message: "Thiếu người nhận hoặc nội dung" });
        return;
      }
      if (to === from) {
        socket.emit("MessageError", { message: "Không thể gửi tin nhắn cho chính mình" });
        return;
      }

      // Resolve ADMIN và lấy danh sách tất cả admin để nhận diện kênh hỗ trợ
      const adminIds = await User.find({ role: "admin" }).distinct("student_code");
      let toResolved = to;
      if (to === "ADMIN" && adminIds.length > 0) {
        toResolved = adminIds[0];
      }

      const senderDoc = await User.findOne({ student_code: from }).select("role company_id").lean();
      const senderRole = (senderDoc?.role || "").toLowerCase();
      if (senderRole === "company_hr" || senderRole === "mentor") {
        const receiverUser = await User.findOne({ student_code: toResolved }).select("role company_id").lean();
        if (!receiverUser) {
          socket.emit("MessageError", { message: "Người nhận không tồn tại." });
          return;
        }
        const sameCompany =
          senderDoc?.company_id &&
          receiverUser?.company_id &&
          String(senderDoc.company_id) === String(receiverUser.company_id);
        const isAdmin = receiverUser.role === "admin";
        if (!sameCompany && !isAdmin) {
          socket.emit("MessageError", {
            message: "Bạn chỉ được nhắn tin với người dùng trong nội bộ công ty mình hoặc Admin.",
          });
          return;
        }
      }

      const messageContent = String(content).trim();
      let savedMessage = null;
      try {
        savedMessage = await Message.create({
          sender: from,
          receiver: toResolved,
          message: messageContent,
          type: msgType === "image" || msgType === "file" ? msgType : "text",
        });
      } catch (dbErr) {
        console.error(">>> [Socket] Message.create failed:", dbErr.message);
        socket.emit("MessageError", { message: "Lỗi lưu tin nhắn: " + dbErr.message });
        return;
      }

      if (!savedMessage || !savedMessage._id) {
        console.error(">>> [Socket] Message.create did not return saved document");
        socket.emit("MessageError", { message: "Lỗi lưu tin nhắn" });
        return;
      }

      const senderUser = await User.findOne({ student_code: from }).select("student_code full_name avatar_url");
      const receiverUser = await User.findOne({ student_code: toResolved }).select("student_code full_name avatar_url");
      const previousCount = await Message.countDocuments({
        $or: [
          { sender: from, receiver: toResolved },
          { sender: toResolved, receiver: from },
        ],
        _id: { $ne: savedMessage._id },
      });
      const isNewContact = previousCount === 0;

      const messagePayload = {
        _id: savedMessage._id,
        message: savedMessage.message,
        content: savedMessage.message,
        from: {
          vnu_id: from,
          id: from,
          name: senderUser?.full_name || "Người dùng",
          avatar_url: senderUser?.avatar_url || null,
        },
        to: {
          vnu_id: toResolved,
          id: toResolved,
          name: receiverUser?.full_name || "Người dùng",
          avatar_url: receiverUser?.avatar_url || null,
        },
        sender: from,
        receiver: toResolved,
        createdAt: savedMessage.createdAt,
        createdDate: savedMessage.createdAt,
        timestamp: savedMessage.createdAt,
        type: savedMessage.type,
        is_read: false,
        newContact: isNewContact,
      };

      // Emit tới room đúng: nếu gửi tới ADMIN thì emit room "ADMIN" và room admin cụ thể
      const emitToReceiver = to === "ADMIN" ? "ADMIN" : toResolved;
      io.to(emitToReceiver).emit("NewMessage", { ...messagePayload, isSender: false, selfSend: false });
      socket.emit("NewMessage", { ...messagePayload, isSender: true, selfSend: true });
      console.log(`>>> [Socket] Message saved & emitted: ${from} -> ${toResolved} | _id: ${savedMessage._id}`);

      // --- Trả lời tự động: chỉ khi sinh viên nhắn tới bất kỳ tài khoản ADMIN nào / kênh ADMIN ---
      const isStudentToAdmin = senderRole === "student" && adminIds.includes(toResolved);
      if (isStudentToAdmin && adminIds.length > 0) {
        try {
          const shouldSend = await shouldSendAutoReply({ studentCode: from, adminIds });
          if (shouldSend) {
            const { message: autoMsg } = await createAutoReplyMessage({
              receiverStudentCode: from,
              senderAdminCode: adminIds[0],
            });
            const autoPayload = {
              _id: autoMsg._id,
              message: autoMsg.message,
              content: autoMsg.message,
              from: {
                vnu_id: adminIds[0],
                id: adminIds[0],
                name: SYSTEM_DISPLAY_NAME,
                avatar_url: null,
              },
              to: { vnu_id: from, id: from, name: senderUser?.full_name || "Người dùng", avatar_url: senderUser?.avatar_url || null },
              sender: adminIds[0],
              receiver: from,
              createdAt: autoMsg.createdAt,
              createdDate: autoMsg.createdAt,
              timestamp: autoMsg.createdAt,
              type: "text",
              is_read: false,
              is_auto_reply: true,
            };
            io.to(from).emit("NewMessage", { ...autoPayload, isSender: false, selfSend: false });
            io.to("ADMIN").emit("NewMessage", { ...autoPayload, isSender: false, selfSend: false });
            console.log(`>>> [Socket] Auto-reply sent to student ${from} | _id: ${autoMsg._id}`);
          }
        } catch (autoErr) {
          console.error(">>> [Socket] Auto-reply failed (non-fatal):", autoErr.message);
          // Không emit MessageError cho user — tin của họ đã gửi thành công
        }
      }
    } catch (e) {
      console.error(">>> [Socket] Error in NewMessage handler:", e.message);
      socket.emit("MessageError", { message: "Lỗi gửi tin nhắn: " + e.message });
    }
  });

  socket.on("delete_message", async (messageId) => {
    try {
      if (!messageId) {
        socket.emit("message_deleted_error", { message: "Thiếu messageId" });
        return;
      }
      const msg = await Message.findById(messageId);
      if (!msg) {
        socket.emit("message_deleted_error", { message: "Không tìm thấy tin nhắn" });
        return;
      }
      if (msg.sender !== userId) {
        socket.emit("message_deleted_error", { message: "Chỉ người gửi mới được thu hồi" });
        return;
      }
      const deletedPayload = {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        message: "Tin nhắn đã bị thu hồi",
      };
      await Message.updateOne({ _id: messageId }, { $set: deletedPayload });
      const idStr = String(msg._id);
      io.to(msg.sender).emit("message_deleted", idStr);
      io.to(msg.receiver).emit("message_deleted", idStr);
      console.log(">>> [Socket] Message recalled:", idStr, "by", userId);
    } catch (e) {
      console.error(">>> [Socket] delete_message error:", e.message);
      socket.emit("message_deleted_error", { message: e.message || "Lỗi thu hồi tin nhắn" });
    }
  });

  socket.on("MarkAsRead", async (data) => {
    try {
      const otherUserId = data.from;
      const myId = userId;
      if (!otherUserId) return;
      const result = await Message.updateMany(
        { sender: otherUserId, receiver: myId, is_read: false },
        { $set: { is_read: true, read_at: new Date() } }
      );
      if (result.modifiedCount > 0) {
        io.to(otherUserId).emit("MessagesRead", { by: myId, count: result.modifiedCount });
      }
    } catch (e) {
      console.error(">>> [Socket] Error marking as read:", e.message);
    }
  });
}

module.exports = registerMessageHandler;
