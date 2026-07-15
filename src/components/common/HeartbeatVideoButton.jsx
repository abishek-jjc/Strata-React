import React from 'react';

function HeartbeatVideoButton(props) {
  var onClickHandler = props.onClick;
  var buttonText = props.text || 'CLICK TO WATCH DEMO VIDEO';

  function handleClick(event) {
    if (onClickHandler) {
      onClickHandler(event);
    }
  }

  var buttonStyle = {
    fontFamily: '"Outfit", "Inter", sans-serif',
    fontWeight: '800',
    fontSize: '1rem',
    letterSpacing: '1.4px',
    textAlign: 'center',
    textTransform: 'uppercase',
    padding: '16px 32px',
    borderRadius: '8px',
    border: '3px solid rgba(255, 255, 255, 0.25)',
    cursor: 'pointer',
    outline: 'none',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    animation: 'heartbeat-color-pulse 2s infinite ease-in-out',
    display: 'block',
    margin: '20px auto'
  };

  var keyframeCss = '@keyframes heartbeat-color-pulse { ' +
    '0% { transform: scale(1); background-color: #990000; color: #FAF5EB; box-shadow: 0 4px 15px rgba(153, 0, 0, 0.4); } ' +
    '14% { transform: scale(1.08); background-color: #D32F2F; color: #FAF5EB; box-shadow: 0 6px 20px rgba(211, 47, 47, 0.6); } ' +
    '28% { transform: scale(1.02); background-color: #990000; color: #FAF5EB; box-shadow: 0 4px 15px rgba(153, 0, 0, 0.4); } ' +
    '42% { transform: scale(1.12); background-color: #FFE600; color: #1A1A1A; box-shadow: 0 8px 25px rgba(255, 230, 0, 0.7); } ' +
    '70% { transform: scale(1); background-color: #990000; color: #FAF5EB; box-shadow: 0 4px 15px rgba(153, 0, 0, 0.4); } ' +
    '100% { transform: scale(1); background-color: #990000; color: #FAF5EB; box-shadow: 0 4px 15px rgba(153, 0, 0, 0.4); } ' +
  '}';

  return (
    React.createElement(React.Fragment, null,
      React.createElement('style', null, keyframeCss),
      React.createElement('button', {
        style: buttonStyle,
        onClick: handleClick
      }, buttonText)
    )
  );
}

export default HeartbeatVideoButton;
