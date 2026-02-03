/**
 * Admin Analytics Dashboard – internship statistics with Recharts.
 * Summary cards + PieChart (status) + BarChart (major).
 */
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Card, Row, Col, Spin, Statistic, Breadcrumb } from 'antd';
import {
  TeamOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useFetchWrapper } from '_helpers';

const STATUS_COLORS = {
  'Chờ duyệt': '#faad14',
  'Đang thực tập': '#52c41a',
  'Đã hoàn thành': '#1890ff',
  'Từ chối': '#ff4d4f',
  'Chưa đăng ký': '#8c8c8c',
  'Hoàn thành': '#1890ff',
};

const defaultChartColor = '#722ed1';

function getStatusColor(name) {
  return STATUS_COLORS[name] || defaultChartColor;
}

export { AdminDashboard };
export default AdminDashboard;

function AdminDashboard() {
  const history = useHistory();
  const fetchWrapper = useFetchWrapper();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWrapper.get('/api/admin/dashboard');
        const json = await res.json();
        if (cancelled) return;
        if (json.status === 'Success' && json.data) {
          setData(json.data);
        } else {
          setError(json.message || 'Không tải được dữ liệu');
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Lỗi kết nối');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="admin-dashboard" style={{ padding: 24 }}>
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" tip="Đang tải thống kê..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard" style={{ padding: 24 }}>
        <Card>
          <p style={{ color: '#ff4d4f', margin: 0 }}>{error}</p>
        </Card>
      </div>
    );
  }

  const summary = data?.summary || {};
  const statusDistribution = data?.statusDistribution || [];
  const periodDistribution = data?.periodDistribution || [];
  const majorDistribution = data?.majorDistribution || [];

  return (
    <div className="admin-dashboard" style={{ padding: 24, paddingTop: 24 }}>
      <Breadcrumb style={{ marginBottom: 16, fontSize: 13, color: '#8c8c8c' }}>
        <Breadcrumb.Item><span style={{ cursor: 'pointer', color: '#8c8c8c' }} onClick={() => history.push('/')}>Trang chủ</span></Breadcrumb.Item>
        <Breadcrumb.Item>Thống kê</Breadcrumb.Item>
      </Breadcrumb>

      {/* Summary cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng sinh viên"
              value={summary.total ?? 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Đang thực tập"
              value={summary.interning ?? 0}
              prefix={<SyncOutlined spin />}
              valueStyle={{ color: '#52c41a', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Đã hoàn thành (Passed)"
              value={summary.completed ?? 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Từ chối (Failed)"
              value={summary.rejected ?? 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f', fontSize: 28 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts grid */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Phân bố trạng thái thực tập" style={{ minHeight: 360 }}>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Số lượng']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Sinh viên theo ngành (Major)" style={{ minHeight: 360 }}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={majorDistribution}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value) => [value, 'Số sinh viên']} />
                <Legend />
                <Bar dataKey="value" name="Số sinh viên" fill="#1890ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Số sinh viên theo đợt thực tập + số đang thực tập */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card
            title="Số sinh viên theo đợt thực tập"
            extra={
              <span style={{ fontSize: 13, color: '#52c41a', fontWeight: 500 }}>
                Đang thực tập: {summary.interning ?? 0} / {summary.total ?? 0}
              </span>
            }
            style={{ minHeight: 320 }}
          >
            {periodDistribution.length === 0 ? (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c8c8c' }}>
                Chưa có dữ liệu đợt. Sinh viên chưa chọn đợt khi đăng ký hoặc dữ liệu đang được cập nhật.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={periodDistribution}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => v || "Chưa xác định"}
                    interval={0}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value) => [value, 'Số sinh viên']} />
                  <Legend />
                  <Bar dataKey="value" name="Số sinh viên" fill="#722ed1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
