import { getIcon } from '../lib/icons';

interface Props {
  icon: string;
  color: string;
  size?: number;
  bgSize?: number;
}

export default function CategoryIcon({ icon, color, size = 16, bgSize = 36 }: Props) {
  const Icon = getIcon(icon);
  return (
    <div
      style={{
        width: bgSize,
        height: bgSize,
        borderRadius: '50%',
        background: `${color}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={size} style={{ color }} />
    </div>
  );
}
