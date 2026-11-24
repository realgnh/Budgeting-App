import {
  Baby, Bike, BookOpen, Briefcase, Bus, Car, CircleEllipsis, Clapperboard, Coffee, Dumbbell, Fuel, Gamepad2, Gift, GraduationCap,
  HandCoins, HeartPulse, House, Landmark, Laptop, type LucideIcon, Music, PawPrint, Phone, PiggyBank, Plane, Receipt, Repeat,
  Shirt, ShoppingBag, ShoppingBasket, Smartphone, Sparkles, TrendingUp, Utensils, Wallet, Wifi, Wrench, Zap,
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils, coffee: Coffee, 'shopping-basket': ShoppingBasket, car: Car, bus: Bus, fuel: Fuel, bike: Bike, plane: Plane,
  house: House, zap: Zap, wifi: Wifi, phone: Phone, repeat: Repeat, 'shopping-bag': ShoppingBag, shirt: Shirt, 'heart-pulse': HeartPulse,
  dumbbell: Dumbbell, clapperboard: Clapperboard, 'gamepad-2': Gamepad2, music: Music, 'book-open': BookOpen, 'graduation-cap': GraduationCap,
  baby: Baby, 'paw-print': PawPrint, wrench: Wrench, smartphone: Smartphone, sparkles: Sparkles, receipt: Receipt,
  briefcase: Briefcase, laptop: Laptop, gift: Gift, 'trending-up': TrendingUp, landmark: Landmark, 'piggy-bank': PiggyBank,
  'hand-coins': HandCoins, wallet: Wallet, 'circle-ellipsis': CircleEllipsis,
};

export function CategoryIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Icon = CATEGORY_ICONS[name] ?? CircleEllipsis;
  return <Icon size={size} className={className} strokeWidth={1.9} />;
}

export function CategoryBadge({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface py-0.5 pl-1.5 pr-2 text-[12px] font-medium">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />{name}
    </span>
  );
}
