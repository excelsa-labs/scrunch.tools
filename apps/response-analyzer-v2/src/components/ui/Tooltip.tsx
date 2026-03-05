import { Info } from 'lucide-react';

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
  /** Show an info icon instead of wrapping children */
  iconOnly?: boolean;
}

export function Tooltip({ text, children, iconOnly }: TooltipProps) {
  if (iconOnly) {
    return (
      <span className="relative group inline-flex items-center">
        <Info className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 cursor-help" />
        <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-normal text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none max-w-xs text-center">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900" />
        </span>
      </span>
    );
  }

  return (
    <span className="relative group inline-flex items-center gap-1">
      {children}
      <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-normal text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none max-w-xs text-center">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}
