/**
 * Thanh bộ lọc + nút Tải lại / Xóa bộ lọc / Xuất CSV cho trang Quản lý sinh viên.
 * Layout 2 hàng:
 *  - Hàng 1: Search + Trạng thái + Trường + Ngành + Đợt thực tập
 *  - Hàng 2: Bên trái: Năm + nút "+"; Bên phải: Tải lại / Xóa bộ lọc / Xuất CSV
 */
import { Input, Select, Button, Row, Col, Space } from 'antd';
import { SearchOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons';

const { Option } = Select;

export function StudentFilterBar({
    searchKeyword,
    setSearchKeyword,
    statusFilter,
    setStatusFilter,
    universityFilter,
    setUniversityFilter,
    majorFilter,
    setMajorFilter,
    periodFilter,
    setPeriodFilter,
    yearFilter,
    setYearFilter,
    yearOptions = [],
    periods,
    loading,
    loadStudents,
    clearFilters,
    onExportCSV,
    onOpenCreatePeriodModal,
    history,
}) {
    const SEARCH_COL_MD = 8;
    const SEARCH_COL_LG = 8;
    const OTHER_COL_MD = 4;
    const OTHER_COL_LG = 4;

    return (
        <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {/* Hàng 1: Search + dropdowns chính */}
                <Row gutter={[8, 8]} align="middle" justify="space-between" wrap>
                    <Col xs={24} sm={12} md={SEARCH_COL_MD} lg={SEARCH_COL_LG}>
                        <Input
                            placeholder="Tìm theo tên, MSSV, email..."
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            value={searchKeyword}
                            onChange={e => setSearchKeyword(e.target.value)}
                            allowClear
                            style={{ width: '100%' }}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={OTHER_COL_MD} lg={OTHER_COL_LG}>
                        <Select
                            allowClear
                            placeholder="Trạng thái"
                            value={statusFilter}
                            onChange={(val) => {
                                setStatusFilter(val);
                                if (val) history.push(`/admin/students?status=${encodeURIComponent(val)}`);
                                else history.push('/admin/students');
                            }}
                            style={{ width: '100%' }}
                        >
                            <Option value="Chờ duyệt">Chờ duyệt</Option>
                            <Option value="Đang thực tập">Đang thực tập</Option>
                            <Option value="Đã hoàn thành">Đã hoàn thành</Option>
                            <Option value="Từ chối">Từ chối</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={OTHER_COL_MD} lg={OTHER_COL_LG}>
                        <Input
                            placeholder="Trường"
                            value={universityFilter}
                            onChange={e => setUniversityFilter(e.target.value)}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={OTHER_COL_MD} lg={OTHER_COL_LG}>
                        <Input
                            placeholder="Ngành"
                            value={majorFilter}
                            onChange={e => setMajorFilter(e.target.value)}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={OTHER_COL_MD} lg={OTHER_COL_LG}>
                        <Select
                            allowClear
                            placeholder="Đợt thực tập"
                            value={periodFilter}
                            onChange={setPeriodFilter}
                            notFoundContent={periods.length === 0 ? 'Chưa có đợt' : null}
                            style={{ width: '100%' }}
                        >
                            {periods.map(p => (
                                <Option key={String(p._id)} value={p._id}>{p.name || p.code || p._id}</Option>
                            ))}
                        </Select>
                    </Col>
                </Row>

                {/* Hàng 2: Năm + nút "+" và 3 nút thao tác nằm sát nhau bên trái */}
                <Row gutter={[8, 8]} align="middle" wrap>
                    <Col xs={24}>
                        <Space size={16} wrap align="center">
                            <Space size={8} align="center">
                                <Select
                                    allowClear
                                    placeholder="Năm"
                                    value={yearFilter}
                                    onChange={setYearFilter}
                                    notFoundContent={yearOptions.length === 0 ? 'Chưa có năm' : null}
                                    style={{ width: 90 }}
                                >
                                    {yearOptions.map(y => (
                                        <Option key={y} value={y}>{y}</Option>
                                    ))}
                                </Select>
                                <Button
                                    type="dashed"
                                    shape="circle"
                                    icon={<PlusOutlined />}
                                    onClick={onOpenCreatePeriodModal}
                                />
                            </Space>
                            <Space size={8} align="center">
                                {loading && <span style={{ color: '#1890ff', fontSize: 13 }}>Đang tải...</span>}
                                <Button type="primary" onClick={loadStudents} loading={loading} disabled={loading}>Tải lại</Button>
                                <Button onClick={clearFilters}>Xóa bộ lọc</Button>
                                <Button icon={<DownloadOutlined />} onClick={onExportCSV} disabled={loading}>Xuất CSV</Button>
                            </Space>
                        </Space>
                    </Col>
                </Row>
            </Space>
        </div>
    );
}
