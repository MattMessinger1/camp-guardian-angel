import { Badge } from "@/components/ui/badge";
import { Crown, Building2, Dumbbell, Users, ShoppingBag } from "lucide-react";

interface ProviderBadgeProps {
  platform: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function ProviderBadge({ platform, size = "sm", showIcon = true }: ProviderBadgeProps) {
  const getProviderInfo = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'jackrabbit_class':
      case 'jackrabbit':
        return {
          label: 'Jackrabbit',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: Users,
          description: 'Class Management'
        };
      case 'daysmart_recreation':
      case 'daysmart':
        return {
          label: 'Daysmart',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Building2,
          description: 'Recreation Software'
        };
      case 'resy':
        return {
          label: 'Resy',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: Crown,
          description: 'Fine Dining'
        };
      case 'peloton':
        return {
          label: 'Peloton',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: Dumbbell,
          description: 'Fitness Classes'
        };
      case 'shopify_product':
      case 'shopify':
        return {
          label: 'Shopify',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: ShoppingBag,
          description: 'E-commerce'
        };
      default:
        return {
          label: 'Platform',
          color: 'bg-muted text-muted-foreground border-border',
          icon: Building2,
          description: 'Generic Provider'
        };
    }
  };

  const info = getProviderInfo(platform);
  const IconComponent = info.icon;

  return (
    <Badge 
      variant="outline" 
      className={`${info.color} ${
        size === 'lg' ? 'px-3 py-1 text-sm' : 
        size === 'md' ? 'px-2 py-1 text-xs' : 
        'px-2 py-0.5 text-xs'
      } font-medium`}
    >
      {showIcon && <IconComponent className={`${size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />}
      {info.label}
    </Badge>
  );
}