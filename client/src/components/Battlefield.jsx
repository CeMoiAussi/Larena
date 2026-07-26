import { useEffect, useRef, useState } from 'react';
import GameEngine from '../game/GameEngine.js';
import HUD from './HUD.jsx';

export default function Battlefield({ network }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [myPlayer, setMyPlayer] = useState(null);
  const [players, setPlayers] = useState({});

  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    engine.onClick = (x, y) => {
      network.sendInput(x, y);
      engine.setLocalTarget(x, y);
    };

    network.onJoined = ({ playerId, state }) => {
      engine.setMyId(playerId);
      engine.setState(state);
      setMyPlayer(state[playerId]);
      setPlayers({ ...state });
    };

    network.onState = (newPlayers, projectiles) => {
      engine.setState(newPlayers, projectiles);
      setPlayers({ ...newPlayers });
      if (network.playerId && newPlayers[network.playerId]) {
        setMyPlayer({ ...newPlayers[network.playerId], id: network.playerId });
      }
    };

    network.onPlayerJoined = () => {};
    network.onPlayerLeft = () => {};

    engine.start();

    return () => {
      engine.stop();
    };
  }, [network]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.canvasWrap}>
        <canvas ref={canvasRef} style={styles.canvas} />
        <HUD player={myPlayer} players={players} />
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#0f0f23',
  },
  canvasWrap: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  canvas: {
    display: 'block',
    cursor: 'crosshair',
    maxWidth: '100vw',
    maxHeight: '100vh',
  },
};
