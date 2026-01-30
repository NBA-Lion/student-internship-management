import React from 'react';
import { UploadForm } from './UploadForm';
import { Row, Col } from 'antd';

export { DBPortal };
export default DBPortal;

// ============================================
// INTERNSHIP BATCH (Đợt thực tập) - Replaces Semester
// ============================================
var upload_form_internship_batch = [
  {
    title: 'Mã đợt',
    dataIndex: 'batch_id',
    key: 'batch_id',
  },
  {
    title: 'Tên đợt',
    dataIndex: 'batch_name',
    key: 'batch_name',
  },
  {
    title: 'Ngày bắt đầu',
    dataIndex: 'start_date',
    key: 'start_date',
  },
  {
    title: 'Ngày kết thúc',
    dataIndex: 'end_date',
    key: 'end_date',
  },
  {
    title: 'Lỗi',
    dataIndex: 'error',
    key: 'error',
  },
];

// ============================================
// COMPANY (Doanh nghiệp) - Replaces Subject
// ============================================
var upload_form_company = [
  {
    title: 'Tên công ty',
    dataIndex: 'company_name',
    key: 'company_name',
  },
  {
    title: 'Địa chỉ',
    dataIndex: 'company_address',
    key: 'company_address',
  },
  {
    title: 'Email liên hệ',
    dataIndex: 'company_email',
    key: 'company_email',
  },
  {
    title: 'Lĩnh vực',
    dataIndex: 'company_field',
    key: 'company_field',
  },
  {
    title: 'Lỗi',
    dataIndex: 'error',
    key: 'error',
  },
];

// ============================================
// INTERNSHIP RESULT (Kết quả thực tập) - Replaces Score
// ============================================
var upload_form_internship_result = [
  {
    title: 'Mã sinh viên',
    dataIndex: 'vnu_id',
    key: 'vnu_id',
  },
  {
    title: 'Mã đợt',
    dataIndex: 'batch_id',
    key: 'batch_id',
  },
  {
    title: 'Điểm thực tập',
    dataIndex: 'internship_score',
    key: 'internship_score',
  },
  {
    title: 'Nhận xét',
    dataIndex: 'evaluation',
    key: 'evaluation',
  },
  {
    title: 'Lỗi',
    dataIndex: 'error',
    key: 'error',
  },
];

// ============================================
// STUDENT (Sinh viên) - Keep as is
// ============================================
var upload_form_student = [
  {
    title: 'Ngày sinh',
    dataIndex: 'date_of_birth',
    key: 'date_of_birth',
  },
  {
    title: 'Tên',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Vai trò',
    dataIndex: 'role',
    key: 'role',
  },
  {
    title: 'Quê quán',
    dataIndex: 'location',
    key: 'location',
  },
  {
    title: 'VNU-ID',
    dataIndex: 'vnu_id',
    key: 'vnu_id',
  },
  {
    title: 'Username',
    dataIndex: 'username',
    key: 'username',
  },
  {
    title: 'Password',
    dataIndex: 'password',
    key: 'password',
  },
  {
    title: 'Giới tính',
    dataIndex: 'gender',
    key: 'gender',
  },
  {
    title: 'Số điện thoại',
    dataIndex: 'phone_number',
    key: 'phone_number',
  },
  {
    title: 'Lỗi',
    dataIndex: 'error',
    key: 'error',
  },
];

// ============================================
// LECTURER (Giảng viên hướng dẫn) - Replaces Teacher/CVHT
// ============================================
var upload_form_lecturer = [
  {
    title: 'Mã GV',
    dataIndex: 'lecturer_id',
    key: 'lecturer_id',
  },
  {
    title: 'Họ tên',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: 'Khoa/Viện',
    dataIndex: 'department',
    key: 'department',
  },
  {
    title: 'Username',
    dataIndex: 'username',
    key: 'username',
  },
  {
    title: 'Password',
    dataIndex: 'password',
    key: 'password',
  },
  {
    title: 'Số điện thoại',
    dataIndex: 'phone_number',
    key: 'phone_number',
  },
  {
    title: 'Lỗi',
    dataIndex: 'error',
    key: 'error',
  },
];

