/**
 * Trả lời tự động cho sinh viên khi nhắn tới kênh Admin/Hỗ trợ.
 *
 * Mặc định (out-of-the-box):
 * - Gửi MỘT tin auto đầu tiên mỗi hội thoại (once_per_conversation).
 * - Có thể bật chế độ lặp lại theo thời gian chờ (interval) bằng cách chỉnh cấu hình bên dưới.
 * - Tin lưu với is_auto_reply: true, hiển thị "Hệ thống" ở frontend.
 */

const Message = require("../models/Message");

/** Tên hiển thị cho tin từ hệ thống (phân tách rõ với Admin/HR/Mentor) */
const SYSTEM_DISPLAY_NAME = "Hệ thống";

/** Nội dung mặc định (template) — có thể mở rộng sau bằng AI + fallback này */
const DEFAULT_AUTO_REPLY_TEMPLATE =
  "Chào bạn, chúng tôi đã nhận được tin nhắn.\n" +
  "Để hỗ trợ nhanh hơn, bạn vui lòng trả lời thêm các thông tin sau trong cuộc trò chuyện này:\n" +
  "1) Họ và tên đầy đủ:\n" +
  "2)Số điện thoại:\n" +
  "2) Mã sinh viên:\n" +
  "3) Lớp / Khóa:\n" +
  "4) Vấn đề bạn đang gặp phải (mô tả ngắn gọn):\n" +
  "5) Bạn mong muốn được hỗ trợ bởi: Admin / Phòng Đào tạo / Công ty / Mentor?\n" +
  "Bộ phận phụ trách sẽ phản hồi trong thời gian sớm nhất. Cảm ơn bạn!";

/**
 * Cấu hình chiến lược trả lời tự động.
 *
 * AUTO_REPLY_STRATEGY:
 * - "once"           : chỉ gửi 1 lần trong toàn bộ cuộc hội thoại (mặc định).
 * - "interval"       : có thể gửi lại sau một khoảng thời gian nếu chưa có người thật phản hồi.
 *
 * AUTO_REPLY_INTERVAL_MINUTES:
 * - Dùng khi strategy = "interval".
 * - Ví dụ: 60 → sau 60 phút kể từ lần auto-reply gần nhất (và chưa có phản hồi thật) mới gửi lại.
 *
 * AUTO_REPLY_MAX_PER_DAY:
 * - Giới hạn số lần auto-reply tối đa cho 1 sinh viên trong 24h, tránh spam.
 */
const AUTO_REPLY_STRATEGY =
  (process.env.AUTO_REPLY_STRATEGY || "interval").toLowerCase() === "interval"
    ? "interval"
    : "once";

const AUTO_REPLY_INTERVAL_MINUTES = Number(
  process.env.AUTO_REPLY_INTERVAL_MINUTES || 30
);

const AUTO_REPLY_MAX_PER_DAY = Number(
  process.env.AUTO_REPLY_MAX_PER_DAY || 2
);

/**
 * Lấy template trả lời tự động (sau này có thể gọi AI, wrap try/catch và fallback).
 * @returns {string}
 */
function getAutoReplyContent() {
  return DEFAULT_AUTO_REPLY_TEMPLATE;
}

/**
 * Quyết định có nên gửi auto-reply tại thời điểm này hay không.
 * - Strategy "once": gửi đúng 1 lần / hội thoại (như hiện tại).
 * - Strategy "interval": gửi lại sau N phút nếu:
 *   + Đã từng gửi auto-reply, nhưng
 *   + Không có tin nhắn thật từ Admin sau lần auto gần nhất, và
 *   + Chưa vượt quá giới hạn số lần / ngày.
 *
 * @param {object} params
 * @param {string} params.studentCode   - student_code của sinh viên (người vừa gửi)
 * @param {string[]} params.adminIds    - danh sách student_code của admin
 * @returns {Promise<boolean>}          - true nếu NÊN gửi auto-reply
 */
async function shouldSendAutoReply({ studentCode, adminIds }) {
  if (!studentCode || !Array.isArray(adminIds) || adminIds.length === 0) {
    return false;
  }

  // Chiến lược 1: chỉ gửi 1 lần trong hội thoại
  if (AUTO_REPLY_STRATEGY === "once") {
    const exists = await Message.exists({
      sender: { $in: adminIds },
      receiver: studentCode,
      is_auto_reply: true,
    });
    return !exists;
  }

  // Chiến lược 2: gửi lại định kỳ nếu chưa có phản hồi thật
  const now = new Date();

  const lastAuto = await Message.findOne({
    sender: { $in: adminIds },
    receiver: studentCode,
    is_auto_reply: true,
  })
    .sort({ createdAt: -1 })
    .lean();

  // Chưa có auto-reply nào → gửi lần đầu
  if (!lastAuto) {
    return true;
  }

  // Giới hạn số lần / 24h
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const autoCountLastDay = await Message.countDocuments({
    sender: { $in: adminIds },
    receiver: studentCode,
    is_auto_reply: true,
    createdAt: { $gte: since },
  });
  if (autoCountLastDay >= AUTO_REPLY_MAX_PER_DAY) {
    return false;
  }

  // Đã gần lần auto gần nhất đủ lâu chưa?
  const diffMs = now.getTime() - new Date(lastAuto.createdAt).getTime();
  if (diffMs < AUTO_REPLY_INTERVAL_MINUTES * 60 * 1000) {
    return false;
  }

  // Kiểm tra xem đã có tin nhắn THẬT từ Admin sau lần auto gần nhất chưa
  const lastHumanAdminMessage = await Message.findOne({
    sender: { $in: adminIds },
    receiver: studentCode,
    $or: [
      { is_auto_reply: { $exists: false } },
      { is_auto_reply: false },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  if (
    lastHumanAdminMessage &&
    new Date(lastHumanAdminMessage.createdAt).getTime() >
      new Date(lastAuto.createdAt).getTime()
  ) {
    // Đã có người thật trả lời sau lần auto gần nhất → không gửi nữa
    return false;
  }

  return true;
}

/**
 * Tạo và lưu tin nhắn trả lời tự động (sender = admin đại diện, is_auto_reply = true).
 * @param {object} opts
 * @param {string} opts.receiverStudentCode - sinh viên nhận tin (người vừa gửi)
 * @param {string} opts.senderAdminCode - admin đại diện (để conversation thống nhất, thường adminIds[0])
 * @returns {Promise<{ message: object, displayName: string }>} message doc và tên hiển thị "Hệ thống"
 */
async function createAutoReplyMessage({ receiverStudentCode, senderAdminCode }) {
  const content = getAutoReplyContent();
  const msg = await Message.create({
    sender: senderAdminCode,
    receiver: receiverStudentCode,
    message: content,
    type: "text",
    is_auto_reply: true,
  });
  return { message: msg, displayName: SYSTEM_DISPLAY_NAME };
}

module.exports = {
  SYSTEM_DISPLAY_NAME,
  getAutoReplyContent,
  shouldSendAutoReply,
  createAutoReplyMessage,
};
