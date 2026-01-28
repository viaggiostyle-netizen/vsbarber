import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/constants';
import { Plus, Minus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServiceCardProps {
  name: string;
  description: string;
  price: number;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

export function ServiceCard({ name, description, price, quantity, onAdd, onRemove }: ServiceCardProps) {
  const isSelected = quantity > 0;

  return (
    <div
      className={cn(
        'relative w-full rounded-xl transition-all duration-300 overflow-hidden',
        isSelected
          ? 'bg-foreground text-background ring-2 ring-foreground'
          : 'bg-card border border-border hover:border-foreground/30'
      )}
    >
      <div className="p-5">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {isSelected && (
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-background text-foreground">
                  <Check className="w-3 h-3" />
                </div>
              )}
              <h3 className="text-xl font-bold truncate">{name}</h3>
            </div>
            <p className={cn(
              'text-sm mb-4 line-clamp-2',
              isSelected ? 'text-background/70' : 'text-muted-foreground'
            )}>
              {description}
            </p>
            <p className="text-2xl font-bold">{formatPrice(price)}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSelected ? (
              <div className="flex items-center gap-1 bg-background/20 rounded-full p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRemove}
                  className="h-8 w-8 rounded-full bg-background/20 hover:bg-background/30 text-background"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onAdd}
                  className="h-8 w-8 rounded-full bg-background/20 hover:bg-background/30 text-background"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="icon"
                onClick={onAdd}
                className="h-12 w-12 rounded-full border-2 hover:bg-foreground hover:text-background hover:border-foreground transition-all"
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
