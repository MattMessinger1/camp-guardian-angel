import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import { READINESS_STATUS, READINESS_LABELS, type ReadinessStatus } from "@/lib/constants/readiness";
import { cn } from "@/lib/utils";

interface ReadinessBadgeProps {
  status: ReadinessStatus;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ReadinessBadge({ status, className, size = "md" }: ReadinessBadgeProps) {
  const getStatusConfig = (status: ReadinessStatus) => {
    switch (status) {
      case READINESS_STATUS.READY_FOR_SIGNUP:
        return {
          icon: CheckCircle,
          className: "bg-secondary text-secondary-foreground border-secondary/20",
          label: READINESS_LABELS[status]
        };
      case READINESS_STATUS.IN_PROGRESS:
        return {
          icon: Clock,
          className: "bg-primary/10 text-primary border-primary/20",
          label: READINESS_LABELS[status]
        };
      case READINESS_STATUS.BLOCKED:
        return {
          icon: AlertCircle,
          className: "bg-destructive/10 text-destructive border-destructive/20",
          label: READINESS_LABELS[status]
        };
      default:
        return {
          icon: XCircle,
          className: "bg-muted text-muted-foreground border-muted-foreground/20",
          label: READINESS_LABELS[status]
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";

  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.className,
        textSize,
        "font-medium border transition-all duration-200",
        className
      )}
    >
      <Icon className={cn(iconSize, "mr-1.5")} />
      {config.label}
    </Badge>
  );
}