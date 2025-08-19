import React from 'react';
import { cn } from '@/lib/utils';

// Responsive Grid System
interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: {
    sm?: 1 | 2 | 3 | 4 | 6;
    md?: 1 | 2 | 3 | 4 | 6;
    lg?: 1 | 2 | 3 | 4 | 5 | 6;
    xl?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  };
}

export function Grid({ 
  cols = 1, 
  gap = 'md', 
  responsive,
  className, 
  children, 
  ...props 
}: GridProps) {
  const getGridCols = (breakpoint: string, columns: number) => {
    const colMap: Record<number, string> = {
      1: 'grid-cols-1',
      2: 'grid-cols-2', 
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      12: 'grid-cols-12'
    };
    
    if (breakpoint === 'base') return colMap[columns];
    return `${breakpoint}:${colMap[columns]}`;
  };

  const getGapClass = () => {
    const gapMap = {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4', 
      lg: 'gap-6',
      xl: 'gap-8'
    };
    return gapMap[gap];
  };

  const gridClasses = cn(
    'grid',
    getGridCols('base', cols),
    responsive?.sm && getGridCols('sm', responsive.sm),
    responsive?.md && getGridCols('md', responsive.md), 
    responsive?.lg && getGridCols('lg', responsive.lg),
    responsive?.xl && getGridCols('xl', responsive.xl),
    getGapClass(),
    className
  );

  return (
    <div className={gridClasses} {...props}>
      {children}
    </div>
  );
}

// Container System
interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Container({ 
  size = 'xl', 
  padding = 'md', 
  className, 
  children, 
  ...props 
}: ContainerProps) {
  const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl', 
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full'
  };

  const paddingClasses = {
    none: '',
    sm: 'px-4',
    md: 'px-6', 
    lg: 'px-8'
  };

  return (
    <div 
      className={cn(
        'mx-auto w-full',
        sizeClasses[size],
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Flexbox Utilities
interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export function Flex({ 
  direction = 'row',
  align = 'center',
  justify = 'start',
  wrap = false,
  gap = 'md',
  className,
  children,
  ...props 
}: FlexProps) {
  const directionClasses = {
    row: 'flex-row',
    col: 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'col-reverse': 'flex-col-reverse'
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center', 
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline'
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end', 
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  };

  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6', 
    xl: 'gap-8'
  };

  return (
    <div 
      className={cn(
        'flex',
        directionClasses[direction],
        alignClasses[align],
        justifyClasses[justify],
        wrap && 'flex-wrap',
        gapClasses[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Stack component for consistent spacing
interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  space?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
}

export function Stack({ 
  space = 'md', 
  align = 'stretch',
  className, 
  children, 
  ...props 
}: StackProps) {
  const spaceClasses = {
    none: 'space-y-0',
    xs: 'space-y-1',
    sm: 'space-y-2', 
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8',
    '2xl': 'space-y-12'
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end', 
    stretch: 'items-stretch'
  };

  return (
    <div 
      className={cn(
        'flex flex-col',
        spaceClasses[space],
        alignClasses[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Section wrapper with consistent spacing
interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  background?: 'none' | 'muted' | 'card';
}

export function Section({ 
  padding = 'lg', 
  background = 'none',
  className, 
  children, 
  ...props 
}: SectionProps) {
  const paddingClasses = {
    none: '',
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16', 
    xl: 'py-24'
  };

  const backgroundClasses = {
    none: '',
    muted: 'bg-muted/30',
    card: 'bg-card'
  };

  return (
    <section 
      className={cn(
        paddingClasses[padding],
        backgroundClasses[background],
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}