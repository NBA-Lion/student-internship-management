import React, {useEffect} from 'react';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import './ConversationListItem.css';
import shave from 'shave';

export default function ConversationListItem(props) {
  useEffect(() => {
    shave(".conversation-snippet", 20)
  }, [])
  
  const { name, text } = props.data;
  const unreadCount = props.unreadCount || 0;
  
  return (
    <div className={"conversation-list-item" + (props.picked ? " picked" : "")}>
      <Badge 
        badgeContent={unreadCount} 
        color="error" 
        invisible={unreadCount === 0}
        overlap="circular"
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Avatar {...stringAvatar(name)} className="conversation-photo" />
      </Badge>
      <div className="conversation-info">
        <h1 className="conversation-title">
          {name}
          {unreadCount > 0 && (
            <span className="unread-indicator" style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#f5222d',
              marginLeft: 8
            }} />
          )}
        </h1>
        <span className="conversation-snippet" style={{
          fontWeight: unreadCount > 0 ? 'bold' : 'normal'
        }}>
          {truncateString(text, 20)}
        </span>
      </div>
    </div>
  );
}

function stringToColor(string) {
	let hash = 0;
	let i;
  
	/* eslint-disable no-bitwise */
	for (i = 0; i < string.length; i += 1) {
	  hash = string.charCodeAt(i) + ((hash << 5) - hash);
	}
  
	let color = '#';
  
	for (i = 0; i < 3; i += 1) {
	  const value = (hash >> (i * 8)) & 0xff;
	  color += `00${value.toString(16)}`.substr(-2);
	}
	/* eslint-enable no-bitwise */
  
	return color;
  }
function stringAvatar(name) {
	let a = name.split(' ')[0]
	return {
	  sx: {
		bgcolor: stringToColor(name),
	  },
	  children: `${a}`,
	};
  }
  function truncateString(str, num) {
	if (str.length > num) {
	  return str.slice(0, num) + "...";
	} else {
	  return str;
	}
  }