import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Card, Tag, Row, Col, Space } from 'antd';
import { SolutionOutlined } from '@ant-design/icons';
import { useFetchWrapper } from '_helpers';
import { getUserData } from '_helpers/auth-storage';

const { Option } = Select;
const { TextArea } = Input;

export default function MentorStudents() {
  const history = useHistory();
  const location = useLocation();
  const fetchWrapper = useFetchWrapper();
  const userData = getUserData();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [evalModalVisible, setEvalModalVisible] = useState(false);
  const [evalTarget, setEvalTarget] = useState(null);
  const [statusFilter, setStatusFilter] = useState();
  const [yearFilter, setYearFilter] = useState();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [form] = Form.useForm();

  const needGradeOnly = new URLSearchParams(location.search || '').get('need_grade') === '1';

  const yearOptions = useMemo(() => {
    const set = new Set();
    (students || []).forEach(s => {
      const raw = s.start_date || s.startDate;
      if (!raw) return;
      const d = new Date(raw);
      if (!Number.isNaN(d.getFullYear())) set.add(d.getFullYear());
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [students]);

  const filteredStudents = useMemo(() => {
    let list = students;
    if (statusFilter) {
      list = list.filter(s => String(s.internship_status || '').trim() === statusFilter);
    }
    if (yearFilter) {
      const y = Number(yearFilter);
      list = list.filter(s => {
        const raw = s.start_date || s.startDate;
        if (!raw) return false;
        const d = new Date(raw);
        return !Number.isNaN(d.getFullYear()) && d.getFullYear() === y;
      });
    }
    if (searchKeyword && searchKeyword.trim()) {
      const q = searchKeyword.trim().toLowerCase();
      list = list.filter(s => {
        const name = (s.full_name || '').toLowerCase();
        const code = (s.student_code || '').toLowerCase();
        const topic = (s.internship_topic || '').toLowerCase();
        return name.includes(q) || code.includes(q) || topic.includes(q);
      });
    }
    return list;
  }, [students, statusFilter, yearFilter, searchKeyword]);

  const displayList = useMemo(() => {
    const base = filteredStudents;
    if (!needGradeOnly) return base;
    return base.filter(s =>
      String(s.internship_status || '') === 'Đã hoàn thành' &&
      !['Đạt', 'Không đạt'].includes(String(s.final_status || '').trim())
    );
  }, [filteredStudents, needGradeOnly]);

  useEffect(() => {
    if (userData?.role !== 'mentor') {
      history.replace('/');
      return;
    }
    loadStudents();
  }, [userData?.role]);

  function exportCSV() {
    try {
      const headers = [
        { key: 'student_code', label: 'MSSV' },
        { key: 'full_name', label: 'Họ tên' },
        { key: 'university', label: 'Trường' },
        { key: 'internship_unit', label: 'Đơn vị' },
        { key: 'internship_topic', label: 'Đề tài' },
        { key: 'internship_status', label: 'Trạng thái' },
        { key: 'report_score', label: 'Điểm báo cáo' },
        { key: 'final_grade', label: 'Điểm tổng kết' },
        { key: 'final_status', label: 'Kết quả' },
      ];
      const rows = displayList.map(s => headers.map(h => {
        let v = s[h.key];
        if (v === null || v === undefined) v = '';
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(','));
      const csv = '\uFEFF' + headers.map(h => `"${h.label}"`).join(',') + '\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SV_huong_dan_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      message.error('Không thể xuất CSV');
    }
  }

  async function openHistory() {
    if (!evalTarget) return;
    try {
      setHistoryLoading(true);
      setHistoryVisible(true);
      const res = await fetchWrapper.get('/api/activities/recent?limit=50');
      const data = await res.json();
      if (data.status === 'Success' && Array.isArray(data.data)) {
        const items = data.data.filter(
          (it) =>
            String(it.type || '') === 'evaluation' &&
            String(it.actor_code || '') === String(evalTarget.student_code || '')
        );
        setHistoryItems(items);
      } else {
        setHistoryItems([]);
      }
    } catch (e) {
      setHistoryItems([]);
      message.error('Không tải được lịch sử');
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadStudents() {
    try {
      setLoading(true);
      const res = await fetchWrapper.get('/api/mentor/students');
      const data = await res.json();
      if (data.status === 'Success') setStudents(data.data || []);
    } catch (e) {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  function openEval(record) {
    setEvalTarget(record);
    form.setFieldsValue({
      mentor_feedback: record.mentor_feedback || '',
      report_score: record.report_score,
      final_grade: record.final_grade,
      final_status: record.final_status || 'Pending',
    });
    setEvalModalVisible(true);
  }

  async function handleSaveEval(values) {
    if (!evalTarget) return;
    try {
      setLoading(true);
      const res = await fetchWrapper.put(
        `/api/user/${evalTarget.student_code}/evaluation`,
        'application/json',
        {
          mentor_feedback: values.mentor_feedback,
          report_score: values.report_score,
          final_grade: values.final_grade,
          final_status: values.final_status,
        }
      );
      const data = await res.json();
      if (data.status === 'Success') {
        message.success('Đã lưu đánh giá');
        setEvalModalVisible(false);
        setEvalTarget(null);
        loadStudents();
      } else throw new Error(data.message);
    } catch (e) {
      message.error(e.message || 'Không thể lưu');
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    { title: 'MSSV', dataIndex: 'student_code', key: 'student_code', width: 100 },
    { title: 'Họ tên', dataIndex: 'full_name', key: 'full_name' },
    { title: 'Đề tài', dataIndex: 'internship_topic', key: 'topic', ellipsis: true },
    {
      title: 'Kết quả',
      dataIndex: 'final_status',
      key: 'final_status',
      width: 100,
      render: (v) => (
        <Tag color={v === 'Đạt' ? 'green' : v === 'Không đạt' ? 'red' : 'default'}>
          {v || 'Chưa đánh giá'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Button type="primary" size="small" onClick={() => openEval(record)}>
          Nhận xét / Chấm điểm
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <Card
        title={
          <>
            <SolutionOutlined /> Sinh viên tôi hướng dẫn
            {needGradeOnly && (
              <Tag color="orange" style={{ marginLeft: 8 }}>
                Chỉ hiển thị: Chưa chấm điểm ({displayList.length})
              </Tag>
            )}
          </>
        }
        extra={
          <Space size={8}>
            {needGradeOnly && (
              <Button size="small" onClick={() => history.push('/mentor/students')}>
                Xem tất cả
              </Button>
            )}
            {!needGradeOnly && (
              <Button size="small" onClick={() => history.push('/mentor/students?need_grade=1')}>
                Chỉ SV chưa chấm điểm
              </Button>
            )}
            <Button size="small" onClick={exportCSV}>
              Xuất CSV
            </Button>
          </Space>
        }
      >
        <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
          <Col xs={24} sm={10}>
            <Input
              placeholder="Tìm theo tên, MSSV, đề tài..."
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={7}>
            <Select
              allowClear
              placeholder="Trạng thái"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="Đang thực tập">Đang thực tập</Option>
              <Option value="Đã hoàn thành">Đã hoàn thành</Option>
            </Select>
          </Col>
          <Col xs={12} sm={7}>
            <Select
              allowClear
              placeholder="Năm"
              value={yearFilter}
              onChange={setYearFilter}
              style={{ width: '100%' }}
            >
              {yearOptions.map(y => (
                <Option key={y} value={y}>{y}</Option>
              ))}
            </Select>
          </Col>
        </Row>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={displayList}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Nhận xét & Chấm điểm – Xác nhận kết thúc"
        visible={evalModalVisible}
        onCancel={() => { setEvalModalVisible(false); setEvalTarget(null); }}
        footer={null}
        width={560}
      >
        {evalTarget && (
          <p style={{ marginBottom: 16 }}>
            Sinh viên: <strong>{evalTarget.full_name}</strong> ({evalTarget.student_code})
          </p>
        )}
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Button size="small" onClick={openHistory} disabled={!evalTarget}>
            Xem lịch sử thay đổi điểm / nhận xét
          </Button>
          <Form form={form} layout="vertical" onFinish={handleSaveEval}>
          <Form.Item name="mentor_feedback" label="Nhận xét">
            <TextArea rows={3} placeholder="Nhận xét về quá trình thực tập..." />
          </Form.Item>
          <Form.Item name="report_score" label="Điểm báo cáo (0-10)">
            <InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="final_grade" label="Điểm tổng kết (0-10)">
            <InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="final_status" label="Kết quả" rules={[{ required: true }]}>
            <Select>
              <Option value="Pending">Chưa xác nhận</Option>
              <Option value="Đạt">Đạt</Option>
              <Option value="Không đạt">Không đạt</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button onClick={() => setEvalModalVisible(false)} style={{ marginRight: 8 }}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>Lưu &amp; Xác nhận</Button>
          </Form.Item>
          </Form>
        </Space>
      </Modal>

      <Modal
        title={evalTarget ? `Lịch sử đánh giá – ${evalTarget.full_name} (${evalTarget.student_code})` : 'Lịch sử đánh giá'}
        visible={historyVisible}
        onCancel={() => { setHistoryVisible(false); setHistoryItems([]); }}
        footer={null}
        width={640}
      >
        {historyLoading ? (
          <p>Đang tải lịch sử...</p>
        ) : historyItems.length === 0 ? (
          <p>Chưa có lịch sử đánh giá.</p>
        ) : (
          <ul style={{ paddingLeft: 16 }}>
            {historyItems.map(item => (
              <li key={item._id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{item.title}</div>
                {item.description && <div style={{ fontSize: 12 }}>{item.description}</div>}
                <div style={{ fontSize: 11, color: '#888' }}>
                  {new Date(item.createdAt).toLocaleString('vi-VN')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
