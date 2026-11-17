import { Badge, PenLine, MessagesSquare, Star, Newspaper, Gamepad2, Images, Play, PackageOpen, Plus, Tags, Radar } from 'lucide-react';
import styles from './GameTabEmptyState.module.css';

const states = {
  review: { icon: Badge, detail: PenLine, title: 'Our verdict is still unwritten.', description: 'No TheCoreGamer review published yet.' },
  community: { icon: MessagesSquare, detail: Star, title: 'Every game starts a conversation.', description: 'No community ratings yet.' },
  articles: { icon: Newspaper, detail: Gamepad2, title: 'No stories on the board.', description: 'News, guides, and features for this game will appear here.' },
  artwork: { icon: Images, detail: Play, title: 'Nothing in the gallery yet.', description: 'No official artwork available for this game yet.' },
  screenshots: { icon: Images, detail: Gamepad2, title: 'No moments captured yet.', description: 'Community screenshots will appear here.' },
  dlc: { icon: PackageOpen, detail: Plus, title: 'No extras on the shelf.', description: 'No DLC or additional editions listed yet.' },
  prices: { icon: Tags, detail: Gamepad2, title: 'No offers on the radar.', description: 'Pricing isn’t available for this game yet.' },
  similar: { icon: Radar, detail: Gamepad2, title: 'No matches on the radar.', description: 'Similar-game recommendations aren’t available yet.' },
};

export default function GameTabEmptyState({ variant, compact = false, description }: {
  variant: keyof typeof states;
  compact?: boolean;
  description?: string;
}) {
  const { icon: Icon, detail: Detail, title, description: defaultDescription } = states[variant];
  return (
    <div className={`${styles.panel} ${compact ? styles.compact : ''}`}>
      <div className={styles.symbol} aria-hidden="true">
        <div className={styles.halo} />
        <Icon className={styles.mainIcon} strokeWidth={1.4} />
        <span className={styles.detail}><Detail size={23} strokeWidth={1.7} /></span>
        <span className={styles.pixel} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description ?? defaultDescription}</p>
    </div>
  );
}
