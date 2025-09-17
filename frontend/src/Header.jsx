import React from 'react';

export default function Header() {
  const primary = '#332502';
  const neutral = '#7E7C76';

  return (
    <header style={{background: '#fff', borderBottom: '1px solid #FEDC85', position: 'relative'}}>
      <div className="container-custom" style={{height: 92, display: 'flex', alignItems: 'center', position: 'relative'}}>
        <div style={{display: 'flex', alignItems: 'center'}}>
          <div style={{width: 200}}>
            <div style={{fontFamily: 'Alegreya Sans, sans-serif', color: primary, fontWeight: 600}}>Indian Heritage.</div>
          </div>
        </div>

        <div style={{position: 'absolute', left: 28, top: 22, width: 428, height: 48}}>
          {/* Search bar from temp.json */}
          <div style={{display: 'flex', alignItems: 'center', padding: '12px 16px', background: '#fff', borderRadius: 4, boxShadow: '0 2px 4px -1px rgba(51,37,2,0.04)'}}>
            <svg width="156" height="24" viewBox="0 0 156 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
              <path d="M8.1189 4.02972C4.75594 4.02972 2.02972 6.75594 2.02972 10.1189C2.02972 13.4819 4.75594 16.2081 8.1189 16.2081C11.4819 16.2081 14.2081 13.4819 14.2081 10.1189C14.2081 6.75594 11.4819 4.02972 8.1189 4.02972Z" fill="#514F4B"/>
              <text x="28" y="16.8" fill="#514F4B" fontFamily="Alegreya Sans" fontSize={16}>Search for collections</text>
            </svg>
          </div>
        </div>

        <div style={{position: 'absolute', right: 28, top: 24, display: 'flex', alignItems: 'center', gap: 28}}>
          <div style={{width: 48, height: 48, position: 'relative'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{position:'absolute', left:12, top:12}}>
              <path d="M5.394 8.556C5.847 6.202 7.907 4.5 10.304 4.5H13.696C16.093 4.5 18.153 6.202 18.606 8.556L20.482 18.311C20.538 18.604 20.461 18.907 20.271 19.137C20.081 19.367 19.798 19.5 19.5 19.5H4.5C4.202 19.5 3.919 19.367 3.729 19.137C3.539 18.907 3.462 18.604 3.518 18.311L5.394 8.556Z" fill="#514F4B" />
            </svg>
            <svg width="8" height="8" viewBox="0 0 8 8" style={{position:'absolute', left:16, top:0}}>
              <circle cx="4" cy="4" r="4" fill="#BA2525" />
            </svg>
          </div>

          <img src="https://api.builder.io/api/v1/image/assets/TEMP/8882b49a194cc7a394e49f22ab463ef67368b98c?width=96" alt="profile" style={{width:48,height:48,borderRadius:2,boxShadow:'0 2px 4px rgba(51,19,0,0.12)'}} />
        </div>
      </div>
    </header>
  );
}
