export default function HUD({ player, players }) {
  if (!player) return null;

  const sorted = Object.values(players)
    .filter(p => p.id !== player.id)
    .sort((a, b) => (b.kills || 0) - (a.kills || 0));

  return (
    <div style={styles.container}>
      <div style={styles.myStats}>
        <div style={{ color: player.color, fontWeight: 'bold' }}>{player.name}</div>
        <div>❤ {Math.round(player.hp)}/{player.maxHp}</div>
        <div>Kills: {player.kills || 0}</div>
      </div>
      {sorted.length > 0 && (
        <div style={styles.scoreboard}>
          <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#aaa', fontSize: 12 }}>
            Scoreboard
          </div>
          {sorted.map(p => (
            <div key={p.id} style={styles.scoreRow}>
              <span style={{ color: p.color }}>{p.name}</span>
              <span>{p.kills || 0}K / {p.deaths || 0}D</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 13,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  myStats: {
    background: 'rgba(0,0,0,0.7)',
    padding: '10px 14px',
    borderRadius: 8,
    lineHeight: 1.6,
  },
  scoreboard: {
    background: 'rgba(0,0,0,0.7)',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 12,
  },
  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    lineHeight: 1.8,
  },
};
