import CalendarWidget from './CalendarWidget'

function App() {
  return (
    <>
      <div className="container">

        {/* Card 1: Festival Header */}
        <div className="card card-black tall">
          <div className="header-section">
            <h1>Design<br/>Festival<br/>2023</h1>
          </div>
        </div>

        {/* Card 2-3: Interactive Calendar Widget */}
        <div className="card card-black wide tall" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <CalendarWidget />
        </div>

        {/* Card 4: Holiday Village */}
        <div className="card card-orange tall">
          <h1>Holiday<br/>Village<br/>Cinemas</h1>
        </div>

        {/* Card 5: Widget Dashboard */}
        <div className="card card-black extra-tall" style={{
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: 'auto auto auto',
          gap: '12px'
        }}>
          {/* Time Widget */}
          <div style={{
            background: '#5a5a5a',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gridColumn: 'span 2'
          }}>
            <div style={{
              fontSize: '56px',
              fontWeight: '700',
              lineHeight: 1,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums'
            }}>06:40</div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              opacity: 0.7,
              marginTop: '4px'
            }}>AM</div>
          </div>

          {/* Date Widget */}
          <div style={{
            background: '#ccff00',
            borderRadius: '18px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#1a1a1a'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', lineHeight: 1 }}>Tue</div>
            <div style={{ fontSize: '32px', fontWeight: '700', lineHeight: 1 }}>20</div>
          </div>

          {/* Temperature Widget */}
          <div style={{
            background: '#3a3a3a',
            borderRadius: '50%',
            aspectRatio: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '600',
              fontVariantNumeric: 'tabular-nums'
            }}>23°</div>
          </div>

          {/* Stats Widget */}
          <div style={{
            background: '#5a5a5a',
            borderRadius: '18px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            gridColumn: 'span 2'
          }}>
            {/* Arrow Icon */}
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <div style={{
                background: '#2a2a2a',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>↗</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '4px'
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    opacity: 0.8
                  }}>Speed</div>
                  <div style={{
                    fontSize: '10px',
                    opacity: 0.6
                  }}>10km/Hours</div>
                </div>
                <div style={{
                  background: '#3a3a3a',
                  height: '4px',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: '#ccff00',
                    height: '100%',
                    width: '65%'
                  }}></div>
                </div>
              </div>
            </div>

            {/* Time Progress */}
            <div style={{ paddingLeft: '62px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '4px'
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  opacity: 0.8
                }}>Time</div>
                <div style={{
                  fontSize: '10px',
                  opacity: 0.6
                }}>1 Hrs 42 Min</div>
              </div>
              <div style={{
                background: '#3a3a3a',
                height: '4px',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: '#ccff00',
                  height: '100%',
                  width: '45%'
                }}></div>
              </div>
            </div>

            {/* Distance Display */}
            <div style={{
              background: '#6a6a6a',
              borderRadius: '12px',
              padding: '12px 16px',
              marginTop: '4px',
              textAlign: 'right'
            }}>
              <div style={{
                fontSize: '28px',
                fontWeight: '700',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums'
              }}>12.000</div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                opacity: 0.7,
                marginTop: '2px'
              }}>km</div>
            </div>
          </div>
        </div>

        {/* Card 6: Arrow Card */}
        <div className="card card-black tall">
          <div style={{
            background: '#8a8a8a',
            height: '60px',
            borderRadius: '8px',
            marginBottom: '12px'
          }}></div>
          <h2>Holiday<br/>Village<br/>Cinemas</h2>
          <div className="arrow">→</div>
        </div>

        {/* Card 7: Film Screening Times */}
        <div className="card card-orange extra-tall">
          <div className="header-section">
            <h2>Holiday<br/>Village<br/>Cinemas</h2>
            <div className="small-text" style={{ marginTop: '16px' }}>
              <strong>IS THERE ANYONE OUT THERE?</strong>
            </div>
            <div className="schedule">
              <div className="schedule-item"><span>JAN. 21</span><span>2:15PM</span></div>
              <div className="schedule-item"><span>JAN. 23</span><span>9:45PM</span></div>
              <div className="schedule-item"><span>JAN. 22</span><span>11:30AM</span></div>
              <div className="schedule-item"><span>JAN. 25</span><span>6:30PM</span></div>
              <div className="schedule-item"><span>JAN. 22</span><span>7:00PM</span></div>
              <div className="schedule-item"><span>JAN. 27</span><span>3:15PM</span></div>
            </div>
            <div className="divider"></div>
            <div className="small-text" style={{ marginTop: '12px' }}>
              <strong>THE DISAPPEARANCE OF SHERE HITE</strong>
            </div>
            <div className="schedule">
              <div className="schedule-item"><span>JAN. 21</span><span>6:00PM</span></div>
              <div className="schedule-item"><span>JAN. 24</span><span>3:30PM</span></div>
              <div className="schedule-item"><span>JAN. 22</span><span>2:45PM</span></div>
              <div className="schedule-item"><span>JAN. 26</span><span>8:15PM</span></div>
              <div className="schedule-item"><span>JAN. 23</span><span>12:00PM</span></div>
              <div className="schedule-item"><span>JAN. 28</span><span>5:00PM</span></div>
            </div>
            <div className="divider"></div>
            <div className="small-text" style={{ marginTop: '12px' }}>
              <strong>LITTLE RICHARD: I AM EVERYTHING</strong>
            </div>
            <div className="schedule">
              <div className="schedule-item"><span>JAN. 20</span><span>7:15PM</span></div>
              <div className="schedule-item"><span>JAN. 24</span><span>4:30PM</span></div>
              <div className="schedule-item"><span>JAN. 21</span><span>3:30PM</span></div>
              <div className="schedule-item"><span>JAN. 26</span><span>9:00PM</span></div>
            </div>
          </div>
          <div className="footer-section">
            <h2 style={{ marginTop: '20px' }}>Film<br/>Screening<br/>Times</h2>
          </div>
        </div>

        {/* Card 8: Festival Info */}
        <div className="card card-orange tall">
          <div className="badge">FESTIVAL INFO</div>
          <h2>GET THERE & AROUND</h2>
          <p style={{ marginTop: '12px' }}>Salt Lake City International Airport (SLC) is located just 7 miles from downtown. Ground transportation options available.</p>
        </div>

        {/* Card 9: Volunteer */}
        <div className="card card-orange tall">
          <h1>Full Time<br/>Volunteer</h1>
          <div className="small-text" style={{ marginTop: 'auto' }}>
            SEE FILMS & ATTEND<br/>
            PANELS WHILE HELPING<br/>
            FESTIVAL OPERATIONS
          </div>
        </div>

        {/* Card 10: All Eyes */}
        <div className="card card-black tall">
          <h2>All Eyes on<br/>Independents</h2>
        </div>

        {/* Card 11: Info Card */}
        <div className="card card-dark-gray tall">
          <div className="badge" style={{ background: 'white', color: '#1a1a1a' }}>SHORT FILM DOCUMENTARY</div>
          <h3 style={{ marginTop: 'auto' }}>Sundance<br/>Institute</h3>
        </div>

        {/* Card 12: Fantastic Machine */}
        <div className="card card-orange tall">
          <h1>Fantastic<br/>Machine</h1>
        </div>

        {/* Card 13: Event Details */}
        <div className="card card-black tall">
          <div className="header-section">
            <div className="small-text">January 25 2023</div>
            <h2 style={{ marginTop: '8px' }}>3:15 PM</h2>
            <div className="subtitle">Holiday Village<br/>Park City, UT</div>
          </div>
          <div className="qr-placeholder">
            <div style={{ width: '60px', height: '60px', background: 'white' }}></div>
          </div>
          <div className="small-text" style={{ marginTop: '12px' }}>
            SINGLE TICKET ADM. / FILMMAKER<br/>
            AND GUEST SCREENING PASS /<br/>
            CONFERENCE PASS / FESTIVAL PASS
          </div>
        </div>

        {/* Card 14: Film Info */}
        <div className="card card-orange">
          <div className="small-text">
            <strong>AXEL DANIELSON</strong><br/>
            MAXIMILIEN VAN AERTRYCK
          </div>
        </div>

      </div>

      {/* Design Rationale Section */}
      <div style={{
        maxWidth: '100%',
        margin: '80px 0 0',
        padding: '60px 40px',
        background: 'white',
        color: '#1a1a1a'
      }}>

        {/* Heavy Top Rule */}
        <div style={{
          height: '8px',
          background: '#1a1a1a',
          marginBottom: '60px'
        }}></div>

        {/* Main Grid */}
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '60px'
        }}>

          {/* Left Column: Header */}
          <div>
            <h2 style={{
              fontSize: '72px',
              fontWeight: '800',
              lineHeight: 0.9,
              letterSpacing: '-0.02em'
            }}>Design<br/>Rationale</h2>
          </div>

          {/* Right Column: Running Text */}
          <div>

            {/* Section 1 */}
            <div style={{ marginBottom: '50px' }}>
              <div style={{ height: '2px', background: '#1a1a1a', marginBottom: '20px' }}></div>
              <h3 style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}>Color System</h3>
              <p style={{ fontSize: '16px', lineHeight: 1.6, fontWeight: '400' }}>
                Bold, high-contrast palette built on three core colors: vibrant orange-coral (#ff6b4a), deep black (#1a1a1a), and electric lime (#ccff00). This creates immediate visual hierarchy and energy while maintaining professional readability. Gray tones provide neutral balance for complex information displays.
              </p>
            </div>

            {/* Section 2 */}
            <div style={{ marginBottom: '50px' }}>
              <div style={{ height: '2px', background: '#1a1a1a', marginBottom: '20px' }}></div>
              <h3 style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}>Typography</h3>
              <p style={{ fontSize: '16px', lineHeight: 1.6, fontWeight: '400' }}>
                Inter font family delivers clean, modern aesthetics with excellent readability. Heavy weights (700-800) paired with tight line-height (0.95-1.1) create impactful headlines. Negative letter-spacing enhances density. Small text maintains legibility through careful size hierarchy (11-14px).
              </p>
            </div>

            {/* Section 3 */}
            <div style={{ marginBottom: '50px' }}>
              <div style={{ height: '2px', background: '#1a1a1a', marginBottom: '20px' }}></div>
              <h3 style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}>Layout Philosophy</h3>
              <p style={{ fontSize: '16px', lineHeight: 1.6, fontWeight: '400' }}>
                CSS Grid enables flexible card-based composition where each element can span multiple columns/rows. Variable card sizes create visual rhythm and information hierarchy. 16-20px gaps provide breathing room while maintaining density. Rounded corners (16-20px) soften the geometric precision.
              </p>
            </div>

            {/* Section 4 */}
            <div style={{ marginBottom: '50px' }}>
              <div style={{ height: '2px', background: '#1a1a1a', marginBottom: '20px' }}></div>
              <h3 style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}>LCD Widget Aesthetic</h3>
              <p style={{ fontSize: '16px', lineHeight: 1.6, fontWeight: '400' }}>
                Gradient gray backgrounds (#b8b8b8 to #d4d4d4) with subtle inset shadows evoke e-ink and LCD displays. Black text on gray creates the nostalgic digital readout feel. Progress bars, tabular numbers, and clean data visualization reference fitness trackers and smartwatch interfaces.
              </p>
            </div>

            {/* Section 5 */}
            <div style={{ marginBottom: '50px' }}>
              <div style={{ height: '2px', background: '#1a1a1a', marginBottom: '20px' }}></div>
              <h3 style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}>Information Density</h3>
              <p style={{ fontSize: '16px', lineHeight: 1.6, fontWeight: '400' }}>
                Strategic contrast between sparse, bold statement cards and dense schedule/data cards. Some cards feature single large headlines, others pack detailed schedules and metrics. This variation maintains engagement while serving different content purposes.
              </p>
            </div>

            {/* Section 6 */}
            <div style={{ marginBottom: '50px' }}>
              <div style={{ height: '2px', background: '#1a1a1a', marginBottom: '20px' }}></div>
              <h3 style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}>Component Modularity</h3>
              <p style={{ fontSize: '16px', lineHeight: 1.6, fontWeight: '400' }}>
                Self-contained widget components (calendar, metrics dashboard, schedules) can be composed, rearranged, and scaled. Each maintains consistent internal design language while offering distinct functionality. Badges, progress bars, and circular indicators create visual cohesion.
              </p>
            </div>

            {/* Heavy Rule Before Identity */}
            <div style={{ height: '4px', background: '#1a1a1a', margin: '60px 0 40px' }}></div>

            {/* Design Identity */}
            <div style={{ marginBottom: '50px' }}>
              <h3 style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}>Design Identity</h3>
              <p style={{ fontSize: '18px', lineHeight: 1.7, fontWeight: '400' }}>
                This system combines festival poster boldness with digital interface precision. It draws from contemporary event branding (Sundance, SXSW) while incorporating smartwatch/fitness app UI patterns. The result is energetic yet organized, expressive yet functional—perfect for communicating dense event information with personality and clarity.
              </p>
            </div>

            {/* System Name */}
            <div style={{
              borderLeft: '8px solid #ff6b4a',
              paddingLeft: '24px',
              marginTop: '50px'
            }}>
              <p style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '12px',
                opacity: 0.6
              }}>Design System</p>
              <h4 style={{
                fontSize: '32px',
                fontWeight: '800',
                lineHeight: 1.1,
                marginBottom: '12px'
              }}>"Digital Festival"</h4>
              <p style={{ fontSize: '16px', lineHeight: 1.6, fontWeight: '400' }}>
                Bridging physical event experiences with digital interface design.
              </p>
            </div>

          </div>
        </div>

        {/* Bottom Heavy Rule */}
        <div style={{ height: '8px', background: '#1a1a1a', marginTop: '80px' }}></div>

      </div>
    </>
  )
}

export default App
