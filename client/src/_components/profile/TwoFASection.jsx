import { useState, useEffect } from 'react';
import { Card, Button, Modal, Input, Alert } from 'antd';
import { useRecoilState } from 'recoil';
import { useFetchWrapper } from '_helpers';
import { alertBachAtom } from '_state';
import { SafetyOutlined, QrcodeOutlined } from '@ant-design/icons';

export function TwoFASection() {
    const fetchWrapper = useFetchWrapper();
    const [, setAlert] = useRecoilState(alertBachAtom);
    const [totpEnabled, setTotpEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [setupModal, setSetupModal] = useState(false);
    const [disableModal, setDisableModal] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [setupSecret, setSetupSecret] = useState('');
    const [setupCode, setSetupCode] = useState('');
    const [disableCode, setDisableCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [setupFeedback, setSetupFeedback] = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const res = await fetchWrapper.get('/api/auth/2fa/status');
                const data = res._data != null ? res._data : (typeof res.json === 'function' ? await res.json() : res);
                if (!cancelled && data && data.totpEnabled !== undefined) setTotpEnabled(!!data.totpEnabled);
            } catch (_) {}
            if (!cancelled) setLoading(false);
        }
        load();
        return () => { cancelled = true; };
    }, []);

    const handleOpenSetup = async () => {
        setQrDataUrl('');
        setSetupSecret('');
        setSetupCode('');
        setSetupFeedback(null);
        setSetupModal(true);
        setSubmitting(true);
        try {
            const res = await fetchWrapper.post('/api/auth/2fa/setup', 'application/json', {});
            const data = res._data != null ? res._data : (typeof res.json === 'function' ? await res.json() : res);
            if (data && (data.qrDataUrl || data.secret)) {
                if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
                if (data.secret) setSetupSecret(data.secret);
            } else {
                const errMsg = (data && data.message) || 'Không tạo được mã';
                setSetupFeedback({ type: 'error', text: errMsg });
                setAlert({ message: 'Lỗi', description: errMsg });
            }
        } catch (e) {
            const errMsg = e?.message || 'Lỗi kết nối. Kiểm tra backend đã chạy.';
            setSetupFeedback({ type: 'error', text: errMsg });
            setAlert({ message: 'Lỗi kết nối', description: errMsg });
        }
        setSubmitting(false);
    };

    const handleVerifySetup = async () => {
        if (!setupCode || setupCode.trim().length < 6) {
            setSetupFeedback({ type: 'warning', text: 'Nhập đủ mã 6 số từ ứng dụng.' });
            setAlert({ message: 'Cần nhập mã', description: 'Nhập mã 6 số từ ứng dụng.' });
            return;
        }
        setSetupFeedback(null);
        setSubmitting(true);
        try {
            const res = await fetchWrapper.post('/api/auth/2fa/verify-setup', 'application/json', { code: setupCode.trim() });
            const data = res._data != null ? res._data : (typeof res.json === 'function' ? await res.json() : res);
            if (data && data.status === 'Success') {
                setAlert({ message: 'Thành công', description: 'Đã bật xác thực 2 bước.' });
                setTotpEnabled(true);
                setSetupModal(false);
                setSetupFeedback(null);
                setSetupSecret('');
                setQrDataUrl('');
            } else {
                const errMsg = data?.message || 'Mã không đúng hoặc đã hết hạn. Thử mã mới.';
                setSetupFeedback({ type: 'error', text: errMsg });
                setAlert({ message: 'Xác thực thất bại', description: errMsg });
            }
        } catch (e) {
            const errMsg = e?.message || 'Lỗi kết nối. Thử lại.';
            setSetupFeedback({ type: 'error', text: errMsg });
            setAlert({ message: 'Lỗi kết nối', description: errMsg });
        }
        setSubmitting(false);
    };

    const handleDisable = async () => {
        if (!disableCode || disableCode.trim().length < 6) {
            setAlert({ message: 'Cần nhập mã', description: 'Nhập mã 6 số hiện tại để tắt 2FA.' });
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetchWrapper.post('/api/auth/2fa/disable', 'application/json', { code: disableCode.trim() });
            const data = res._data != null ? res._data : (typeof res.json === 'function' ? await res.json() : res);
            if (data && data.status === 'Success') {
                setAlert({ message: 'Thành công', description: 'Đã tắt xác thực 2 bước.' });
                setTotpEnabled(false);
                setDisableModal(false);
                setDisableCode('');
            } else {
                setAlert({ message: 'Lỗi', description: data?.message || 'Mã không đúng.' });
            }
        } catch (e) {
            setAlert({ message: 'Lỗi kết nối', description: e?.message || 'Thử lại.' });
        }
        setSubmitting(false);
    };

    return (
        <>
            <Card
                title={<span><SafetyOutlined style={{ marginRight: 8 }} />Xác thực 2 bước (TOTP)</span>}
                style={{
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    marginBottom: 16,
                }}
                bodyStyle={{ padding: '20px 24px' }}
            >
                <p style={{ color: '#65676b', marginBottom: 16, lineHeight: 1.6 }}>
                    Đăng nhập an toàn hơn bằng mã từ ứng dụng Google Authenticator (hoặc tương tự).
                    <br /><small style={{ color: '#8c8c8c' }}>QR chỉ dùng <strong>một lần</strong> khi bật — quét xong, sau mỗi lần đăng nhập chỉ cần nhập <strong>mã 6 số</strong> từ app, không cần QR nữa.</small>
                </p>
                {totpEnabled ? (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 16,
                            flexWrap: 'wrap',
                            marginTop: 4,
                            paddingTop: 12,
                            borderTop: '1px solid #f0f0f0',
                        }}
                    >
                        <span style={{ color: '#52c41a', fontSize: 14, fontWeight: 500 }}>
                            Đã bật xác thực 2 bước.
                        </span>
                        <Button type="primary" danger onClick={() => setDisableModal(true)}>
                            Tắt xác thực 2 bước
                        </Button>
                    </div>
                ) : (
                    <Button
                        type="primary"
                        icon={<QrcodeOutlined />}
                        loading={submitting && setupModal}
                        disabled={loading}
                        onClick={handleOpenSetup}
                    >
                        {loading
                            ? 'Đang kiểm tra...'
                            : (submitting && setupModal ? 'Đang tạo mã...' : 'Bật xác thực 2 bước')}
                    </Button>
                )}
            </Card>

            <Modal
                title="Bật xác thực 2 bước"
                visible={setupModal}
                onCancel={() => { setSetupModal(false); setSetupFeedback(null); setSetupSecret(''); setQrDataUrl(''); }}
                footer={null}
                width={360}
                getContainer={() => document.body}
                maskClosable={!submitting}
                zIndex={1050}
            >
                <div style={{ textAlign: 'center' }}>
                    {(qrDataUrl || setupSecret) ? (
                        <>
                            {qrDataUrl ? (
                                <>
                                    <p style={{ marginBottom: 12, fontSize: 13, marginTop: 0 }}>Quét mã QR bằng Google Authenticator:</p>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                                        <img src={qrDataUrl} alt="QR 2FA" style={{ width: 200, height: 200, display: 'block' }} />
                                    </div>
                                </>
                            ) : setupSecret ? (
                                <Alert type="info" message="Không tạo được ảnh QR. Dùng mã bí mật bên dưới:" description="Mở Google Authenticator → Thêm tài khoản → Nhập khóa thủ công → dán mã." style={{ marginBottom: 16, textAlign: 'left' }} />
                            ) : null}
                            {setupSecret && (
                                <div style={{ marginBottom: 16, textAlign: 'center' }}>
                                    <p style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 6 }}>Mã bí mật (nếu không quét QR):</p>
                                    <code style={{ background: '#f5f5f5', padding: '6px 10px', borderRadius: 4, fontSize: 13, display: 'inline-block' }}>{setupSecret}</code>
                                </div>
                            )}
                            <p style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 10, marginTop: 4 }}>Sau đó nhập mã 6 số từ app để xác nhận:</p>
                            <Input
                                placeholder="Mã 6 số"
                                maxLength={6}
                                value={setupCode}
                                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                                style={{ marginBottom: 16, width: 200, marginLeft: 'auto', marginRight: 'auto', display: 'block' }}
                            />
                            {setupFeedback && (
                                <Alert
                                    type={setupFeedback.type}
                                    message={setupFeedback.text}
                                    showIcon
                                    style={{ marginBottom: 16, textAlign: 'left' }}
                                />
                            )}
                            <Button type="primary" loading={submitting} onClick={handleVerifySetup} style={{ width: 200, margin: '0 auto', display: 'block' }}>Xác nhận</Button>
                        </>
                    ) : (
                        <>
                            <p>{submitting ? 'Đang tạo mã...' : 'Không tải được mã. Thử lại.'}</p>
                            {setupFeedback && <Alert type={setupFeedback.type} message={setupFeedback.text} showIcon style={{ marginTop: 16, textAlign: 'left' }} />}
                        </>
                    )}
                </div>
            </Modal>

            <Modal
                title="Tắt xác thực 2 bước"
                visible={disableModal}
                onCancel={() => { setDisableModal(false); setDisableCode(''); }}
                onOk={handleDisable}
                okText="Tắt 2FA"
                okButtonProps={{ danger: true, loading: submitting }}
                cancelText="Hủy"
            >
                <p style={{ marginBottom: 12 }}>Nhập mã 6 số hiện tại từ ứng dụng để tắt:</p>
                <Input
                    placeholder="Mã 6 số"
                    maxLength={6}
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                />
            </Modal>
        </>
    );
}
