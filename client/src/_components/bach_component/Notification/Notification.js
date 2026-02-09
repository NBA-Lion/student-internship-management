import React, { useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { alertBachAtom } from '_state/alert_bach';
import { notification } from 'antd';

const CLEAR = { message: null, description: null };

function Notification() {
  const [notification_, setNoti] = useRecoilState(alertBachAtom);

  const openNotification = (message, description) => {
    const msg = message != null ? String(message) : '';
    const desc = description != null ? String(description) : '';
    try {
      if (typeof notification === 'undefined' || !notification.open) return;
      if (msg.includes('Lỗi') || msg.includes('Thất bại') || msg.includes('Error') || msg.includes('Err')) {
        notification.error({ message: msg, description: desc });
      } else if (msg.includes('Thành công') || msg.toLowerCase().includes('thanh cong') || msg.includes('Success') || desc.includes('Thành công') || desc.includes('Success')) {
        notification.success({ message: msg, description: desc });
      } else if (msg.includes('Cảnh báo') || msg.toLowerCase().includes('canh bao') || msg.includes('Warning') || desc.toLowerCase().includes('warning') || desc.toLowerCase().includes('canh bao')) {
        notification.warning({ message: msg, description: desc });
      } else {
        notification.open({ message: msg, description: desc });
      }
    } catch (e) {
      console.warn('[Notification]', e);
    }
  };

  useEffect(() => {
    if (notification_.message != null || notification_.description != null) {
      openNotification(notification_.message, notification_.description);
      setNoti(CLEAR);
    }
  }, [notification_]);

  return null;
}

export { Notification };