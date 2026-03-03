import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Table, Card, Button, Modal, Form, Input, message, Row, Col, Tag, Typography, Popconfirm, Space } from 'antd';
import { BankOutlined, UserOutlined, MailOutlined, PhoneOutlined, PlusOutlined, TeamOutlined, StopOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useFetchWrapper } from '_helpers';
import { getUserData } from '_helpers/auth-storage';

const { Title, Text } = Typography;

export default function AdminCompanies() {
  const history = useHistory();
  const fetchWrapper = useFetchWrapper();
  const userData = getUserData();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);

  const [hrModalVisible, setHrModalVisible] = useState(false);
  const [hrLoading, setHrLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [hrs, setHrs] = useState([]);
  const [createHrVisible, setCreateHrVisible] = useState(false);
  const [hrForm] = Form.useForm();

  useEffect(() => {
    if (userData.role !== 'admin') {
      history.replace('/');
      return;
    }
    loadCompanies();
  }, [userData.role]);

  async function loadCompanies() {
    try {
      setLoading(true);
      const res = await fetchWrapper.get('/api/admin/companies?all=1');
      const data = await res.json();
      if (data.status === 'Success') {
        setCompanies(Array.isArray(data.data) ? data.data : []);
      } else {
        message.error(data.message || 'Không tải được danh sách doanh nghiệp');
      }
    } catch (e) {
      message.error('Không kết nối được server');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleCompanyActive(record) {
    try {
      setLoading(true);
      const res = await fetchWrapper.put(`/api/admin/companies/${record._id}/toggle-active`, 'application/json', {});
      const data = await res.json();
      if (data.status === 'Success') {
        message.success(data.message);
        loadCompanies();
      } else throw new Error(data.message);
    } catch (e) {
      message.error(e.message || 'Không thể cập nhật trạng thái');
    } finally {
      setLoading(false);
    }
  }

  async function deleteCompany(record) {
    try {
      setLoading(true);
      const res = await fetchWrapper.delete(`/api/admin/companies/${record._id}`);
      const data = await res.json();
      if (data.status === 'Success') {
        message.success(data.message);
        loadCompanies();
        if (selectedCompany && String(selectedCompany._id) === String(record._id)) {
          setHrModalVisible(false);
          setSelectedCompany(null);
        }
      } else throw new Error(data.message);
    } catch (e) {
      message.error(e.message || 'Không thể xóa doanh nghiệp');
    } finally {
      setLoading(false);
    }
  }

  async function openHrModal(company) {
    setSelectedCompany(company);
    setHrModalVisible(true);
    await loadHrs(company._id);
  }

  async function loadHrs(companyId) {
    try {
      setHrLoading(true);
      const res = await fetchWrapper.get(`/api/admin/companies/${companyId}/hrs`);
      const data = await res.json();
      if (data.status === 'Success') {
        setHrs(Array.isArray(data.data) ? data.data : []);
      } else {
        message.error(data.message || 'Không tải được danh sách HR');
      }
    } catch (e) {
      message.error('Không kết nối được server');
      setHrs([]);
    } finally {
      setHrLoading(false);
    }
  }

  async function handleCreateHr(values) {
    if (!selectedCompany) return;
    try {
      setHrLoading(true);
      const res = await fetchWrapper.post(
        `/api/admin/companies/${selectedCompany._id}/hrs`,
        'application/json',
        values
      );
      const data = await res.json();
      if (data.status === 'Success') {
        message.success('Đã tạo tài khoản HR');
        hrForm.resetFields();
        setCreateHrVisible(false);
        await loadHrs(selectedCompany._id);
      } else {
        throw new Error(data.message || 'Không thể tạo HR');
      }
    } catch (e) {
      message.error(e.message || 'Không thể tạo HR');
    } finally {
      setHrLoading(false);
    }
  }

  const companyColumns = [
    {
      title: 'Tên doanh nghiệp',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span><BankOutlined /> {text}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 130,
      render: (v) => (
        <Tag color={v !== false ? 'green' : 'default'}>
          {v !== false ? 'Đang hợp tác' : 'Ngừng hợp tác'}
        </Tag>
      ),
    },
    {
      title: 'Lĩnh vực',
      dataIndex: 'field',
      key: 'field',
      render: (v) => v || <Text type="secondary">Chưa cập nhật</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 260,
      render: (_, record) => (
        <Space>
          <Button size="small" type="link" onClick={() => openHrModal(record)}>
            Quản lý HR
          </Button>
          <Button
            size="small"
            type="link"
            icon={record.is_active !== false ? <StopOutlined /> : <CheckCircleOutlined />}
            onClick={() => toggleCompanyActive(record)}
          >
            {record.is_active !== false ? 'Vô hiệu hóa' : 'Kích hoạt'}
          </Button>
          <Popconfirm
            title={`Xóa doanh nghiệp "${record.name}"?`}
            description="Chỉ xóa được khi không còn tài khoản HR, mentor hoặc sinh viên liên kết."
            onConfirm={() => deleteCompany(record)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const hrColumns = [
    {
      title: 'Mã đăng nhập',
      dataIndex: 'student_code',
      key: 'student_code',
      width: 120,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'full_name',
      key: 'full_name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
    },
  ];

  return (
    <div className="p-4" style={{ paddingTop: 24 }}>
      <div className="container">
        <Title level={3} style={{ marginBottom: 16 }}>
          Quản lý Doanh nghiệp &amp; Tài khoản HR
        </Title>
        <Card>
          <Table
            rowKey="_id"
            columns={companyColumns}
            dataSource={companies}
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>

        {/* Modal danh sách HR của 1 company */}
        <Modal
          visible={hrModalVisible}
          title={selectedCompany ? `HR của: ${selectedCompany.name}` : 'HR doanh nghiệp'}
          onCancel={() => { setHrModalVisible(false); setSelectedCompany(null); setHrs([]); }}
          footer={null}
          width={720}
        >
          <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
            <Col>
              <Text strong>
                <TeamOutlined /> Danh sách HR
              </Text>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateHrVisible(true)}
              >
                Thêm HR
              </Button>
            </Col>
          </Row>

          <Table
            rowKey="_id"
            columns={hrColumns}
            dataSource={hrs}
            loading={hrLoading}
            pagination={false}
            locale={{ emptyText: 'Chưa có HR nào cho doanh nghiệp này.' }}
          />

          {/* Form tạo HR mới */}
          <Modal
            visible={createHrVisible}
            title="Tạo tài khoản HR mới"
            onCancel={() => { setCreateHrVisible(false); hrForm.resetFields(); }}
            onOk={() => hrForm.submit()}
            confirmLoading={hrLoading}
          >
            <Form form={hrForm} layout="vertical" onFinish={handleCreateHr}>
              <Form.Item
                label="Mã đăng nhập (student_code)"
                name="student_code"
                rules={[{ required: true, message: 'Vui lòng nhập mã đăng nhập' }]}
              >
                <Input placeholder="VD: HR_FPT_02" />
              </Form.Item>
              <Form.Item
                label="Họ và tên"
                name="full_name"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Họ và tên" />
              </Form.Item>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="email@company.com" />
              </Form.Item>
              <Form.Item
                label="Mật khẩu (mặc định 123456 nếu để trống)"
                name="password"
              >
                <Input.Password placeholder="123456" />
              </Form.Item>
              <Form.Item
                label="Số điện thoại"
                name="phone"
              >
                <Input prefix={<PhoneOutlined />} placeholder="SĐT" />
              </Form.Item>
            </Form>
          </Modal>
        </Modal>
      </div>
    </div>
  );
}

