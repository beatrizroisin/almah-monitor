import './Tag.scss';

export function Tag({ children, color = 'gray' }) {
  // color: red | orange | green | blue | gray
  return <span className={`tag tag--${color}`}>{children}</span>;
}
