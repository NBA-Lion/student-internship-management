/**
 * Controller đợt thực tập: gọi service, trả response, không gọi Model trực tiếp
 */
const periodService = require("../services/periodService");
const { AppError, ErrorCodes } = require("../middleware/errorHandler");

exports.getAllPeriods = async (req, res) => {
  const data = await periodService.getAll();
  return res.json({ status: "Success", data });
};

exports.getPeriodById = async (req, res) => {
  const period = await periodService.getById(req.params.id);
  if (!period) {
    throw new AppError("Không tìm thấy đợt thực tập", 404, ErrorCodes.NOT_FOUND);
  }
  return res.json({ status: "Success", data: period });
};

exports.getActivePeriods = async (req, res) => {
  const data = await periodService.getActive();
  return res.json({ status: "Success", data });
};

exports.createPeriod = async (req, res) => {
  const body = req.body || {};
  const startDate = body.startDate || body.start_date;
  const endDate = body.endDate || body.end_date;
  const createdBy = req.user?.id || req.user?._id;

  const data = await periodService.create(
    {
      code: body.code,
      name: body.name,
      startDate,
      endDate,
      status: body.status ?? body.is_active,
    },
    createdBy
  );
  return res.status(201).json({
    status: "Success",
    message: "Tạo đợt thực tập thành công",
    data,
  });
};

exports.updatePeriod = async (req, res) => {
  const data = await periodService.update(req.params.id, req.body);
  if (!data) {
    throw new AppError("Không tìm thấy đợt thực tập", 404, ErrorCodes.NOT_FOUND);
  }
  return res.json({
    status: "Success",
    message: "Cập nhật thành công",
    data,
  });
};

exports.deletePeriod = async (req, res) => {
  const deleted = await periodService.remove(req.params.id);
  if (!deleted) {
    throw new AppError("Không tìm thấy đợt thực tập", 404, ErrorCodes.NOT_FOUND);
  }
  return res.json({ status: "Success", message: "Xóa đợt thực tập thành công" });
};

exports.togglePeriod = async (req, res) => {
  const data = await periodService.toggle(req.params.id);
  if (!data) {
    throw new AppError("Không tìm thấy đợt thực tập", 404, ErrorCodes.NOT_FOUND);
  }
  return res.json({
    status: "Success",
    message: data.status === "OPEN" ? "Đã mở đợt thực tập" : "Đã đóng đợt thực tập",
    data,
  });
};
