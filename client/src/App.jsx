import { useState, useRef } from 'react';
import CharacterSelect from './components/CharacterSelect.jsx';
import Battlefield from './components/Battlefield.jsx';
import NetworkManager from './game/NetworkManager.js';

export default function App() {
  const [inGame, setInGame] = useState(false);
  const networkRef = useRef(null);

  const handleJoin = async (name, classType, roomId) => {
    const net = new NetworkManager();
    networkRef.current = net;
    await net.connect(name, classType, roomId);
    setInGame(true);
  };

  if (inGame) {
    return <Battlefield network={networkRef.current} />;
  }

  return <CharacterSelect onJoin={handleJoin} />;
}
