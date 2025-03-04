import React, { useState, useEffect } from "react";
import './index.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import ReactGA from 'react-ga4'; // Import Google Analytics

// Initialize Google Analytics
// Replace G-XXXXXXXXXX with your actual Google Analytics measurement ID
ReactGA.initialize('G-3386T4N45T');

export const plugins = {
  tailwindcss: {},
  autoprefixer: {},
};


const SubstitutionApp = () => {
  const [players, setPlayers] = useState(() => {
    const storedPlayers = localStorage.getItem('players');
    return storedPlayers ? JSON.parse(storedPlayers) : ["Player 1"];
  });
  const [checkedPlayers, setCheckedPlayers] = useState(() => {
    const storedChecked = localStorage.getItem('checkedPlayers');
    return storedChecked ? JSON.parse(storedChecked) : players.reduce((acc, player) => ({ ...acc, [player]: true }), {});
  });
  const [newPlayer, setNewPlayer] = useState("");
  const [rotations, setRotations] = useState([]);
  const [playtimeSummary, setPlaytimeSummary] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const maxOnCourt = 5;
  //  const halfTime = 20;
  const totalGameTime = 40; // Define totalGameTime here
  const [hasGenerated, setHasGenerated] = useState(false);

  const totalSelectedPlayers = Object.values(checkedPlayers).filter(Boolean).length;

  useEffect(() => {
    localStorage.setItem('players', JSON.stringify(players));
    localStorage.setItem('checkedPlayers', JSON.stringify(checkedPlayers));
  }, [players, checkedPlayers]);

  // Track page view when component mounts
  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: window.location.pathname });
  }, []);

  // Track events function
  const trackEvent = (category, action, label) => {
    ReactGA.event({
      category,
      action,
      label
    });
  };

  const formatTime = (minutes) => {
    const wholeMinutes = Math.floor(minutes);
    const seconds = Math.round((minutes - wholeMinutes) * 60);
    return `${wholeMinutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatPlaytime = (minutes) => {
    const wholeMinutes = Math.floor(minutes);
    const seconds = Math.round((minutes - wholeMinutes) * 60);
    return `${wholeMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const addPlayer = () => {
    if (newPlayer && !players.includes(newPlayer) && players.length < 10) {
      trackEvent('User Action', 'Add Player', newPlayer);
      setPlayers([...players, newPlayer]);
      setCheckedPlayers({ ...checkedPlayers, [newPlayer]: true });
      setNewPlayer("");
    }
  };

  const removePlayer = (player) => {
    trackEvent('User Action', 'Remove Player', player);
    setPlayers(players.filter(p => p !== player));
    const { [player]: _, ...rest } = checkedPlayers;
    setCheckedPlayers(rest);
  };

  const togglePlayerCheck = (player) => {
    trackEvent('User Action', 'Toggle Player', `${player}: ${!checkedPlayers[player]}`);
    setCheckedPlayers({ ...checkedPlayers, [player]: !checkedPlayers[player] });
  };

  const shufflePlayers = () => {
    if (window.confirm('Are you sure you want to shuffle the players and regenerate substitutions?')) {
      trackEvent('User Action', 'Shuffle Players', `Player Count: ${totalSelectedPlayers}`);
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      setPlayers(shuffled);    
      generateSubstitutions();
    }
  };


  

  const generateSubstitutions = () => {
    trackEvent('User Action', 'Generate Substitutions', `Player Count: ${totalSelectedPlayers}`);
    
    const activePlayers = players.filter(player => checkedPlayers[player]);
    if (activePlayers.length < 5) {
      setRotations([]);
      setPlaytimeSummary([]);
      setIsExpanded(true);
      setMessage("You need at least 5 players to generate a fair substitution plan.");
      return;
    }

    if (activePlayers.length === 5) {
      setRotations([]);
      setPlaytimeSummary([]);
      setIsExpanded(true);
      setMessage("No subs required");
      return;
    }

    setMessage("");

    const totalPlayers = activePlayers.length;
    const playersActive = maxOnCourt; // Number of players on the court
    const targetMinutes = (totalGameTime * playersActive) / totalPlayers;
    const rotationDuration = targetMinutes / playersActive; // Use floating-point for more precision
    const rotationsCount = Math.ceil(totalGameTime / rotationDuration);

    let currentIndex = 0;
    const playtimeTracker = new Array(totalPlayers).fill(0);
    let newRotations = [];

    const rotatePlayers = (startTime, endTime) => {
      const onField = [];
      for (let j = 0; j < playersActive; j++) {
        const playerIndex = (currentIndex + j) % totalPlayers;
        onField.push(activePlayers[playerIndex]);
        playtimeTracker[playerIndex] += (endTime - startTime);
      }
      const bench = activePlayers.filter(player => !onField.includes(player));
      currentIndex = (currentIndex + playersActive) % totalPlayers;
      return { onField, bench };
    };

    for (let i = 0; i < rotationsCount; i++) {
      const startTime = i * rotationDuration;
      const endTime = (i + 1) * rotationDuration;
      const { onField, bench } = rotatePlayers(startTime, endTime);

      const periodClockTime = endTime <= 20 ? 20 - endTime : 40 - endTime;
      const periodClock = i === rotationsCount - 1 ? "" : formatTime(periodClockTime);

      newRotations.push({
        time: `${formatTime(totalGameTime - startTime)} - ${formatTime(totalGameTime - endTime)}`,
        periodClock,
        court: onField,
        bench
      });
    }

    setRotations(newRotations);

    const playtimeSummary = activePlayers.map((player, index) => ({
      name: player,
      minutes: formatPlaytime(playtimeTracker[index])
    }));

    setPlaytimeSummary(playtimeSummary);
    setIsExpanded(true);

    const totalPlaytime = playtimeTracker.reduce((acc, minutes) => acc + minutes, 0);
    const averagePlaytime = totalPlaytime / activePlayers.length;
    console.log(`Total Playtime: ${totalPlaytime} minutes`);
    console.log(`Average Playtime per Player: ${averagePlaytime.toFixed(1)} minutes`);

    // Scroll to the top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setHasGenerated(true);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white/90 rounded-xl shadow-md space-y-4 min-h-screen">
      <h1 className="text-xl font-bold text-center flex items-center justify-center">
        <i className="fas fa-basketball-ball text-orange-500 mr-2"></i> {/* Basketball icon */}
        Basketball Substitution Planner
      </h1>
      
   

      <div className={`transition-max-height duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[2000px]' : 'max-h-0'}`}>
        {rotations.length > 0 ? (
          <div>
            <h2 className="text-lg font-bold mt-4">Substitutions</h2>
            <table className="w-full border-collapse border border-gray-300 mt-2">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 p-2">Period Clock</th>
                  <th className="border border-gray-300 p-2">On Court</th>
                  <th className="border border-gray-300 p-2">Bench</th>
                </tr>
              </thead>
              <tbody>
                {rotations.map((r, index) => (
                  <>
                    {index === Math.floor(rotations.length / 2) && index > 0 && rotations[index - 1].periodClock === "0:00" && (
                      <tr className="bg-gray-200">
                        <td colSpan="3" className="border border-gray-300 p-2 text-center font-bold">
                          Half Time
                        </td>
                      </tr>
                    )}
                    <tr key={index} className="text-center">
                      <td className="border border-gray-300 p-2">
                        {index === 0 ? "Starting Lineup" : rotations[index - 1].periodClock !== "0:00" ? rotations[index - 1].periodClock : "Starting Lineup"}
                      </td>
                      <td className="border border-gray-300 p-2 text-left">
                        <ul className="list-disc pl-4">
                          {r.court.sort().map((player, i) => (
                            <li key={i}>{player}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="border border-gray-300 p-2 font-bold text-red-600 text-left">
                        <ul className="list-disc pl-4">
                          {r.bench.sort().map((player, i) => (
                            <li key={i}>{player}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                    {index === Math.floor(rotations.length / 2) && index > 0 && rotations[index - 1].periodClock !== "0:00" && (
                      <tr className="bg-gray-200">
                        <td colSpan="3" className="border border-gray-300 p-2 text-center font-bold">
                          {rotations[index].periodClock !== "0:00" ? <span>Half Time - <span className="text-yellow-600">No Subs</span></span> : "Half Time"}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            <h2 className="text-lg font-bold mt-4">Playtime Summary</h2>
            <table className="w-full border-collapse border border-gray-300 mt-2">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 p-2">Player Name</th>
                  <th className="border border-gray-300 p-2">Minutes Played</th>
                </tr>
              </thead>
              <tbody>
                {playtimeSummary
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((summary, index) => (
                    <tr key={index} className="text-center">
                      <td className="border border-gray-300 p-2">{summary.name}</td>
                      <td className="border border-gray-300 p-2">{summary.minutes}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative text-center" role="alert">
      
            {message && (
              <span>
          {message}
          </span>
      )}
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        {!hasGenerated ? (
          <button onClick={generateSubstitutions} className="bg-green-500 text-white p-2 rounded flex-1">
            <i className="fas fa-play mr-1"></i> Generate Substitutions
          </button>
        ) : (
          <button onClick={shufflePlayers} className="bg-green-500 text-white p-2 rounded flex-1">
            <i className="fas fa-sync-alt mr-1"></i> Randomise & Regenerate
          </button>
        )}
      </div>
      <div className="text-center font-bold">
        Active Players: {totalSelectedPlayers}
      </div>
      <ul className="mb-4">
        {players.map(player => (
          <li key={player} className="flex justify-between border-b p-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={checkedPlayers[player]}
                onChange={() => togglePlayerCheck(player)}
                className="mr-2"
              />
              <span>{player}</span>
            </div>
            <button onClick={() => removePlayer(player)} className="text-red-500">Remove</button>
          </li>
        ))}
      </ul>
      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          value={newPlayer}
          onChange={(e) => setNewPlayer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              addPlayer();
            }
          }}
          className="border p-2 w-full"
          placeholder="Enter player name"
        />
        <button onClick={addPlayer} className="bg-blue-500 text-white p-2 rounded">Add</button>
      </div>
<hr />
      <div className="text-right">
        <a 
          href="https://github.com/tallday/Basketball-Sub-Planner/issues/new" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          <i className="fas fa-comment-alt mr-1"></i> Provide Feedback
        </a>
      </div>
    </div>
  );
};

export default SubstitutionApp;
