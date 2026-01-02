import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/constants';
import { Plus, Trash2 } from 'lucide-react';
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
        'relative w-full p-6 rounded-lg border-2 transition-all duration-200',
        isSelected
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-card'
      )}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2">{name}</h3>
          <p className={cn(
            'text-sm mb-4',
            isSelected ? 'text-background/70' : 'text-muted-foreground'
          )}>
            {description}
          </p>
          <p className="text-2xl font-bold">{formatPrice(price)}</p>
        </div>

        <div className="flex items-center gap-2">
          {isSelected ? (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={onRemove}
                className="h-10 w-10 border-background/30 bg-transparent hover:bg-background/10"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={onAdd}
                className="h-10 w-10 border-background/30 bg-transparent hover:bg-background/10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="icon"
              onClick={onAdd}
              className="h-10 w-10"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
