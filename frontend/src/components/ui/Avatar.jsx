import './Avatar.scss';

const palette = {
  red: { bg: 'var(--red-light)', color: 'var(--red-text)' },
  orange: { bg: 'var(--orange-light)', color: 'var(--orange-text)' },
  green: { bg: 'var(--green-light)', color: 'var(--green-text)' },
  blue: { bg: 'var(--blue-light)', color: 'var(--blue-text)' },
};

export function Avatar({ initials, tone = 'blue', size = 28 }) {
  const c = palette[tone] || palette.blue;
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size <= 28 ? 11 : 14,
        background: c.bg,
        color: c.color,
      }}
    >
      {initials}
    </div>
  );
}
