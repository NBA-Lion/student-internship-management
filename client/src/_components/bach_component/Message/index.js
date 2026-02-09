import React from 'react';
import moment from 'moment';
import { CheckOutlined } from '@ant-design/icons';
import './Message.css';

export default function Message(props) {
    const {
      data,
      isMine,
      startsSequence,
      endsSequence,
      showTimestamp,
      isRead,
      reactions = []
    } = props;

    if (!data) return null;

    const isRecalled = data.deleted === true || data.type === 'recalled';
    const ts = data.timestamp != null ? data.timestamp : 0;
    const friendlyTimestamp = moment(ts).format('LLLL');
    const shortTime = moment(ts).format('HH:mm');
    const reactionGroups = isRecalled ? {} : (Array.isArray(reactions) ? reactions : []).reduce((acc, r) => {
      const e = r.emoji || r;
      acc[e] = (acc[e] || 0) + 1;
      return acc;
    }, {});

    return (
      <div
        className={[
          'message',
          `${isMine ? 'mine' : ''}`,
          `${startsSequence ? 'start' : ''}`,
          `${endsSequence ? 'end' : ''}`,
          isRecalled ? 'recalled' : ''
        ].filter(Boolean).join(' ')}
        onContextMenu={isRecalled ? (e) => e.preventDefault() : undefined}
      >
        {
          showTimestamp &&
            <div className="timestamp">
              { friendlyTimestamp }
            </div>
        }

        <div className="bubble-container">
          <div className="bubble" title={isRecalled ? 'Tin đã thu hồi' : friendlyTimestamp}>
            { data.message ?? data.content ?? '' }
          </div>
          {endsSequence && Object.keys(reactionGroups).length > 0 && (
            <div className="message-reactions" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {Object.entries(reactionGroups).map(([emoji, count]) => (
                <span key={emoji} className="message-reaction-chip" style={{ fontSize: 12, padding: '2px 6px', borderRadius: 10, background: '#e4e6eb' }}>
                  {emoji} {count > 1 ? count : ''}
                </span>
              ))}
            </div>
          )}
          {endsSequence && isMine && (
            <span className="message-status" title={isRead ? 'Đã đọc' : 'Đã gửi'}>
              {isRead
                ? <span className="read-ticks"><CheckOutlined /><CheckOutlined /></span>
                : <CheckOutlined className="sent-tick" />
              }
            </span>
          )}
          {endsSequence && <span className="message-time">{shortTime}</span>}
        </div>
      </div>
    );
}