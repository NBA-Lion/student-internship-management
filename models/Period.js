const mongoose = require("mongoose");

const PERIOD_STATUSES = ["OPEN", "CLOSED"];

/**
 * Period Model
 * Đại diện cho "Đợt thực tập" (master data)
 *
 * Chúng ta vẫn giữ strict:false để tương thích dữ liệu legacy
 * (start_date/end_date/is_active, v.v...) nhưng expose trường mới
 * startDate/endDate/status cho API mới.
 */
const PeriodSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Mã đợt là bắt buộc"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Tên đợt là bắt buộc"],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Ngày bắt đầu là bắt buộc"],
    },
    endDate: {
      type: Date,
      required: [true, "Ngày kết thúc là bắt buộc"],
    },
    status: {
      type: String,
      enum: PERIOD_STATUSES,
      default: "OPEN",
    },
    description: {
      type: String,
      trim: true,
    },
    maxStudents: {
      type: Number,
      default: 0,
    },
    registrationDeadline: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

function coerceStatus(value, fallback = "OPEN") {
  if (!value) return fallback;
  const normalized = String(value).toUpperCase().trim();
  if (PERIOD_STATUSES.includes(normalized)) return normalized;
  return fallback;
}

// Virtual fields để tương thích với dữ liệu legacy
PeriodSchema.virtual("start_date")
  .get(function () {
    return this.startDate;
  })
  .set(function (value) {
    this.startDate = value;
  });

PeriodSchema.virtual("end_date")
  .get(function () {
    return this.endDate;
  })
  .set(function (value) {
    this.endDate = value;
  });

PeriodSchema.virtual("is_active")
  .get(function () {
    return this.status === "OPEN";
  })
  .set(function (value) {
    this.status = value ? "OPEN" : "CLOSED";
  });

PeriodSchema.virtual("created_by")
  .get(function () {
    return this.createdBy;
  })
  .set(function (value) {
    this.createdBy = value;
  });

PeriodSchema.post("init", function (doc) {
  if (!doc.startDate && doc.get("start_date")) {
    doc.startDate = doc.get("start_date");
  }
  if (!doc.endDate && doc.get("end_date")) {
    doc.endDate = doc.get("end_date");
  }
  if (!doc.status) {
    if (doc.get("status")) {
      doc.status = coerceStatus(doc.get("status"));
    } else if (doc.get("is_active") !== undefined) {
      doc.status = doc.get("is_active") ? "OPEN" : "CLOSED";
    } else {
      doc.status = "OPEN";
    }
  } else {
    doc.status = coerceStatus(doc.status);
  }
});

PeriodSchema.pre("save", function (next) {
  if (this.startDate) {
    this.set("start_date", this.startDate);
  }
  if (this.endDate) {
    this.set("end_date", this.endDate);
  }
  if (this.status) {
    const normalized = coerceStatus(this.status);
    this.status = normalized;
    this.set("is_active", normalized === "OPEN");
    this.set("status", normalized);
  }
  if (this.createdBy) {
    this.set("created_by", this.createdBy);
  }
  next();
});

PeriodSchema.virtual("isOngoing").get(function () {
  const now = new Date();
  return this.startDate <= now && now <= this.endDate;
});

PeriodSchema.virtual("isRegistrationOpen").get(function () {
  if (this.status !== "OPEN") return false;
  if (!this.registrationDeadline) return this.status === "OPEN";
  return new Date() <= this.registrationDeadline;
});

PeriodSchema.index({ status: 1 });
PeriodSchema.index({ startDate: 1, endDate: 1 });

function transformResponse(doc, ret) {
  ret.startDate = ret.startDate || ret.start_date || null;
  ret.endDate = ret.endDate || ret.end_date || null;
  ret.status = coerceStatus(ret.status, ret.is_active ? "OPEN" : "CLOSED");
  if (ret.createdBy || ret.created_by) {
    ret.createdBy = ret.createdBy || ret.created_by;
  }
  delete ret.start_date;
  delete ret.end_date;
  delete ret.is_active;
  delete ret.created_by;
  delete ret.__v;
  return ret;
}

PeriodSchema.set("toJSON", { virtuals: true, transform: transformResponse });
PeriodSchema.set("toObject", { virtuals: true, transform: transformResponse });

const PeriodModel =
  mongoose.models.Period ||
  mongoose.model("Period", PeriodSchema, "internshipperiods");

// Đăng ký alias để ref cũ ("InternshipPeriod") vẫn hoạt động
if (!mongoose.models.InternshipPeriod) {
  mongoose.model("InternshipPeriod", PeriodModel.schema, "internshipperiods");
}

module.exports = PeriodModel;
module.exports.PERIOD_STATUSES = PERIOD_STATUSES;
