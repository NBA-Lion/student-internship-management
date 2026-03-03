/**
 * Socket: typing indicators
 */
function registerTypingHandler(io, socket, userId) {
  socket.on("Typing", (data) => {
    if (data?.to) {
      io.to(data.to).emit("UserTyping", {
        from: userId,
        name: socket.userInfo?.name || "Người dùng",
      });
    }
  });

  socket.on("StopTyping", (data) => {
    if (data?.to) {
      io.to(data.to).emit("UserStopTyping", { from: userId });
    }
  });
}

module.exports = registerTypingHandler;
