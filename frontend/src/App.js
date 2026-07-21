  import React, { useState, useEffect } from 'react';
  import './App.css';

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // ===== COLOR CONSTANTS =====
  const COLORS = {
    darkBg: 'rgb(10, 25, 41)',
    darkBgAlt: 'rgb(19, 47, 76)',
    lightText: 'rgb(224, 224, 224)',
    grayText: 'rgb(137, 153, 187)',
    mutedGray: 'rgb(160, 160, 160)',
    border: 'rgb(30, 58, 138)',
    primary: 'rgb(30, 58, 138)',
    accent: 'rgb(33, 150, 243)',
    success: 'rgb(76, 175, 80)',
    warning: 'rgb(255, 152, 0)',
    danger: 'rgb(244, 67, 54)',
    purpleLine: 'rgb(156, 39, 176)',
    greenLine: 'rgb(76, 175, 80)',
    yellowLine: 'rgb(255, 235, 59)',
    redAlert: 'rgb(255, 107, 107)',
    darkRed: 'rgb(74, 31, 31)',
    darkGreen: 'rgb(30, 70, 32)',
    chartBar: 'rgb(170, 102, 255)',
    chartLine: 'rgb(76, 175, 80)'
  };

  // ===== API HELPER =====
  const apiCall = async (endpoint, method = 'GET', data = null) => {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const config = { method, headers };
    if (data) config.body = JSON.stringify(data);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'API Error');
    return result;
  };

  // ===== CROWD SIMULATION CONSTANTS =====
  const PEAK_HOURS_MULTIPLIERS = {
    "5-7": 0.5, "7-10": 1.8, "10-12": 1.2, "12-13": 0.8,
    "13-17": 0.9, "17-20": 2.0, "20-23": 1.2, "23-5": 0
  };

  const STATION_TYPE_BASE_CROWDS = {
    tech_hub: { morning: 80, lunch: 60, evening: 90 },
    business_district: { morning: 85, lunch: 70, evening: 80 },
    residential_area: { morning: 75, lunch: 40, evening: 85 },
    interchange: { morning: 90, lunch: 75, evening: 95 },
    mid_line: { morning: 60, lunch: 50, evening: 65 }
  };

  const DAY_OF_WEEK_MULTIPLIERS = { 0: 0.40, 1: 1.15, 2: 1.10, 3: 1.00, 4: 1.05, 5: 0.95, 6: 0.60 };

  const calculateCrowdLevel = (stationName, stationType = 'mid_line', customTime = null) => {
    const time = customTime || new Date();
    const hour = time.getHours();
    const dayOfWeek = time.getDay();

    let baseCrowd = 50;
    if (hour >= 7 && hour < 10) baseCrowd = STATION_TYPE_BASE_CROWDS[stationType].morning;
    else if (hour >= 12 && hour < 13) baseCrowd = STATION_TYPE_BASE_CROWDS[stationType].lunch;
    else if (hour >= 17 && hour < 20) baseCrowd = STATION_TYPE_BASE_CROWDS[stationType].evening;
    else baseCrowd = STATION_TYPE_BASE_CROWDS[stationType].morning * 0.5;

    let hourMultiplier = 0;
    if (hour >= 5 && hour < 7) hourMultiplier = PEAK_HOURS_MULTIPLIERS["5-7"];
    else if (hour >= 7 && hour < 10) hourMultiplier = PEAK_HOURS_MULTIPLIERS["7-10"];
    else if (hour >= 10 && hour < 12) hourMultiplier = PEAK_HOURS_MULTIPLIERS["10-12"];
    else if (hour >= 12 && hour < 13) hourMultiplier = PEAK_HOURS_MULTIPLIERS["12-13"];
    else if (hour >= 13 && hour < 17) hourMultiplier = PEAK_HOURS_MULTIPLIERS["13-17"];
    else if (hour >= 17 && hour < 20) hourMultiplier = PEAK_HOURS_MULTIPLIERS["17-20"];
    else if (hour >= 20 && hour < 23) hourMultiplier = PEAK_HOURS_MULTIPLIERS["20-23"];
    else if (hour >= 23 || hour < 5) hourMultiplier = PEAK_HOURS_MULTIPLIERS["23-5"];

    const dayMultiplier = DAY_OF_WEEK_MULTIPLIERS[dayOfWeek];
    let crowd = baseCrowd * hourMultiplier * dayMultiplier;
    crowd += (Math.random() - 0.5) * 10;
    crowd = Math.max(0, Math.min(100, crowd));
    return Math.round(crowd);
  };

  const getCrowdStatus = (crowdLevel) => {
    if (crowdLevel < 40) return { status: "Low", color: COLORS.success };
    if (crowdLevel < 70) return { status: "Medium", color: COLORS.warning };
    return { status: "High", color: COLORS.danger };
  };

  // Fares and station counts come from the backend planner, which walks the
  // actual network. Colour for each line, used when drawing journey legs.
  const LINE_COLORS = {
    purple: COLORS.purpleLine,
    green: COLORS.greenLine,
    yellow: COLORS.yellowLine
  };

  // ===== CALCULATE AVERAGE CROWD BY HOUR =====
  const calculateAverageCrowdByHour = () => {
    const hourlyData = {};
    for (let hour = 0; hour < 24; hour++) {
      let totalCrowd = 0;
      for (let i = 0; i < 10; i++) {
        const time = new Date();
        time.setHours(hour, 0, 0);
        totalCrowd += calculateCrowdLevel('random', 'mid_line', time);
      }
      const avgCrowd = Math.round(totalCrowd / 10);
      const hourLabel = hour < 12 ? `${hour === 0 ? 12 : hour} AM` : `${hour === 12 ? 12 : hour - 12} PM`;
      hourlyData[hourLabel] = avgCrowd;
    }
    return hourlyData;
  };

  // ===== CALCULATE DELAYS PER DAY =====
  const calculateDelaysPerDay = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const delays = {};
    days.forEach((day, idx) => {
      const baseDelay = 10 + Math.sin(idx * 0.8) * 8;
      delays[day] = Math.round(baseDelay);
    });
    return delays;
  };

  // ===== SIMPLE BAR CHART COMPONENT =====
  const SimpleBarChart = ({ data, maxValue = 100, barColor = COLORS.chartBar }) => {
    const entries = Object.entries(data);
    const chartHeight = 250;

    return (
      <div style={{ position: 'relative', height: chartHeight + 60, marginTop: '20px' }}>
        {/* Y-axis labels */}
        <div style={{ position: 'absolute', left: 0, top: 0, height: chartHeight, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '10px', textAlign: 'right', color: COLORS.mutedGray, fontSize: '12px' }}>
          <div>100</div>
          <div>75</div>
          <div>50</div>
          <div>25</div>
          <div>0</div>
        </div>

        {/* Chart area */}
        <div style={{ position: 'absolute', left: '40px', top: 0, right: 0, height: chartHeight, borderLeft: `1px solid ${COLORS.border}`, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'flex-end', gap: '4px', paddingBottom: '10px', paddingRight: '10px' }}>
          {entries.map((entry, idx) => {
            const value = entry[1];
            const heightPercent = (value / maxValue) * 100;
            return (
              <div key={idx} style={{ flex: 1, height: `${heightPercent}%`, backgroundColor: barColor, borderRadius: '4px 4px 0 0', opacity: 0.85, transition: 'all 0.3s' }} title={`${entry[0]}: ${value}`} />
            );
          })}
        </div>

        {/* X-axis labels */}
        <div style={{ position: 'absolute', left: '40px', top: chartHeight + 10, right: 0, display: 'flex', gap: '4px', paddingRight: '10px' }}>
          {entries.map((entry, idx) => (
            <div key={idx} style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: COLORS.grayText }}>
              {entry[0]}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ===== SIMPLE LINE CHART COMPONENT =====
  const SimpleLineChart = ({ data, maxValue = 20 }) => {
    const entries = Object.entries(data);
    const chartHeight = 200;
    const chartWidth = 600;
    const spacing = chartWidth / (entries.length - 1);

    // Calculate SVG path
    let pathD = '';
    entries.forEach((entry, idx) => {
      const value = entry[1];
      const x = idx * spacing;
      const y = chartHeight - (value / maxValue) * chartHeight;
      pathD += (idx === 0 ? 'M' : 'L') + ` ${x} ${y}`;
    });

    return (
      <div style={{ position: 'relative', height: chartHeight + 60, marginTop: '20px', overflow: 'auto' }}>
        {/* Y-axis labels */}
        <div style={{ position: 'absolute', left: 0, top: 0, height: chartHeight, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '10px', textAlign: 'right', color: COLORS.mutedGray, fontSize: '12px' }}>
          <div>20</div>
          <div>15</div>
          <div>10</div>
          <div>5</div>
          <div>0</div>
        </div>

        {/* SVG Chart */}
        <div style={{ position: 'absolute', left: '40px', top: 0, width: '100%', height: chartHeight }}>
          <svg width={chartWidth} height={chartHeight} style={{ borderLeft: `1px solid ${COLORS.border}`, borderBottom: `1px solid ${COLORS.border}` }}>
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map(i => (
              <line key={`gridH${i}`} x1="0" y1={i * (chartHeight / 4)} x2={chartWidth} y2={i * (chartHeight / 4)} stroke={COLORS.border} strokeDasharray="4" opacity="0.3" />
            ))}

            {/* Line path */}
            <path d={pathD} stroke={COLORS.chartLine} strokeWidth="2" fill="none" />

            {/* Data points */}
            {entries.map((entry, idx) => {
              const value = entry[1];
              const x = idx * spacing;
              const y = chartHeight - (value / maxValue) * chartHeight;
              return <circle key={idx} cx={x} cy={y} r="4" fill={COLORS.chartLine} />;
            })}
          </svg>
        </div>

        {/* X-axis labels */}
        <div style={{ position: 'absolute', left: '40px', top: chartHeight + 10, display: 'flex', gap: '0px', width: chartWidth }}>
          {entries.map((entry, idx) => (
            <div key={idx} style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: COLORS.grayText }}>
              {entry[0]}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ===== SEARCHABLE STATION PICKER =====
  // A plain <select> means scrolling 85 options, and it cannot distinguish the
  // interchanges: Majestic and RV Road each exist on two lines and render as
  // identical entries. This filters as you type and labels every option with
  // its line.
  const StationSearchSelect = ({ stations, value, onChange, placeholder }) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const containerRef = React.useRef(null);
    const listboxId = React.useId();

    const selected = stations.find(s => `${s.stationId}:${s.line}` === value);

    const matches = stations.filter(station => {
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      // Match the line name too, so "yellow" narrows to that line.
      return station.name.toLowerCase().includes(needle)
        || station.line.toLowerCase().includes(needle);
    });

    // Clicking outside should dismiss the list without selecting anything.
    useEffect(() => {
      if (!isOpen) return;
      const onDocumentMouseDown = (event) => {
        if (containerRef.current && !containerRef.current.contains(event.target)) {
          setIsOpen(false);
          setQuery('');
        }
      };
      document.addEventListener('mousedown', onDocumentMouseDown);
      return () => document.removeEventListener('mousedown', onDocumentMouseDown);
    }, [isOpen]);

    const commit = (station) => {
      onChange(`${station.stationId}:${station.line}`);
      setQuery('');
      setIsOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!isOpen) { setIsOpen(true); return; }
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setHighlight(prev => (prev + step + matches.length) % matches.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (isOpen && matches[highlight]) commit(matches[highlight]);
      } else if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    const inputStyle = {
      width: '100%', padding: '10px', backgroundColor: COLORS.darkBg,
      border: `1px solid ${COLORS.border}`, color: COLORS.lightText,
      borderRadius: '6px', boxSizing: 'border-box'
    };

    return (
      <div ref={containerRef} style={{position: 'relative'}}>
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          // Show the typed query while searching, the chosen station otherwise.
          value={isOpen ? query : (selected ? selected.name : '')}
          placeholder={selected ? selected.name : placeholder}
          onChange={(e) => { setQuery(e.target.value); setHighlight(0); setIsOpen(true); }}
          onFocus={() => { setIsOpen(true); setHighlight(0); }}
          onKeyDown={onKeyDown}
          style={inputStyle}
        />
        {isOpen && (
          <div id={listboxId} role="listbox" style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
            maxHeight: '260px', overflowY: 'auto', backgroundColor: COLORS.darkBg,
            border: `1px solid ${COLORS.border}`, borderRadius: '6px'
          }}>
            {matches.length === 0 ? (
              <div style={{padding: '10px', color: COLORS.grayText, fontSize: '14px'}}>No station matches "{query}"</div>
            ) : matches.map((station, idx) => (
              <div
                key={`${station.stationId}:${station.line}`}
                role="option"
                aria-selected={idx === highlight}
                // mousedown fires before the input's blur, so the click is not
                // swallowed by the list closing first.
                onMouseDown={(e) => { e.preventDefault(); commit(station); }}
                onMouseEnter={() => setHighlight(idx)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  gap: '10px', padding: '9px 12px', cursor: 'pointer',
                  backgroundColor: idx === highlight ? COLORS.primary : 'transparent'
                }}
              >
                <span>{station.name}</span>
                <span style={{
                  fontSize: '11px', textTransform: 'capitalize', color: COLORS.darkBg,
                  backgroundColor: LINE_COLORS[station.line] || COLORS.grayText,
                  padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap', fontWeight: '600'
                }}>{station.line}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ===== MAIN APP =====
  export default function App() {
    const [currentPage, setCurrentPage] = useState('Home');
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
    const [user, setUser] = useState(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState('login');
    const [authFormData, setAuthFormData] = useState({ email: '', password: '', username: '', phone: '' });
    const [currentTime, setCurrentTime] = useState(new Date());

    const [fromStation, setFromStation] = useState('');
    const [toStation, setToStation] = useState('');
    const [departureTime, setDepartureTime] = useState('');
    const [journeyDetails, setJourneyDetails] = useState(null);
    const [lineStatus, setLineStatus] = useState('');
    const [selectedLine, setSelectedLine] = useState('purple');
    const [favorites, setFavorites] = useState([]);
    const [crowdData, setCrowdData] = useState({});
    const [allStations, setAllStations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Stats data
    const [avgCrowdByHour, setAvgCrowdByHour] = useState({});
    const [delaysPerDay, setDelaysPerDay] = useState({});

    const [journeyLogged, setJourneyLogged] = useState(false);
    const [loggingJourney, setLoggingJourney] = useState(false);

    const [historyPeriod, setHistoryPeriod] = useState('month');
    const [rideHistory, setRideHistory] = useState([]);
    const [spendStats, setSpendStats] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }, []);

    useEffect(() => {
      const fetchStations = async () => {
        try {
          const stations = await apiCall('/stations');
          setAllStations(stations);
          setLoading(false);
        } catch (error) {
          console.log('Error fetching stations:', error);
          setLoading(false);
        }
      };
      fetchStations();
    }, []);

    useEffect(() => {
      const fetchUser = async () => {
        try {
          if (isLoggedIn) {
            const userData = await apiCall('/auth/me');
            setUser(userData);
            const faves = await apiCall('/favorites');
            setFavorites(faves);
          }
        } catch (error) {
          console.log('Error loading user:', error);
          setIsLoggedIn(false);
          localStorage.removeItem('token');
        }
      };
      fetchUser();
    }, [isLoggedIn]);

    useEffect(() => {
      const updateCrowds = () => {
        const newCrowdData = {};
        allStations.forEach(station => {
          newCrowdData[station.stationId] = calculateCrowdLevel(station.name, station.type);
        });
        setCrowdData(newCrowdData);
      };
      updateCrowds();
      const interval = setInterval(updateCrowds, 10000);
      return () => clearInterval(interval);
    }, [allStations]);

    // Load stats data
    useEffect(() => {
      setAvgCrowdByHour(calculateAverageCrowdByHour());
      setDelaysPerDay(calculateDelaysPerDay());
    }, []);

    // Ride history and spending, refetched whenever the period filter changes.
    useEffect(() => {
      if (!isLoggedIn || currentPage !== 'History') return;

      let cancelled = false;
      const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
          const [journeys, stats] = await Promise.all([
            apiCall(`/journeys?period=${historyPeriod}`),
            apiCall(`/journeys/stats?period=${historyPeriod}`)
          ]);
          // A slower earlier request must not overwrite a newer period's result.
          if (cancelled) return;
          setRideHistory(journeys);
          setSpendStats(stats);
        } catch (error) {
          if (!cancelled) console.log('Error loading history:', error);
        } finally {
          if (!cancelled) setHistoryLoading(false);
        }
      };

      fetchHistory();
      return () => { cancelled = true; };
    }, [isLoggedIn, currentPage, historyPeriod]);

    const handleAuthSubmit = async (e) => {
      e.preventDefault();
      try {
        if (authMode === 'login') {
          const response = await apiCall('/auth/login', 'POST', { email: authFormData.email, password: authFormData.password });
          localStorage.setItem('token', response.token);
          setUser(response.user);
          setIsLoggedIn(true);
          setShowAuthModal(false);
          setAuthFormData({ email: '', password: '', username: '', phone: '' });
        } else {
          await apiCall('/auth/register', 'POST', authFormData);
          const loginResponse = await apiCall('/auth/login', 'POST', { email: authFormData.email, password: authFormData.password });
          localStorage.setItem('token', loginResponse.token);
          setUser(loginResponse.user);
          setIsLoggedIn(true);
          setShowAuthModal(false);
          setAuthFormData({ email: '', password: '', username: '', phone: '' });
        }
      } catch (error) {
        alert('Error: ' + error.message);
      }
    };

    const handleLogout = () => {
      localStorage.removeItem('token');
      setIsLoggedIn(false);
      setUser(null);
      setCurrentPage('Home');
    };

    const isLineOperational = (time, line) => {
      const hour = time.getHours();
      const minutes = time.getMinutes();
      const timeInMinutes = hour * 60 + minutes;
      let openTime, closeTime;
      if (line === 'purple' || line === 'green') {
        openTime = 5 * 60 + 30;
        closeTime = 23 * 60 + 30;
      } else if (line === 'yellow') {
        openTime = 6 * 60 + 30;
        closeTime = 23 * 60 + 30;
      }
      return timeInMinutes >= openTime && timeInMinutes <= closeTime;
    };

    const handlePredict = async () => {
      if (!fromStation || !toStation) {
        alert('Select both stations');
        return;
      }
      const [fromStationId, fromLine] = fromStation.split(':');
      const [toStationId, toLine] = toStation.split(':');
      const fromStationData = allStations.find(s => s.stationId === fromStationId);
      const toStationData = allStations.find(s => s.stationId === toStationId);
      if (!fromStationData || !toStationData) {
        alert('Station not found');
        return;
      }
      let departureDate = new Date();
      if (departureTime) {
        const [hours, minutes] = departureTime.split(':');
        departureDate.setHours(parseInt(hours), parseInt(minutes), 0);
      }
      const fromLineOperational = isLineOperational(departureDate, fromLine);
      const toLineOperational = isLineOperational(departureDate, toLine);
      if (!fromLineOperational || !toLineOperational) {
        const notOperational = [];
        if (!fromLineOperational) notOperational.push(`${fromStationData.name} (${fromLine.charAt(0).toUpperCase() + fromLine.slice(1)} Line)`);
        if (!toLineOperational) notOperational.push(`${toStationData.name} (${toLine.charAt(0).toUpperCase() + toLine.slice(1)} Line)`);
        setLineStatus(`❌ Metro is NOT OPERATIONAL at ${departureDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} for: ${notOperational.join(' & ')}`);
        setJourneyDetails(null);
        return;
      }
      setLineStatus(' Metro is Operational');
      const fromCrowd = calculateCrowdLevel(fromStationData.name, fromStationData.type, departureDate);
      const toCrowd = calculateCrowdLevel(toStationData.name, toStationData.type, departureDate);

      // The backend walks the real network, so this handles interchanges and
      // cross-line trips that station-index arithmetic cannot.
      let plan;
      try {
        plan = await apiCall(`/routes/plan?from=${fromStationId}&to=${toStationId}`);
      } catch (error) {
        setLineStatus(`Could not plan this journey: ${error.message}`);
        setJourneyDetails(null);
        return;
      }

      const details = {
        ...plan,
        fromCrowd,
        toCrowd,
        avgCrowd: Math.round((fromCrowd + toCrowd) / 2),
        departureAt: departureDate,
        departureTime: departureDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      };
      setJourneyDetails(details);
      // Checking a route is not the same as taking it. Recording happens only
      // when the user presses Log Journey, so history and spending reflect
      // trips actually made.
      setJourneyLogged(false);
    };

    const handleLogJourney = async () => {
      if (!isLoggedIn) {
        alert('Please login to log journeys');
        return;
      }
      if (!journeyDetails) return;

      setLoggingJourney(true);
      try {
        await apiCall('/journeys', 'POST', {
          fromStation: journeyDetails.from,
          toStation: journeyDetails.to,
          departureTime: journeyDetails.departureAt,
          crowdLevel: journeyDetails.avgCrowd,
          fare: journeyDetails.fare,
          duration: journeyDetails.totalTimeMin,
          stationCount: journeyDetails.stationCount,
          interchanges: journeyDetails.interchanges.map(i => i.station)
        });
        setJourneyLogged(true);
      } catch (error) {
        alert('Could not log journey: ' + error.message);
      } finally {
        setLoggingJourney(false);
      }
    };

    const handleSaveFavorite = async (label) => {
      if (!isLoggedIn) {
        alert('Please login to save favorites');
        return;
      }
      try {
        const [fromStationId] = fromStation.split(':');
        const [toStationId] = toStation.split(':');
        const fromStationData = allStations.find(s => s.stationId === fromStationId);
        const toStationData = allStations.find(s => s.stationId === toStationId);
        const plan = await apiCall(`/routes/plan?from=${fromStationId}&to=${toStationId}`);
        const response = await apiCall('/favorites', 'POST', {
          fromStation: plan.from,
          toStation: plan.to,
          fromLine: fromStationData.line,
          toLine: toStationData.line,
          distance: plan.stationCount,
          fare: plan.fare,
          label
        });
        setFavorites([...favorites, response.route]);
        alert('Favorite saved!');
      } catch (error) {
        alert('Error: ' + error.message);
      }
    };

    const handleDeleteFavorite = async (routeId) => {
      try {
        await apiCall(`/favorites/${routeId}`, 'DELETE');
        setFavorites(favorites.filter(f => f._id !== routeId));
      } catch (error) {
        alert('Error: ' + error.message);
      }
    };

    const getStationsByLine = (line) => allStations.filter(s => s.line === line);
    const getLineName = (line) => {
      const names = { purple: 'Purple Line', green: 'Green Line', yellow: 'Yellow Line' };
      return names[line] || line;
    };
    const getTopBusiest = () => allStations
      .map(s => ({ name: s.name, line: getLineName(s.line), crowd: crowdData[s.stationId] || 0 }))
      .sort((a, b) => b.crowd - a.crowd)
      .slice(0, 10);

    if (loading) {
      return (
        <div style={{backgroundColor: COLORS.darkBg, color: COLORS.lightText, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <h2>Loading stations...</h2>
        </div>
      );
    }

    return (
      <div style={{backgroundColor: COLORS.darkBg, color: COLORS.lightText, minHeight: '100vh'}}>
        {/* Navbar */}
        <div style={{backgroundColor: COLORS.darkBg, borderBottom: `1px solid ${COLORS.border}`, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{fontSize: '16px', fontWeight: '600'}}>MetroPulse: Bangalore Metro System</div>
          <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
            <div style={{backgroundColor: COLORS.darkBgAlt, padding: '8px 16px', borderRadius: '6px', border: `1px solid ${COLORS.border}`}}>
              <span style={{color: COLORS.accent, fontSize: '13px', fontWeight: '600'}}>
                ⏰ {currentTime.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true})}
              </span>
            </div>
            {isLoggedIn ? (
              <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                <span style={{color: COLORS.grayText, fontSize: '13px'}}>Welcome, {user?.username}</span>
                <button onClick={handleLogout} style={{padding: '8px 16px', backgroundColor: COLORS.danger, color: COLORS.lightText, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'}}>
                  Logout
                </button>
              </div>
            ) : (
              <button onClick={() => {setShowAuthModal(true); setAuthMode('login');}} style={{padding: '8px 16px', backgroundColor: COLORS.primary, color: COLORS.lightText, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'}}>
                Login / Signup
              </button>
            )}
          </div>
        </div>

        
        {showAuthModal && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
            <div style={{backgroundColor: COLORS.darkBgAlt, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '30px', maxWidth: '400px', width: '90%'}}>
              <h2 style={{marginBottom: '20px'}}>{authMode === 'login' ? 'Login' : 'Register'}</h2>
              <form onSubmit={handleAuthSubmit}>
                {authMode === 'register' && (
                  <div style={{marginBottom: '16px'}}>
                    <label style={{display: 'block', marginBottom: '8px', fontSize: '13px'}}>Username</label>
                    <input type="text" value={authFormData.username} onChange={(e) => setAuthFormData({...authFormData, username: e.target.value})} style={{width: '100%', padding: '10px', backgroundColor: COLORS.darkBg, border: `1px solid ${COLORS.border}`, color: COLORS.lightText, borderRadius: '6px', boxSizing: 'border-box'}} required />
                  </div>
                )}
                <div style={{marginBottom: '16px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontSize: '13px'}}>Email</label>
                  <input type="email" value={authFormData.email} onChange={(e) => setAuthFormData({...authFormData, email: e.target.value})} style={{width: '100%', padding: '10px', backgroundColor: COLORS.darkBg, border: `1px solid ${COLORS.border}`, color: COLORS.lightText, borderRadius: '6px', boxSizing: 'border-box'}} required />
                </div>
                <div style={{marginBottom: '16px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontSize: '13px'}}>Password</label>
                  <input type="password" value={authFormData.password} onChange={(e) => setAuthFormData({...authFormData, password: e.target.value})} style={{width: '100%', padding: '10px', backgroundColor: COLORS.darkBg, border: `1px solid ${COLORS.border}`, color: COLORS.lightText, borderRadius: '6px', boxSizing: 'border-box'}} required />
                </div>
                {authMode === 'register' && (
                  <div style={{marginBottom: '16px'}}>
                    <label style={{display: 'block', marginBottom: '8px', fontSize: '13px'}}>Phone (Optional)</label>
                    <input type="tel" value={authFormData.phone} onChange={(e) => setAuthFormData({...authFormData, phone: e.target.value})} style={{width: '100%', padding: '10px', backgroundColor: COLORS.darkBg, border: `1px solid ${COLORS.border}`, color: COLORS.lightText, borderRadius: '6px', boxSizing: 'border-box'}} />
                  </div>
                )}
                <button type="submit" style={{width: '100%', padding: '12px', backgroundColor: COLORS.primary, color: COLORS.lightText, border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', marginBottom: '12px'}}>
                  {authMode === 'login' ? 'Login' : 'Register'}
                </button>
              </form>
              <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} style={{width: '100%', padding: '12px', backgroundColor: 'transparent', color: COLORS.accent, border: `1px solid ${COLORS.accent}`, borderRadius: '6px', cursor: 'pointer', marginBottom: '12px'}}>
                {authMode === 'login' ? 'Create Account' : 'Already have account?'}
              </button>
              <button onClick={() => setShowAuthModal(false)} style={{width: '100%', padding: '12px', backgroundColor: 'transparent', color: COLORS.mutedGray, border: `1px solid ${COLORS.border}`, borderRadius: '6px', cursor: 'pointer'}}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{display: 'flex', gap: '8px', padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.darkBg, overflowX: 'auto'}}>
          {['Home', 'Planner', 'Station Status', 'Favorites', 'History', 'Stats', 'Map'].map(tab => (
            <button key={tab} onClick={() => setCurrentPage(tab)} style={{
              padding: '10px 16px',
              backgroundColor: currentPage === tab ? COLORS.primary : 'transparent',
              border: `1px solid ${COLORS.border}`,
              color: COLORS.lightText,
              cursor: 'pointer',
              borderRadius: '6px',
              fontWeight: '500',
              whiteSpace: 'nowrap'
            }}>{tab}</button>
          ))}
        </div>

        <div style={{maxWidth: '1400px', margin: '0 auto', padding: '24px'}}>
          {currentPage === 'Home' && (
            <div>
              <div style={{backgroundColor: COLORS.darkBgAlt, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '20px', marginBottom: '20px'}}>
                <h2 style={{marginBottom: '20px'}}>Top 10 Busiest Stations</h2>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{borderBottom: `1px solid ${COLORS.border}`}}>
                      <th style={{textAlign: 'left', padding: '12px', color: COLORS.mutedGray}}>Rank</th>
                      <th style={{textAlign: 'left', padding: '12px', color: COLORS.mutedGray}}>Station</th>
                      <th style={{textAlign: 'left', padding: '12px', color: COLORS.mutedGray}}>Line</th>
                      <th style={{textAlign: 'left', padding: '12px', color: COLORS.mutedGray}}>Crowd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTopBusiest().map((station, idx) => (
                      <tr key={idx} style={{borderBottom: `1px solid ${COLORS.border}`}}>
                        <td style={{padding: '12px'}}>{idx + 1}</td>
                        <td style={{padding: '12px'}}>{station.name}</td>
                        <td style={{padding: '12px'}}>{station.line}</td>
                        <td style={{padding: '12px', color: getCrowdStatus(station.crowd).color}}>
                          {getCrowdStatus(station.crowd).status} ({station.crowd}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentPage === 'Planner' && (
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div style={{backgroundColor: COLORS.darkBgAlt, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '20px'}}>
                <h2 style={{marginBottom: '20px'}}>Plan Your Journey</h2>
                <div style={{marginBottom: '16px'}}>
                  <label style={{display: 'block', marginBottom: '8px', color: COLORS.grayText, fontSize: '13px', fontWeight: '600'}}>From Station</label>
                  <StationSearchSelect
                    stations={allStations}
                    value={fromStation}
                    onChange={setFromStation}
                    placeholder="Type to search stations"
                  />
                </div>
                <div style={{marginBottom: '16px'}}>
                  <label style={{display: 'block', marginBottom: '8px', color: COLORS.grayText, fontSize: '13px', fontWeight: '600'}}>To Station</label>
                  <StationSearchSelect
                    stations={allStations}
                    value={toStation}
                    onChange={setToStation}
                    placeholder="Type to search stations"
                  />
                </div>
                <div style={{marginBottom: '16px'}}>
                  <label style={{display: 'block', marginBottom: '8px', color: COLORS.grayText, fontSize: '13px', fontWeight: '600'}}>Departure Time</label>
                  <input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} style={{width: '100%', padding: '10px', backgroundColor: COLORS.darkBg, border: `1px solid ${COLORS.border}`, color: COLORS.lightText, borderRadius: '6px', boxSizing: 'border-box'}} />
                </div>
                <button onClick={handlePredict} style={{width: '100%', padding: '12px', backgroundColor: COLORS.primary, color: COLORS.lightText, border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', marginBottom: '12px'}}>
                  Check Journey
                </button>
                {journeyDetails && (
                  <div>
                    <button
                      onClick={handleLogJourney}
                      disabled={loggingJourney || journeyLogged}
                      style={{
                        width: '100%', padding: '12px', marginBottom: '12px',
                        backgroundColor: journeyLogged ? COLORS.darkGreen : COLORS.success,
                        color: journeyLogged ? COLORS.success : COLORS.lightText,
                        border: 'none', borderRadius: '6px', fontWeight: '600',
                        cursor: (loggingJourney || journeyLogged) ? 'default' : 'pointer'
                      }}
                    >
                      {journeyLogged ? 'Journey logged' : loggingJourney ? 'Logging...' : 'Log Journey'}
                    </button>
                    <div style={{color: COLORS.mutedGray, fontSize: '12px', marginBottom: '12px'}}>
                      Checking a route does not record it. Log it only if you actually travelled.
                    </div>
                    <button onClick={() => handleSaveFavorite(`${journeyDetails.from} to ${journeyDetails.to}`)} style={{width: '100%', padding: '12px', backgroundColor: COLORS.accent, color: COLORS.lightText, border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer'}}>
                      Save as Favorite
                    </button>
                  </div>
                )}
              </div>
              <div style={{backgroundColor: COLORS.darkBgAlt, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '20px'}}>
                <h2 style={{marginBottom: '20px'}}>Journey Details</h2>
                {lineStatus && (
                  <div style={{marginBottom: '16px', padding: '12px', backgroundColor: lineStatus.includes('✅') ? COLORS.darkGreen : COLORS.darkRed, borderRadius: '6px', borderLeft: `4px solid ${lineStatus.includes('✅') ? COLORS.success : COLORS.danger}`, color: lineStatus.includes('✅') ? COLORS.success : COLORS.redAlert}}>
                    {lineStatus}
                  </div>
                )}
                {journeyDetails ? (
                  <div>
                    <div style={{marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${COLORS.border}`}}><span style={{color: COLORS.mutedGray}}>From:</span> {journeyDetails.from}</div>
                    <div style={{marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${COLORS.border}`}}><span style={{color: COLORS.mutedGray}}>To:</span> {journeyDetails.to}</div>
                    <div style={{marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${COLORS.border}`}}><span style={{color: COLORS.mutedGray}}>Time:</span> {journeyDetails.departureTime}</div>
                    <div style={{marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${COLORS.border}`}}><span style={{color: COLORS.mutedGray}}>Stations:</span> {journeyDetails.stationCount}</div>
                    <div style={{marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${COLORS.border}`}}><span style={{color: COLORS.mutedGray}}>Journey time:</span> {journeyDetails.totalTimeMin} min</div>
                    <div style={{marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${COLORS.border}`}}>
                      <span style={{color: COLORS.mutedGray}}>Changes:</span>{' '}
                      {journeyDetails.interchanges.length === 0
                        ? 'Direct, no change needed'
                        : journeyDetails.interchanges.map(i => i.station).join(', ')}
                    </div>
                    <div style={{marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${COLORS.border}`}}><span style={{color: COLORS.mutedGray}}>From Crowd:</span> <span style={{color: getCrowdStatus(journeyDetails.fromCrowd).color}}>{getCrowdStatus(journeyDetails.fromCrowd).status} ({journeyDetails.fromCrowd}%)</span></div>
                    <div style={{marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${COLORS.border}`}}><span style={{color: COLORS.mutedGray}}>To Crowd:</span> <span style={{color: getCrowdStatus(journeyDetails.toCrowd).color}}>{getCrowdStatus(journeyDetails.toCrowd).status} ({journeyDetails.toCrowd}%)</span></div>
                    <div style={{marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${COLORS.border}`}}><span style={{color: COLORS.mutedGray}}>Average Crowd:</span> <span style={{color: getCrowdStatus(journeyDetails.avgCrowd).color}}>{getCrowdStatus(journeyDetails.avgCrowd).status} ({journeyDetails.avgCrowd}%)</span></div>
                    <div style={{marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${COLORS.border}`}}>
                      <div style={{color: COLORS.accent, fontSize: '14px', fontWeight: '600', marginBottom: '12px'}}>Route</div>
                      {journeyDetails.legs.map((leg, idx) => (
                        <div key={idx}>
                          <div style={{display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px'}}>
                            <div style={{width: '4px', alignSelf: 'stretch', minHeight: '38px', backgroundColor: LINE_COLORS[leg.line], borderRadius: '2px', flexShrink: 0}} />
                            <div>
                              <div style={{fontWeight: '600', textTransform: 'capitalize'}}>{leg.line} Line</div>
                              <div style={{color: COLORS.grayText, fontSize: '14px'}}>
                                {leg.boardAt} to {leg.arriveAt}
                              </div>
                              <div style={{color: COLORS.mutedGray, fontSize: '13px'}}>
                                {leg.stationCount} {leg.stationCount === 1 ? 'stop' : 'stops'}, {leg.timeMin} min
                              </div>
                            </div>
                          </div>
                          {journeyDetails.interchanges[idx] && (
                            <div style={{margin: '0 0 10px 14px', padding: '8px 12px', backgroundColor: COLORS.darkBg, borderLeft: `3px solid ${COLORS.warning}`, borderRadius: '4px', fontSize: '13px'}}>
                              Change at <strong>{journeyDetails.interchanges[idx].station}</strong> to the{' '}
                              <span style={{textTransform: 'capitalize'}}>{journeyDetails.interchanges[idx].toLine}</span> Line
                              <span style={{color: COLORS.mutedGray}}> (about {journeyDetails.interchanges[idx].walkMinutes} min)</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${COLORS.border}`}}>
                      <div style={{color: COLORS.accent, fontSize: '14px', fontWeight: '600', marginBottom: '8px'}}>Fare</div>
                      <div style={{fontSize: '24px', fontWeight: 'bold', color: COLORS.accent}}>₹{journeyDetails.fare}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{color: COLORS.grayText}}>Fill form and check to see details</div>
                )}
              </div>
            </div>
          )}

          {currentPage === 'Station Status' && (
            <div>
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', color: COLORS.grayText, fontWeight: '600'}}>Select Line</label>
                <select value={selectedLine} onChange={(e) => setSelectedLine(e.target.value)} style={{width: '100%', maxWidth: '300px', padding: '10px', backgroundColor: COLORS.darkBgAlt, border: `1px solid ${COLORS.border}`, color: COLORS.lightText, borderRadius: '6px', boxSizing: 'border-box'}}>
                  <option value="purple">Purple Line</option>
                  <option value="green">Green Line</option>
                  <option value="yellow">Yellow Line</option>
                </select>
              </div>
              <div style={{backgroundColor: COLORS.darkBgAlt, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '20px'}}>
                <h2 style={{marginBottom: '20px'}}>{getLineName(selectedLine)} - All Stations</h2>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px'}}>
                  {getStationsByLine(selectedLine).map(station => (
                    <div key={station.stationId} style={{backgroundColor: COLORS.darkBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '16px', opacity: station.operational ? 1 : 0.5}}>
                      <div style={{fontWeight: '600', marginBottom: '8px', fontSize: '14px'}}>{station.name}</div>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <div style={{width: '12px', height: '12px', borderRadius: '50%', backgroundColor: station.operational ? getCrowdStatus(crowdData[station.stationId] || 0).color : 'rgb(153, 153, 153)'}}></div>
                          <span style={{color: COLORS.mutedGray, fontSize: '12px'}}>{station.operational ? getCrowdStatus(crowdData[station.stationId] || 0).status : 'Coming Soon'}</span>
                        </div>
                        <div style={{color: COLORS.mutedGray, fontSize: '11px'}}>{station.operational ? `${crowdData[station.stationId] || 0}%` : '--'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentPage === 'History' && (
            <div>
              <div style={{backgroundColor: COLORS.darkBgAlt, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '20px', marginBottom: '20px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px'}}>
                  <h2>Ride History and Spending</h2>
                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                    {[
                      { value: 'week', label: 'Last week' },
                      { value: 'month', label: 'Last month' },
                      { value: '6months', label: 'Last 6 months' },
                      { value: 'year', label: 'Last year' },
                      { value: 'all', label: 'All time' }
                    ].map(option => (
                      <button key={option.value} onClick={() => setHistoryPeriod(option.value)} style={{
                        padding: '8px 14px',
                        backgroundColor: historyPeriod === option.value ? COLORS.primary : 'transparent',
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.lightText,
                        cursor: 'pointer',
                        borderRadius: '6px',
                        fontSize: '14px',
                        whiteSpace: 'nowrap'
                      }}>{option.label}</button>
                    ))}
                  </div>
                </div>

                {!isLoggedIn ? (
                  <div style={{color: COLORS.grayText, textAlign: 'center', padding: '40px'}}>Please login to view your ride history</div>
                ) : historyLoading ? (
                  <div style={{color: COLORS.grayText, textAlign: 'center', padding: '40px'}}>Loading...</div>
                ) : !spendStats || spendStats.totalTrips === 0 ? (
                  <div style={{color: COLORS.grayText, textAlign: 'center', padding: '40px'}}>No trips recorded in this period</div>
                ) : (
                  <div>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px'}}>
                      {[
                        { label: 'Trips', value: spendStats.totalTrips },
                        { label: 'Total spent', value: `₹${spendStats.totalSpent}` },
                        { label: 'Average fare', value: `₹${spendStats.averageFare}` },
                        { label: 'Stations travelled', value: spendStats.totalStations }
                      ].map(stat => (
                        <div key={stat.label} style={{backgroundColor: COLORS.darkBg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '16px'}}>
                          <div style={{color: COLORS.mutedGray, fontSize: '13px', marginBottom: '6px'}}>{stat.label}</div>
                          <div style={{fontSize: '24px', fontWeight: 'bold', color: COLORS.accent}}>{stat.value}</div>
                        </div>
                      ))}
                    </div>

                    {spendStats.monthlySpend.length > 0 && (
                      <div style={{marginBottom: '24px'}}>
                        <h3 style={{marginBottom: '12px', fontSize: '16px'}}>Spend by month</h3>
                        <SimpleBarChart
                          data={Object.fromEntries(spendStats.monthlySpend.map(m => [m.month, m.spent]))}
                          maxValue={Math.max(...spendStats.monthlySpend.map(m => m.spent))}
                        />
                      </div>
                    )}

                    {spendStats.topRoutes.length > 0 && (
                      <div>
                        <h3 style={{marginBottom: '12px', fontSize: '16px'}}>Most travelled routes</h3>
                        {spendStats.topRoutes.map(route => (
                          <div key={route.route} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${COLORS.border}`, gap: '12px'}}>
                            <span>{route.route}</span>
                            <span style={{color: COLORS.mutedGray, whiteSpace: 'nowrap'}}>{route.trips}x, ₹{route.spent}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isLoggedIn && rideHistory.length > 0 && (
                <div style={{backgroundColor: COLORS.darkBgAlt, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '20px', overflowX: 'auto'}}>
                  <h2 style={{marginBottom: '20px'}}>All Trips</h2>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr style={{borderBottom: `1px solid ${COLORS.border}`}}>
                        {['Date', 'From', 'To', 'Stations', 'Changes', 'Fare'].map(heading => (
                          <th key={heading} style={{textAlign: 'left', padding: '12px', color: COLORS.mutedGray, whiteSpace: 'nowrap'}}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rideHistory.map(trip => (
                        <tr key={trip._id} style={{borderBottom: `1px solid ${COLORS.border}`}}>
                          <td style={{padding: '12px', whiteSpace: 'nowrap'}}>{new Date(trip.timestamp).toLocaleDateString('en-IN')}</td>
                          <td style={{padding: '12px'}}>{trip.fromStation}</td>
                          <td style={{padding: '12px'}}>{trip.toStation}</td>
                          <td style={{padding: '12px'}}>{trip.stationCount ?? '--'}</td>
                          <td style={{padding: '12px'}}>{trip.interchanges?.length ? trip.interchanges.join(', ') : 'Direct'}</td>
                          <td style={{padding: '12px', color: COLORS.accent, fontWeight: '600'}}>₹{trip.fare ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {currentPage === 'Favorites' && (
            <div style={{backgroundColor: COLORS.darkBgAlt, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '20px'}}>
              <h2 style={{marginBottom: '20px'}}>Favorite Routes</h2>
              {!isLoggedIn ? (
                <div style={{color: COLORS.grayText, textAlign: 'center', padding: '40px'}}>Please login to view favorites</div>
              ) : favorites.length === 0 ? (
                <div style={{color: COLORS.grayText, textAlign: 'center', padding: '40px'}}>No favorite routes saved yet</div>
              ) : (
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{borderBottom: `1px solid ${COLORS.border}`}}>
                      <th style={{textAlign: 'left', padding: '12px', color: COLORS.mutedGray}}>From</th>
                      <th style={{textAlign: 'left', padding: '12px', color: COLORS.mutedGray}}>To</th>
                      <th style={{textAlign: 'left', padding: '12px', color: COLORS.mutedGray}}>Label</th>
                      <th style={{textAlign: 'left', padding: '12px', color: COLORS.mutedGray}}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {favorites.map((route) => (
                      <tr key={route._id} style={{borderBottom: `1px solid ${COLORS.border}`}}>
                        <td style={{padding: '12px'}}>{route.fromStation}</td>
                        <td style={{padding: '12px'}}>{route.toStation}</td>
                        <td style={{padding: '12px'}}>{route.label}</td>
                        <td style={{padding: '12px'}}>
                          <button onClick={() => handleDeleteFavorite(route._id)} style={{background: 'none', border: 'none', color: COLORS.danger, cursor: 'pointer', fontSize: '16px'}}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {currentPage === 'Stats' && (
            <div>
              <h1 style={{marginBottom: '30px', fontSize: '24px', fontWeight: '600'}}>Statistics & Analytics</h1>
              
              <div style={{backgroundColor: COLORS.darkBgAlt, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '24px', marginBottom: '24px'}}>
                <h2 style={{marginBottom: '20px', fontSize: '18px', fontWeight: '600'}}>Average Crowd by Hour</h2>
                <SimpleBarChart data={avgCrowdByHour} maxValue={100} barColor={COLORS.chartBar} />
              </div>

              <div style={{backgroundColor: COLORS.darkBgAlt, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '24px'}}>
                <h2 style={{marginBottom: '20px', fontSize: '18px', fontWeight: '600'}}>Train Delays per Day (Past Week)</h2>
                <SimpleLineChart data={delaysPerDay} maxValue={20} />
              </div>
            </div>
          )}

          {currentPage === 'Map' && (
            <div style={{backgroundColor: COLORS.darkBgAlt, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '20px'}}>
              <h2 style={{marginBottom: '20px'}}>Bangalore Metro Map</h2>
              <div style={{textAlign: 'center'}}>
                <img src="/map.jpeg" alt="Bangalore Metro Map" style={{maxWidth: '100%', height: 'auto', borderRadius: '8px', border: `2px solid ${COLORS.border}`}} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }