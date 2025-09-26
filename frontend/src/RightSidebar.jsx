import React from 'react';

const RightSidebar = ({ challengeProgress, leaderboardData }) => {
  return (
    <div style={{
      width: '280px',
      height: '740px',
      borderLeft: '1px dashed #543E04',
      position: 'absolute',
      left: '1000px',
      top: '92px'
    }}>
      <div style={{
        width: '224px',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '24px',
        position: 'absolute',
        left: '28px',
        top: '28px'
      }}>
        {/* Challenge Progress Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '20px',
          alignSelf: 'stretch'
        }}>
          <div style={{
            width: '224px',
            fontFamily: 'Alegreya',
            fontSize: '19px',
            fontWeight: 700,
            lineHeight: '120%',
            background: 'linear-gradient(80deg, #332502 0%, #A97B07 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Challenge Progress
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '16px',
            alignSelf: 'stretch'
          }}>
            {challengeProgress.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '12px',
                alignSelf: 'stretch'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  alignSelf: 'stretch'
                }}>
                  <div style={{
                    color: '#514F4B',
                    fontFamily: 'Alegreya Sans',
                    fontSize: '18px',
                    fontWeight: 500,
                    lineHeight: '150%',
                    letterSpacing: '-0.18px'
                  }}>
                    {item.title}
                  </div>
                  {item.hasMedal && (
                    <svg width="24" height="24" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7.5621 17.2065C7.39743 16.8643 7.18181 16.3854 6.95615 16.0874C6.66135 15.6981 5.41153 15.399 4.98974 14.8559C4.66236 14.4344 4.82568 13.7121 4.88038 13.2318C4.97221 12.4253 4.68773 12.1897 4.26649 11.5636C3.79934 10.8694 3.74596 10.5863 4.19765 9.9081C4.71271 9.13476 5.03334 9.06121 4.92018 8.17035C4.71196 6.53109 4.92801 6.38212 6.33318 5.76777C6.91274 5.51437 6.94781 5.4884 7.1834 4.91035C7.84907 3.2774 8.05495 3.38071 9.57824 3.60795C10.3033 3.71611 10.55 3.32013 11.1373 2.93253C12.117 2.28587 12.51 2.66497 13.3181 3.23551C13.7714 3.55553 13.7967 3.69538 14.3658 3.62311C15.003 3.5422 15.7842 3.2702 16.2532 3.86342C16.4909 4.16409 16.7285 4.74633 16.896 5.11194C17.1292 5.62115 17.164 5.6016 17.673 5.79248C19.2524 6.38488 19.2364 6.63356 19.085 8.17902C19.031 8.73042 19.0184 8.7719 19.3482 9.23404C19.8812 9.98081 20.3947 10.5871 19.8001 11.4704C19.3263 12.1743 19.0214 12.1922 19.0803 13.0377C19.1242 13.6669 19.3489 14.7148 18.7543 15.1468C18.3568 15.4355 17.4094 15.6613 17.1477 15.9186C16.981 16.0824 16.5328 17.0137 16.4445 17.2656C16.3831 17.3164 16.2705 17.5278 16.1847 17.6174C15.7965 18.0226 14.9545 17.8263 14.4427 17.7612C13.9089 17.6932 13.7836 17.7294 13.3289 18.033C12.1331 18.8318 11.8473 18.7755 10.6808 18.022C9.87309 17.5003 9.37739 17.8406 8.49117 17.8593C7.77084 17.8745 7.87317 17.469 7.57157 17.1788L7.5621 17.2065Z" fill="url(#paint0_linear)"/>
                      <defs>
                        <linearGradient id="paint0_linear" x1="17.4998" y1="-4.50195" x2="3.49975" y2="19.498" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#FDB90B"/>
                          <stop offset="1" stopColor="#FED05C"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '4px',
                  alignSelf: 'stretch'
                }}>
                  <div style={{
                    height: '6px',
                    alignSelf: 'stretch',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: '224px',
                      height: '6px',
                      borderRadius: '1px',
                      background: '#A3D9A5',
                      position: 'absolute',
                      left: '0px',
                      top: '0px'
                    }} />
                    <div style={{
                      width: `${(item.progress / item.total) * 224}px`,
                      height: '6px',
                      background: 'linear-gradient(90deg, #57AE5B -2.31%, #0E5814 100.43%)',
                      opacity: 0.7,
                      position: 'absolute',
                      left: '0px',
                      top: '0px'
                    }} />
                    <svg style={{
                      width: '16px',
                      height: '16px',
                      fill: '#3F9142',
                      position: 'absolute',
                      left: `${Math.max(0, (item.progress / item.total) * 224 - 8)}px`,
                      top: '-5px'
                    }} viewBox="0 0 16 16">
                      <path d="M7.29289 0.707106C7.68342 0.316582 8.31658 0.316583 8.70711 0.707107L15.2929 7.29289C15.6834 7.68342 15.6834 8.31658 15.2929 8.70711L8.70711 15.2929C8.31658 15.6834 7.68342 15.6834 7.29289 15.2929L0.707106 8.70711C0.316582 8.31658 0.316583 7.68342 0.707107 7.29289L7.29289 0.707106Z" fill="#3F9142"/>
                    </svg>
                  </div>
                  <div style={{
                    alignSelf: 'stretch',
                    color: '#207227',
                    textAlign: 'right',
                    fontFamily: 'Alegreya Sans',
                    fontSize: '16px',
                    fontWeight: 700,
                    lineHeight: '150%',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase'
                  }}>
                    {item.progress} / {item.total}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: '224px',
          height: '1px',
          opacity: 0.45,
          background: 'linear-gradient(90deg, #D39A09 0%, #543E04 100%)'
        }} />

        {/* Total Items */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '4px',
          alignSelf: 'stretch'
        }}>
          <div style={{
            alignSelf: 'stretch',
            fontFamily: 'Alegreya',
            fontSize: '38px',
            fontWeight: 500,
            lineHeight: '48px',
            letterSpacing: '-0.38px',
            background: 'linear-gradient(80deg, #332502 0%, #A97B07 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            1027
          </div>
          <div style={{
            alignSelf: 'stretch',
            color: '#62605B',
            fontFamily: 'Alegreya Sans',
            fontSize: '16px',
            fontWeight: 700,
            lineHeight: '150%',
            letterSpacing: '0.8px',
            textTransform: 'uppercase'
          }}>
            total items added
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: '224px',
          height: '1px',
          opacity: 0.45,
          background: 'linear-gradient(270deg, #D39A09 0%, #543E04 100%)'
        }} />

        {/* Leaderboard */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '16px',
          alignSelf: 'stretch'
        }}>
          <div style={{
            alignSelf: 'stretch',
            fontFamily: 'Alegreya',
            fontSize: '19px',
            fontWeight: 700,
            lineHeight: '120%',
            background: 'linear-gradient(80deg, #332502 0%, #A97B07 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Leaderboard position
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '20px',
            alignSelf: 'stretch'
          }}>
            {leaderboardData.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                alignSelf: 'stretch'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  alignSelf: 'stretch'
                }}>
                  <div style={{
                    color: '#514F4B',
                    fontFamily: 'Alegreya Sans',
                    fontSize: '18px',
                    fontWeight: 700,
                    lineHeight: '150%',
                    letterSpacing: '-0.18px'
                  }}>
                    {item.position}
                  </div>
                  {item.hasMedal && (
                    <svg width="24" height="24" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7.5621 17.2065C7.39743 16.8643 7.18181 16.3854 6.95615 16.0874C6.66135 15.6981 5.41153 15.399 4.98974 14.8559C4.66236 14.4344 4.82568 13.7121 4.88038 13.2318C4.97221 12.4253 4.68773 12.1897 4.26649 11.5636C3.79934 10.8694 3.74596 10.5863 4.19765 9.9081C4.71271 9.13476 5.03334 9.06121 4.92018 8.17035C4.71196 6.53109 4.92801 6.38212 6.33318 5.76777C6.91274 5.51437 6.94781 5.4884 7.1834 4.91035C7.84907 3.2774 8.05495 3.38071 9.57824 3.60795C10.3033 3.71611 10.55 3.32013 11.1373 2.93253C12.117 2.28587 12.51 2.66497 13.3181 3.23551C13.7714 3.55553 13.7967 3.69538 14.3658 3.62311C15.003 3.5422 15.7842 3.2702 16.2532 3.86342C16.4909 4.16409 16.7285 4.74633 16.896 5.11194C17.1292 5.62115 17.164 5.6016 17.673 5.79248C19.2524 6.38488 19.2364 6.63356 19.085 8.17902C19.031 8.73042 19.0184 8.7719 19.3482 9.23404C19.8812 9.98081 20.3947 10.5871 19.8001 11.4704C19.3263 12.1743 19.0214 12.1922 19.0803 13.0377C19.1242 13.6669 19.3489 14.7148 18.7543 15.1468C18.3568 15.4355 17.4094 15.6613 17.1477 15.9186C16.981 16.0824 16.5328 17.0137 16.4445 17.2656C16.3831 17.3164 16.2705 17.5278 16.1847 17.6174C15.7965 18.0226 14.9545 17.8263 14.4427 17.7612C13.9089 17.6932 13.7836 17.7294 13.3289 18.033C12.1331 18.8318 11.8473 18.7755 10.6808 18.022C9.87309 17.5003 9.37739 17.8406 8.49117 17.8593C7.77084 17.8745 7.87317 17.469 7.57157 17.1788L7.5621 17.2065Z" fill="url(#paint1_linear)"/>
                      <defs>
                        <linearGradient id="paint1_linear" x1="17.4998" y1="-4.50195" x2="3.49975" y2="19.498" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#FDB90B"/>
                          <stop offset="1" stopColor="#FED05C"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  )}
                </div>
                <div style={{
                  alignSelf: 'stretch',
                  color: '#62605B',
                  fontFamily: 'Alegreya Sans',
                  fontSize: '16px',
                  fontWeight: 500,
                  lineHeight: '150%',
                  letterSpacing: '-0.16px'
                }}>
                  {item.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;