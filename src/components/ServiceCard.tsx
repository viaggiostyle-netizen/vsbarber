import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/constants';
import { Check } from 'lucide-react';

interface ServiceCardProps {
  name: string;
  description: string;
  price: number;
  selected: boolean;
  onSelect: () => void;
}

export function ServiceCard({ name, description, price, selected, onSelect }: ServiceCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative w-full p-6 rounded-lg border-2 text-left transition-all duration-200',
        'hover:border-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        selected
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-card'
      )}
    >
      {selected && (
        <div className="absolute top-4 right-4">
          <Check className="h-5 w-5" />
        </div>
      )}
      
      <h3 className="text-xl font-semibold mb-2">{name}</h3>
      <p className={cn(
        'text-sm mb-4',
        selected ? 'text-background/70' : 'text-muted-foreground'
      )}>
        {description}
      </p>
      <p className="text-2xl font-bold">{formatPrice(price)}</p>
    </button>
  );
}
