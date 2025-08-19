import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { CheckCircle, Circle, AlertTriangle, Palette, Layout, Type, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UICheckItem {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: React.ComponentType<any>;
}

const uiChecklist: UICheckItem[] = [
  // Design System
  {
    id: 'colors-semantic',
    category: 'Design System',
    title: 'Semantic Color Tokens',
    description: 'All colors use CSS variables (--primary, --secondary, etc.) instead of direct colors',
    priority: 'high',
    icon: Palette
  },
  {
    id: 'typography-consistent',
    category: 'Design System', 
    title: 'Typography Scale',
    description: 'Consistent font sizes, weights, and line heights across components',
    priority: 'high',
    icon: Type
  },
  {
    id: 'spacing-system',
    category: 'Design System',
    title: 'Spacing System',
    description: 'Uses Tailwind spacing scale (p-4, m-6, gap-3) consistently',
    priority: 'medium',
    icon: Layout
  },

  // Layout & Structure
  {
    id: 'responsive-design',
    category: 'Layout',
    title: 'Mobile Responsive',
    description: 'Page works well on mobile, tablet, and desktop',
    priority: 'high',
    icon: Layout
  },
  {
    id: 'semantic-html',
    category: 'Layout',
    title: 'Semantic HTML',
    description: 'Uses <main>, <section>, <header>, <nav> appropriately',
    priority: 'medium',
    icon: Layout
  },
  {
    id: 'loading-states',
    category: 'UX',
    title: 'Loading States',
    description: 'Clear loading indicators for async operations',
    priority: 'high',
    icon: Zap
  },

  // Accessibility
  {
    id: 'keyboard-navigation',
    category: 'Accessibility',
    title: 'Keyboard Navigation',
    description: 'All interactive elements accessible via keyboard',
    priority: 'high',
    icon: Zap
  },
  {
    id: 'alt-text',
    category: 'Accessibility',
    title: 'Image Alt Text',
    description: 'All images have descriptive alt attributes',
    priority: 'medium',
    icon: AlertTriangle
  },
  {
    id: 'focus-indicators',
    category: 'Accessibility',
    title: 'Focus Indicators',
    description: 'Clear focus outlines on interactive elements',
    priority: 'medium',
    icon: AlertTriangle
  },

  // Performance & Polish
  {
    id: 'error-handling',
    category: 'UX',
    title: 'Error Handling',
    description: 'Graceful error messages and fallback states',
    priority: 'high',
    icon: AlertTriangle
  },
  {
    id: 'animations-smooth',
    category: 'Polish',
    title: 'Smooth Transitions',
    description: 'Hover effects and transitions feel polished',
    priority: 'low',
    icon: Zap
  },
  {
    id: 'empty-states',
    category: 'UX',
    title: 'Empty States',
    description: 'Helpful messages when no data is available',
    priority: 'medium',
    icon: AlertTriangle
  }
];

interface PageAuditProps {
  pageName: string;
  currentRoute: string;
}

export function UIAuditChecklist({ pageName, currentRoute }: PageAuditProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const progressPercentage = (completedCount / uiChecklist.length) * 100;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Design System': 'bg-purple-100 text-purple-800',
      'Layout': 'bg-blue-100 text-blue-800', 
      'Accessibility': 'bg-green-100 text-green-800',
      'UX': 'bg-orange-100 text-orange-800',
      'Polish': 'bg-pink-100 text-pink-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const saveAudit = () => {
    const auditData = {
      page: pageName,
      route: currentRoute,
      completed: completedCount,
      total: uiChecklist.length,
      checkedItems,
      notes,
      timestamp: new Date().toISOString()
    };
    
    // Save to localStorage for now
    const savedAudits = JSON.parse(localStorage.getItem('ui-audits') || '[]');
    const existingIndex = savedAudits.findIndex((audit: any) => audit.route === currentRoute);
    
    if (existingIndex >= 0) {
      savedAudits[existingIndex] = auditData;
    } else {
      savedAudits.push(auditData);
    }
    
    localStorage.setItem('ui-audits', JSON.stringify(savedAudits));
    
    toast({
      title: "UI Audit Saved",
      description: `Progress saved for ${pageName} (${completedCount}/${uiChecklist.length} items)`,
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>UI Audit: {pageName}</span>
            <Badge variant="outline">{currentRoute}</Badge>
          </CardTitle>
          <CardDescription>
            Complete this checklist to ensure consistent, accessible, and polished UI
          </CardDescription>
          
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1">
              <Progress value={progressPercentage} className="h-3" />
            </div>
            <div className="text-sm font-medium">
              {completedCount} / {uiChecklist.length} completed
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4 mb-6">
        {uiChecklist.map((item) => {
          const Icon = item.icon;
          const isChecked = checkedItems[item.id];
          
          return (
            <Card key={item.id} className={`transition-all ${isChecked ? 'bg-green-50 border-green-200' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="mt-1 transition-colors"
                  >
                    {isChecked ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                    )}
                  </button>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">{item.title}</h3>
                      <Badge className={getCategoryColor(item.category)} variant="outline">
                        {item.category}
                      </Badge>
                      <Badge className={getPriorityColor(item.priority)} variant="outline">
                        {item.priority}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                    
                    <textarea
                      placeholder="Add notes about this item..."
                      value={notes[item.id] || ''}
                      onChange={(e) => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-full p-2 text-sm border rounded resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button onClick={saveAudit} className="flex-1">
          Save Audit Progress
        </Button>
        <Button 
          variant="outline"
          onClick={() => window.open('/ui-audit-summary', '_blank')}
        >
          View All Audits
        </Button>
      </div>
    </div>
  );
}