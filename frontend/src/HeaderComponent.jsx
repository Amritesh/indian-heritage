import React from 'react';

const HeaderComponent = ({ query, setQuery }) => {
  return (
    <div style={{
      width: '1000px',
      height: '92px',
      borderBottom: '1px solid #FEDC85',
      position: 'absolute',
      left: '280px',
      top: '0px'
    }}>
      {/* Header content */}
      <div style={{
        display: 'inline-flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '28px',
        position: 'absolute',
        left: '844px',
        top: '24px',
        width: '124px',
        height: '48px'
      }}>
        {/* Notification icon */}
        <div style={{
          display: 'flex',
          width: '48px',
          height: '48px',
          padding: '12px',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M5.39404 8.55577C5.84677 6.20157 7.90673 4.5 10.3041 4.5H13.6959C16.0933 4.5 18.1532 6.20156 18.606 8.55576L20.482 18.3112C20.5383 18.6041 20.461 18.9069 20.271 19.1368C20.081 19.3668 19.7983 19.5 19.5 19.5H4.50001C4.20171 19.5 3.91899 19.3668 3.72902 19.1368C3.53905 18.9069 3.46167 18.6041 3.518 18.3112L5.39404 8.55577Z" fill="#514F4B"/>
          </svg>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#BA2525',
            position: 'absolute',
            right: '8px',
            top: '8px'
          }} />
        </div>
        
        {/* Profile picture */}
        <img 
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '2px',
            boxShadow: '0 2px 4px 0 rgba(51, 19, 0, 0.12)'
          }}
          src="https://api.builder.io/api/v1/image/assets/TEMP/8882b49a194cc7a394e49f22ab463ef67368b98c?width=96"
          alt="Profile"
        />
      </div>

      {/* Search Bar */}
      <div style={{
        display: 'inline-flex',
        padding: '12px 16px',
        alignItems: 'center',
        borderRadius: '4px',
        background: '#FFF',
        boxShadow: '0 2px 4px -1px rgba(51, 37, 2, 0.04)',
        position: 'absolute',
        left: '28px',
        top: '22px',
        width: '428px',
        height: '48px'
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
          <path fillRule="evenodd" clipRule="evenodd" d="M8.1189 4.02972C4.75594 4.02972 2.02972 6.75594 2.02972 10.1189C2.02972 13.4819 4.75594 16.2081 8.1189 16.2081C11.4819 16.2081 14.2081 13.4819 14.2081 10.1189C14.2081 6.75594 11.4819 4.02972 8.1189 4.02972Z" fill="#514F4B"/>
        </svg>
        <input
          type="text"
          placeholder="Search for collections"
          value={query}
          onChange={(e) => { setQuery(e.target.value); }}
          style={{
            border: 'none',
            outline: 'none',
            width: '100%',
            color: '#514F4B',
            fontFamily: 'Alegreya Sans',
            fontSize: '16px',
            background: 'transparent'
          }}
        />
      </div>
    </div>
  );
};

export default HeaderComponent;