import React from 'react';

const LeftSidebar = () => {
  return (
    <div style={{
      width: '280px',
      height: '832px',
      background: 'radial-gradient(80.18% 141.42% at 0% 100%, #FCF9F7 0%, #FFF 100%)',
      boxShadow: '4px 0 12px -8px rgba(84, 62, 4, 0.25)',
      position: 'absolute',
      left: '0px',
      top: '0px'
    }}>
      {/* Logo section */}
      <div style={{
        display: 'flex',
        width: '216px',
        alignItems: 'center',
        gap: '8px',
        position: 'absolute',
        left: '32px',
        top: '40px',
        height: '64px'
      }}>
        <img 
          style={{
            width: '64px',
            height: '64px'
          }}
          src="https://api.builder.io/api/v1/image/assets/TEMP/60e679c2382ff8daadccb9add703b2d7d9d98f0f?width=128"
          alt="Logo"
        />
        <div style={{
          fontFamily: 'DM Serif Display',
          fontSize: '16px',
          fontWeight: 400,
          lineHeight: '110%',
          background: 'linear-gradient(80deg, #331300 0%, #755A3B 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Indian Heritage.
        </div>
      </div>

      {/* Navigation Menu */}
      <div style={{
        display: 'flex',
        width: '232px',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '12px',
        position: 'absolute',
        left: '32px',
        top: '200px'
      }}>
        {/* Home */}
        <div style={{
          display: 'flex',
          padding: '16px',
          alignItems: 'center',
          gap: '12px',
          alignSelf: 'stretch'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M12.5547 4.57029C12.2188 4.34636 11.7812 4.34636 11.4453 4.57029L4.4453 9.23696C4.1671 9.42243 4 9.73466 4 10.069V18.9986C4 19.5509 4.44772 19.9986 5 19.9986H8V15.9986C8 14.3418 9.34315 12.9986 11 12.9986H13C14.6569 12.9986 16 14.3418 16 15.9986V19.9986H19C19.5523 19.9986 20 19.5509 20 18.9986V10.069C20 9.73466 19.8329 9.42243 19.5547 9.23696L12.5547 4.57029Z" fill="#62605B"/>
          </svg>
          <div style={{
            color: '#7E7C76',
            fontFamily: 'Alegreya Sans',
            fontSize: '16px',
            fontWeight: 700,
            lineHeight: '150%',
            letterSpacing: '0.8px',
            textTransform: 'uppercase'
          }}>
            Home
          </div>
        </div>

        {/* Challenges */}
        <div style={{
          display: 'flex',
          padding: '16px',
          alignItems: 'center',
          gap: '12px',
          alignSelf: 'stretch'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3Z" fill="#7E7C76"/>
          </svg>
          <div style={{
            color: '#7E7C76',
            fontFamily: 'Alegreya Sans',
            fontSize: '16px',
            fontWeight: 700,
            lineHeight: '150%',
            letterSpacing: '0.8px',
            textTransform: 'uppercase'
          }}>
            Challenges
          </div>
        </div>

        {/* My Collection - Active */}
        <div style={{
          display: 'flex',
          padding: '16px',
          alignItems: 'center',
          gap: '12px',
          alignSelf: 'stretch',
          borderRadius: '2px',
          background: '#FCF2D7'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M1 4C1 2.34315 2.34315 1 4 1H22C22.5523 1 23 1.44772 23 2V19C23 19.5523 22.5523 20 22 20H2C1.44772 20 1 19.5523 1 19V4Z" fill="#332502"/>
          </svg>
          <div style={{
            color: '#332502',
            fontFamily: 'Alegreya Sans',
            fontSize: '16px',
            fontWeight: 700,
            lineHeight: '150%',
            letterSpacing: '0.8px',
            textTransform: 'uppercase'
          }}>
            My Collection
          </div>
        </div>

        {/* Showcase */}
        <div style={{
          display: 'flex',
          padding: '16px',
          alignItems: 'center',
          gap: '12px',
          alignSelf: 'stretch'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M3 2C3 1.44772 3.44772 1 4 1H20C20.5523 1 21 1.44772 21 2V16.5C21 17.0523 20.5523 17.5 20 17.5H4C3.44772 17.5 3 17.0523 3 16.5V2Z" fill="#62605B"/>
          </svg>
          <div style={{
            color: '#7E7C76',
            fontFamily: 'Alegreya Sans',
            fontSize: '16px',
            fontWeight: 700,
            lineHeight: '150%',
            letterSpacing: '0.8px',
            textTransform: 'uppercase'
          }}>
            Showcase
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;