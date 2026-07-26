import { useState } from 'react';

const CLASSES = [
  { id: 'warrior', label: 'Warrior', hp: 150, speed: 2, damage: 20, range: 'Melee', color: '#e74c3c', icon: '⚔' },
  { id: 'archer',  label: 'Archer',  hp: 100, speed: 3, damage: 15, range: 'Ranged', color: '#2ecc71', icon: '🏹' },
  { id: 'mage',    label: 'Mage',    hp: 80,  speed: 2.5, damage: 25, range: 'Ranged', color: '#3498db', icon: '✦' },
];

export default function CharacterSelect({ onJoin }) {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [selected, setSelected] = useState('warrior');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onJoin(name.trim(), selected, roomId.trim() || 'default');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Battle Arena</h1>
        <p style={styles.subtitle}>Choose your champion</p>

        <form onSubmit={handleSubmit}>
          <input
            style={styles.input}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            style={styles.input}
            placeholder="Room code (optional)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />

          <div style={styles.classes}>
            {CLASSES.map((c) => (
              <div
                key={c.id}
                style={{
                  ...styles.classCard,
                  borderColor: selected === c.id ? c.color : '#444',
                  background: selected === c.id ? c.color + '22' : '#1a1a2e',
                }}
                onClick={() => setSelected(c.id)}
              >
                <div style={{ fontSize: 32 }}>{c.icon}</div>
                <div style={{ fontWeight: 'bold', color: c.color }}>{c.label}</div>
                <div style={styles.stats}>
                  <div>❤ {c.hp}</div>
                  <div>⚡ {c.speed}</div>
                  <div>💥 {c.damage}</div>
                </div>
              </div>
            ))}
          </div>

          <button style={styles.button} type="submit">
            Join Battle
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#0f0f23',
    fontFamily: 'sans-serif',
  },
  card: {
    background: '#16213e',
    padding: '40px',
    borderRadius: 16,
    maxWidth: 500,
    width: '90%',
    textAlign: 'center',
  },
  title: {
    color: '#fff',
    margin: 0,
    fontSize: 32,
  },
  subtitle: {
    color: '#aaa',
    marginTop: 4,
    marginBottom: 24,
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    marginBottom: 12,
    borderRadius: 8,
    border: '1px solid #444',
    background: '#1a1a2e',
    color: '#fff',
    fontSize: 16,
    boxSizing: 'border-box',
  },
  classes: {
    display: 'flex',
    gap: 12,
    margin: '20px 0',
  },
  classCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    border: '2px solid #444',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
    color: '#fff',
  },
  stats: {
    fontSize: 11,
    marginTop: 8,
    color: '#aaa',
    lineHeight: 1.6,
  },
  button: {
    width: '100%',
    padding: '14px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: 8,
  },
};
