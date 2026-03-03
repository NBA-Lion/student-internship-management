import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Table, Button, Select, Input, Modal, Form, message, Card, Tag, Space, Popconfirm } from 'antd';
import { TeamOutlined, UserAddOutlined, DeleteOutlined } from '@ant-design/icons';
import { useFetchWrapper } from '_helpers';
import { getUserData } from '_helpers/auth-storage';

const { Option } = Select;

export default function CompanyStudents() {
  const history = useHistory();
  const fetchWrapper = useFetchWrapper();
  const userData = getUserData();
  const [students, setStudents] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignMentorId, setAssignMentorId] = useState(null);
  const [createMentorVisible, setCreateMentorVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (userData?.role !== 'company_hr') {
      history.replace('/');
      return;
    }
    loadStudents();
    loadMentors();
  }, [userData?.role]);

  async function loadStudents() {
    try {
      setLoading(true);
      const res = await fetchWrapper.get('/api/company/students');
      const data = await res.json();
      if (data.status === 'Success') {
        setStudents(data.data || []);
        setCompanyName(data.company_name || '');
      }
    } catch (e) {
      setStudents([]);
      setCompanyName('');
    } finally {
      setLoading(false);
    }
  }

  async function loadMentors() {
    try {
      const res = await fetchWrapper.get('/api/company/mentors');
      const data = await res.json();
      if (data.status === 'Success') setMentors(data.data || []);
    } catch (e) {
      setMentors([]);
    }
  }

  async function toggleMentorActive(record) {
    try {
      setLoading(true);
      const res = await fetchWrapper.put(
        `/api/company/mentors/${record._id}/toggle-active`,
        'application/json',
        {}
      );
      const data = await res.json();
      if (data.status === 'Success') {
        message.success(data.message);
        loadMentors();
      } else {
        throw new Error(data.message);
      }
    } catch (e) {
      message.error(e.message || 'Không thể cập nhật trạng thái Mentor');
    } finally {
      setLoading(false);
    }
  }

  function openAssign(record) {
    setAssignTarget(record);
    setAssignMentorId(record.mentor_id ? String(record.mentor_id) : null);
    setAssignModalVisible(true);
  }

  async function handleAssign() {
    if (!assignTarget || !assignMentorId) {
      message.warning('Vui lòng chọn Mentor');
      return;
    }
    try {
      setLoading(true);
      const res = await fetchWrapper.put(
        `/api/company/students/${assignTarget.student_code}/assign`,
        'application/json',
        { mentor_id: assignMentorId }
      );
      const data = await res.json();
      if (data.status === 'Success') {
        message.success(data.message);
        setAssignModalVisible(false);
        setAssignTarget(null);
        loadStudents();
      } else throw new Error(data.message);
    } catch (e) {
      message.error(e.message || 'Không thể gán');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateMentor(values) {
    try {
      setLoading(true);
      const res = await fetchWrapper.post('/api/company/mentors', 'application/json', values);
      const data = await res.json();
      if (data.status === 'Success') {
        message.success('Đã tạo tài khoản Mentor');
        setCreateMentorVisible(false);
        form.resetFields();
        loadMentors();
      } else throw new Error(data.message);
    } catch (e) {
      message.error(e.message || 'Không thể tạo Mentor');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteStudent(record) {
    try {
      setLoading(true);
      const id = record.student_code || (record._id != null ? String(record._id) : '');
      const res = await fetchWrapper.delete(`/api/company/students/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.status === 'Success') {
        message.success(data.message || 'Đã xóa sinh viên');
        loadStudents();
      } else throw new Error(data.message);
    } catch (e) {
      message.error(e.message || 'Không thể xóa sinh viên');
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    { title: 'MSSV', dataIndex: 'student_code', key: 'student_code', width: 100 },
    { title: 'Họ tên', dataIndex: 'full_name', key: 'full_name' },
    { title: 'Đơn vị TT', key: 'internship_unit', ellipsis: true, render: (_, record) => companyName || record.internship_unit || '—' },
    {
      title: 'Trạng thái',
      dataIndex: 'internship_status',
      key: 'status',
      width: 120,
      render: (v) => {
        const c = v === 'Đã hoàn thành' ? 'green' : v === 'Đang thực tập' ? 'blue' : v === 'Chờ duyệt' ? 'orange' : 'default';
        return <Tag color={c}>{v || '—'}</Tag>;
      },
    },
    {
      title: 'Mentor',
      dataIndex: 'mentor_name',
      key: 'mentor_name',
      width: 160,
      render: (v, record) => v || <span style={{ color: '#999' }}>Chưa gán</span>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openAssign(record)}>
            Gán Mentor
          </Button>
          <Popconfirm
            title={`Xóa sinh viên ${record.full_name} (${record.student_code})?`}
            description="Tài khoản SV sẽ bị xóa khỏi hệ thống. Mentor được gán không bị ảnh hưởng."
            onConfirm={() => handleDeleteStudent(record)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const mentorColumns = [
    { title: 'Mã nhân sự', dataIndex: 'student_code', key: 'student_code', width: 120 },
    { title: 'Họ tên', dataIndex: 'full_name', key: 'full_name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'SĐT', dataIndex: 'phone', key: 'phone', width: 140 },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 130,
      render: (v) => (
        <Tag color={v === false ? 'red' : 'green'}>
          {v === false ? 'Đã khoá' : 'Đang hoạt động'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => toggleMentorActive(record)}>
            {record.is_active === false ? 'Mở khoá' : 'Khoá tài khoản'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <Card title={<><TeamOutlined /> Danh sách sinh viên &amp; Gán Mentor</>} extra={
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => setCreateMentorVisible(true)}>
          Thêm Mentor
        </Button>
      }>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={students}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Card
        style={{ marginTop: 24 }}
        title="Danh sách Mentor (nhân sự doanh nghiệp)"
      >
        <Table
          rowKey="_id"
          columns={mentorColumns}
          dataSource={mentors}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Gán Mentor cho sinh viên"
        visible={assignModalVisible}
        onOk={handleAssign}
        onCancel={() => { setAssignModalVisible(false); setAssignTarget(null); }}
        okText="Gán"
        confirmLoading={loading}
      >
        {assignTarget && (
          <p style={{ marginBottom: 16 }}>
            Sinh viên: <strong>{assignTarget.full_name}</strong> ({assignTarget.student_code})
          </p>
        )}
        <Select
          placeholder="Chọn Mentor"
          style={{ width: '100%' }}
          value={assignMentorId}
          onChange={setAssignMentorId}
          showSearch
          optionFilterProp="children"
        >
          {mentors
            .filter(m => m.is_active !== false)
            .map(m => (
              <Option key={m._id} value={m._id}>
                {m.label || m.full_name}
              </Option>
            ))}
        </Select>
      </Modal>

      <Modal
        title="Thêm Mentor (nhân sự công ty)"
        visible={createMentorVisible}
        onCancel={() => { setCreateMentorVisible(false); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateMentor}>
          <Form.Item name="student_code" label="Mã nhân sự" rules={[{ required: true }]}>
            <Input placeholder="VD: NS001" />
          </Form.Item>
          <Form.Item name="full_name" label="Họ tên" rules={[{ required: true }]}>
            <Input placeholder="Họ và tên" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
            <Input placeholder="email@company.com" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu (mặc định 123456 nếu để trống)">
            <Input.Password placeholder="123456" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="SĐT" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setCreateMentorVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={loading}>Tạo tài khoản Mentor</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
