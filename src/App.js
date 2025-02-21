import React, { useState, useEffect } from "react";
import './index.css';

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
  const [rotations, setRotations] = useState({ firstHalf: [], secondHalf: [] });
  const [playtimeSummary, setPlaytimeSummary] = useState({});
  const maxOnCourt = 5;
  const halfTime = 20;

  useEffect(() => {
    localStorage.setItem('players', JSON.stringify(players));
    localStorage.setItem('checkedPlayers', JSON.stringify(checkedPlayers));
  }, [players, checkedPlayers]);

  const addPlayer = () => {
    if (newPlayer && !players.includes(newPlayer) && players.length < 10) {
      setPlayers([...players, newPlayer]);
      setCheckedPlayers({ ...checkedPlayers, [newPlayer]: true });
      setNewPlayer("");
    }
  };

  const removePlayer = (player) => {
    setPlayers(players.filter(p => p !== player));
    const { [player]: _, ...rest } = checkedPlayers;
    setCheckedPlayers(rest);
  };

  const togglePlayerCheck = (player) => {
    setCheckedPlayers({ ...checkedPlayers, [player]: !checkedPlayers[player] });
  };

  const shufflePlayers = () => {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    setPlayers(shuffled);
  };

  const generateSubstitutions = () => {
    const activePlayers = players.filter(player => checkedPlayers[player]);
    if (activePlayers.length < 5) {
      alert("You need at least 5 players to generate a fair substitution plan.");
      return;
    }

    const totalPlayers = activePlayers.length;
    const playersActive = maxOnCourt; // Number of players on the court
    const totalGameTime = 2 * halfTime; // Total game time for both halves
    const targetMinutes = (totalGameTime * playersActive) / totalPlayers;
    let rotationDuration = Math.round(targetMinutes / playersActive); // Round to nearest whole minute
    const rotationsCount = Math.ceil(totalGameTime / rotationDuration);
    rotationDuration = Math.round(totalGameTime / rotationsCount); // Ensure even minute intervals

    let currentIndex = 0;
    const playtimeTracker = new Array(totalPlayers).fill(0);
    let newRotations = { firstHalf: [], secondHalf: [] };

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

    const formatTime = (minutes) => {
      const wholeMinutes = Math.floor(minutes);
      return `${wholeMinutes}:00`;
    };

    // First Half
    for (let i = 0; i < rotationsCount / 2; i++) {
      const startTime = halfTime - i * rotationDuration; // Count down from 20
      const endTime = halfTime - (i + 1) * rotationDuration; // Count down to 0
      const { onField, bench } = rotatePlayers(endTime, startTime); // Swap startTime and endTime
      newRotations.firstHalf.push({ time: `${formatTime(startTime)}`, court: onField, bench });
    }

    // Second Half
    for (let i = 0; i < rotationsCount / 2; i++) {
      const startTime = totalGameTime - i * rotationDuration; // Count down from 40
      const endTime = totalGameTime - (i + 1) * rotationDuration; // Count down to 20
      const { onField, bench } = rotatePlayers(endTime, startTime); // Swap startTime and endTime
      newRotations.secondHalf.push({ time: `${formatTime(startTime - halfTime)}`, court: onField, bench });
    }

    setRotations(newRotations);

    // Create playtime summary with player names
    const playtimeSummary = activePlayers.map((player, index) => ({
      name: player,
      minutes: Math.max(0, playtimeTracker[index]).toFixed(1) // Ensure positive playtime
    }));

    setPlaytimeSummary(playtimeSummary);

    // Calculate total and average playtime
    const totalPlaytime = playtimeTracker.reduce((acc, minutes) => acc + minutes, 0);
    const averagePlaytime = totalPlaytime / activePlayers.length;
    console.log(`Total Playtime: ${totalPlaytime} minutes`);
    console.log(`Average Playtime per Player: ${averagePlaytime.toFixed(1)} minutes`);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h1 className="text-xl font-bold text-center">Basketball Substitution Planner</h1>
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
      
      <div className="flex space-x-2">
        <button onClick={generateSubstitutions} className="bg-green-500 text-white p-2 rounded flex-1">Generate Substitutions</button>
        <button onClick={shufflePlayers} className="bg-yellow-500 text-white p-2 rounded flex-1">Randomize List Order</button>
      </div>
      
      {rotations.firstHalf.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mt-4">First Half</h2>
          <table className="w-full border-collapse border border-gray-300 mt-2">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 p-2">Time Clock</th>
                <th className="border border-gray-300 p-2">On Court</th>
                <th className="border border-gray-300 p-2">Bench</th>
              </tr>
            </thead>
            <tbody>
              {rotations.firstHalf.map((r, index) => (
                <tr key={index} className="text-center">
                  <td className="border border-gray-300 p-2">{r.time}</td>
                  <td className="border border-gray-300 p-2">{r.court.join(", ")}</td>
                  <td className="border border-gray-300 p-2 font-bold text-red-600">{r.bench.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <h2 className="text-lg font-bold mt-4">Second Half</h2>
          <table className="w-full border-collapse border border-gray-300 mt-2">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 p-2">Time Clock</th>
                <th className="border border-gray-300 p-2">On Court</th>
                <th className="border border-gray-300 p-2">Bench</th>
              </tr>
            </thead>
            <tbody>
              {rotations.secondHalf.map((r, index) => (
                <tr key={index} className="text-center">
                  <td className="border border-gray-300 p-2">{r.time}</td>
                  <td className="border border-gray-300 p-2">{r.court.join(", ")}</td>
                  <td className="border border-gray-300 p-2 font-bold text-red-600">{r.bench.join(", ")}</td>
                </tr>
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
      )}
    </div>
  );
};

export default SubstitutionApp;
