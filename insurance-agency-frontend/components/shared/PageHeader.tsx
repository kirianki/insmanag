// src/components/shared/PageHeader.tsx

import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

// 1. Add the 'subtitle' prop to the interface. Make it optional with '?'.
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  actionButtonText?: string;
  onActionButtonClick?: () => void;
  action?: React.ReactNode;
}

// 2. Destructure 'subtitle' and 'description' from the props.
export function PageHeader({ title, subtitle, description, actionButtonText, onActionButtonClick, action }: PageHeaderProps) {
  const sub = subtitle || description;
  return (
    <div className="flex items-start justify-between mb-6"> {/* Use items-start to align content to the top */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {/* 3. Conditionally render the subtitle/description if it exists */}
        {sub && (
          <p className="text-sm text-muted-foreground mt-1">{sub}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {action}
        {actionButtonText && onActionButtonClick && (
          <Button onClick={onActionButtonClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {actionButtonText}
          </Button>
        )}
      </div>
    </div>
  );
}