// ============================================
// INTERNSHIP STATUS (Tình trạng thực tập)
// ============================================
var upload_form_status = [
  {
    title: 'VNU-ID',
    dataIndex: 'vnu_id',
    key: 'vnu_id',
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    key: 'status',
  },
  {
    title: 'Lỗi',
    dataIndex: 'error',
    key: 'error',
  },
];
function DBPortal() {
  return (
    <div className="p-4" style={{ overflow: "auto" }}>
      <h3>🏢 Quản lý Dữ liệu Hệ thống Thực tập</h3>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Import dữ liệu sinh viên, giảng viên, doanh nghiệp và đợt thực tập vào hệ thống.
      </p>

      {/* ROW 1: Lecturers, Students, Companies */}
      <Row gutter={[24, 24]}>
        <Col flex="320px">
          <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, minHeight: 200 }}>
            <h4>👨‍🏫 Danh sách Giảng viên hướng dẫn</h4>
            <p style={{ color: '#888', fontSize: 13 }}>
              Import danh sách giảng viên phụ trách hướng dẫn sinh viên thực tập.
            </p>
            <UploadForm 
              columns={upload_form_lecturer} 
              formurl="http://localhost:5000/api/import/users?role=lecturer"
              templateType="lecturer"
            />
          </div>
        </Col>
        <Col flex="320px">
          <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, minHeight: 200 }}>
            <h4>🎓 Danh sách Sinh viên</h4>
            <p style={{ color: '#888', fontSize: 13 }}>
              Import danh sách sinh viên tham gia thực tập.
            </p>
            <UploadForm 
              columns={upload_form_student} 
              formurl="http://localhost:5000/api/import/users?role=student"
              templateType="student"
            />
            <p style={{ color: '#f5222d', fontSize: 12, marginTop: 8 }}>
              <b>Lưu ý:</b> Sinh viên cần được phân công GVHD sau khi import.
            </p>
          </div>
        </Col>
        <Col flex="320px">
          <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, minHeight: 200 }}>
            <h4>🏭 Danh sách Doanh nghiệp</h4>
            <p style={{ color: '#888', fontSize: 13 }}>
              Import danh sách doanh nghiệp tiếp nhận sinh viên thực tập.
            </p>
            <UploadForm 
              columns={upload_form_company} 
              formurl="http://localhost:5000/api/import/companies"
              templateType="company"
            />
          </div>
        </Col>
        <Col flex="auto"></Col>
      </Row>

      <br />
      <br />

      {/* ROW 2: Internship Batches, Results, Status */}
      <Row gutter={[24, 24]}>
        <Col flex="320px">
          <div style={{ background: '#f0f5ff', padding: 16, borderRadius: 8, minHeight: 200 }}>
            <h4>📅 Danh sách Đợt thực tập</h4>
            <p style={{ color: '#888', fontSize: 13 }}>
              Import các đợt thực tập (VD: Hè 2025, Đông 2025).
            </p>
            <UploadForm 
              columns={upload_form_internship_batch} 
              formurl="http://localhost:5000/api/import/batches"
              templateType="batch"
            />
          </div>
        </Col>
        <Col flex="320px">
          <div style={{ background: '#fff7e6', padding: 16, borderRadius: 8, minHeight: 200 }}>
            <h4>📊 Import Kết quả thực tập</h4>
            <p style={{ color: '#888', fontSize: 13 }}>
              Import điểm và nhận xét kết quả thực tập của sinh viên.
            </p>
            <UploadForm 
              columns={upload_form_internship_result} 
              formurl="http://localhost:5000/api/import/grades"
              templateType="result"
            />
          </div>
        </Col>
        <Col flex="320px">
          <div style={{ background: '#f6ffed', padding: 16, borderRadius: 8, minHeight: 200 }}>
            <h4>📋 Cập nhật Tình trạng thực tập</h4>
            <p style={{ color: '#888', fontSize: 13 }}>
              Cập nhật trạng thái: Chờ duyệt, Đang thực tập, Hoàn thành...
            </p>
            <UploadForm 
              columns={upload_form_status} 
              formurl="http://localhost:5000/api/import/status"
              templateType="status"
            />
          </div>
        </Col>
        <Col flex="auto"></Col>
      </Row>
    </div>
  );
}