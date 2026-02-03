/**
 * Admin controller: dashboard statistics using MongoDB aggregation.
 * Data format is compatible with Recharts (name, value).
 */
const User = require("../models/User");
const InternshipPeriod = require("../models/InternshipPeriod");

/**
 * getDashboardStats - Returns summary counts and chart data for Admin Analytics Dashboard.
 * Uses MongoDB aggregation ($group) for status, period (đợt thực tập), and major distributions.
 */
async function getDashboardStats(req, res) {
  try {
    const matchStudent = { role: "student" };

    // --- 1. Summary counts ---
    const [total, interning, completed, rejected] = await Promise.all([
      User.countDocuments(matchStudent),
      User.countDocuments({
        ...matchStudent,
        $or: [
          { internship_status: { $in: ["Đang thực tập"] } },
          { registration_status: { $in: ["Đang thực tập"] } },
        ],
      }),
      User.countDocuments({
        ...matchStudent,
        $or: [
          { internship_status: { $in: ["Đã hoàn thành"] } },
          { registration_status: { $in: ["Đã hoàn thành", "Hoàn thành"] } },
        ],
      }),
      User.countDocuments({
        ...matchStudent,
        $or: [
          { internship_status: { $in: ["Từ chối"] } },
          { registration_status: { $in: ["Từ chối"] } },
        ],
      }),
    ]);

    // --- 2. Chart data: MongoDB aggregation ($group) ---

    // statusDistribution: { name: "Status Name", value: count }
    const statusPipeline = [
      { $match: matchStudent },
      {
        $project: {
          status: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$internship_status", null] },
                  { $ne: ["$internship_status", ""] },
                ],
              },
              then: "$internship_status",
              else: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$registration_status", null] },
                      { $ne: ["$registration_status", ""] },
                    ],
                  },
                  then: "$registration_status",
                  else: "Chưa đăng ký",
                },
              },
            },
          },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          name: "$_id",
          value: "$count",
        },
      },
    ];
    const statusDistribution = await User.aggregate(statusPipeline);

    // periodDistribution: Số SV theo đợt thực tập (internship_period_id -> lookup name, fallback internship_period)
    const periodPipeline = [
      { $match: matchStudent },
      {
        $lookup: {
          from: "internshipperiods",
          localField: "internship_period_id",
          foreignField: "_id",
          as: "periodDoc",
        },
      },
      {
        $project: {
          period: {
            $cond: {
              if: { $gt: [{ $size: "$periodDoc" }, 0] },
              then: { $arrayElemAt: ["$periodDoc.name", 0] },
              else: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$internship_period", null] },
                      { $ne: ["$internship_period", ""] },
                    ],
                  },
                  then: { $trim: { input: "$internship_period" } },
                  else: "Chưa chọn đợt",
                },
              },
            },
          },
        },
      },
      { $group: { _id: "$period", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, name: "$_id", value: "$count" } },
    ];
    let periodDistribution = await User.aggregate(periodPipeline);

    // Chuẩn hóa: tránh nhãn rỗng hoặc dữ liệu sai (vd: tên SV trong trường đợt thực tập)
    const periodNamePattern = /^(đợt|kỳ|hè|đông|xuân|202\d|20\d\d)/i;
    const normalized = new Map();
    for (const p of periodDistribution) {
      let name = (p.name || "").trim();
      if (!name) name = "Chưa chọn đợt";
      else if (!periodNamePattern.test(name) && name.length < 50 && /^[A-ZÀ-Ỹa-zà-ỹ\s]+$/.test(name)) {
        name = "Chưa chọn đợt"; // Giống tên người → dữ liệu lỗi
      }
      normalized.set(name, (normalized.get(name) || 0) + (p.value || p.count || 0));
    }
    periodDistribution = Array.from(normalized.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // majorDistribution: { name: "Major Name", value: count } (case-insensitive grouping)
    const majorPipeline = [
      { $match: matchStudent },
      {
        $project: {
          major: {
            $cond: {
              if: { $and: [{ $ne: ["$major", null] }, { $ne: ["$major", ""] }] },
              then: { $trim: { input: "$major" } },
              else: "Chưa cập nhật",
            },
          },
          majorLower: {
            $toLower: {
              $cond: {
                if: { $and: [{ $ne: ["$major", null] }, { $ne: ["$major", ""] }] },
                then: { $trim: { input: "$major" } },
                else: "chưa cập nhật",
              },
            },
          },
        },
      },
      { $group: { _id: "$majorLower", displayName: { $first: "$major" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, name: "$displayName", value: "$count" } },
    ];
    const majorDistribution = await User.aggregate(majorPipeline);

    return res.json({
      status: "Success",
      data: {
        summary: {
          total,
          interning,
          completed,
          rejected,
        },
        statusDistribution,
        periodDistribution,
        majorDistribution,
      },
    });
  } catch (error) {
    console.error(">>> [Admin Controller] getDashboardStats error:", error.message);
    return res.status(500).json({
      status: "Error",
      message: "Lỗi lấy thống kê dashboard",
      error: error.message,
    });
  }
}

module.exports = {
  getDashboardStats,
};
