import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, Clock, BarChart3 } from 'lucide-react';

interface AuditData {
  page: string;
  route: string;
  completed: number;
  total: number;
  checkedItems: Record<string, boolean>;
  notes: Record<string, string>;
  timestamp: string;
}

export default function UIAuditSummary() {
  const [audits, setAudits] = useState<AuditData[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const savedAudits = JSON.parse(localStorage.getItem('ui-audits') || '[]');
    setAudits(savedAudits);
  }, []);

  const clearAllAudits = () => {
    localStorage.removeItem('ui-audits');
    setAudits([]);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return CheckCircle;
    if (percentage >= 70) return Clock;
    return AlertCircle;
  };

  const totalPages = audits.length;
  const completedPages = audits.filter(audit => (audit.completed / audit.total) >= 0.9).length;
  const overallProgress = totalPages > 0 ? (completedPages / totalPages) * 100 : 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">UI Audit Dashboard</h1>
          <p className="text-muted-foreground">
            Track UI consistency and quality across all pages
          </p>
        </div>

        {/* Overall Progress */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{totalPages}</div>
                <div className="text-sm text-muted-foreground">Pages Audited</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{completedPages}</div>
                <div className="text-sm text-muted-foreground">Pages Complete (90%+)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{totalPages - completedPages}</div>
                <div className="text-sm text-muted-foreground">Pages Needs Work</div>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Completion</span>
                <span className="text-sm text-muted-foreground">{overallProgress.toFixed(1)}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Page Audits */}
        <div className="grid gap-4">
          {audits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Audits Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start auditing your pages to track UI improvements
                </p>
                <Button onClick={() => navigate('/')}>
                  Go to Homepage
                </Button>
              </CardContent>
            </Card>
          ) : (
            audits.map((audit) => {
              const percentage = (audit.completed / audit.total) * 100;
              const StatusIcon = getStatusIcon(percentage);
              
              return (
                <Card key={audit.route}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{audit.page}</h3>
                        <p className="text-sm text-muted-foreground">{audit.route}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(percentage)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {percentage.toFixed(0)}%
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {audit.completed}/{audit.total}
                        </span>
                      </div>
                    </div>
                    
                    <Progress value={percentage} className="mb-4" />
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last updated: {new Date(audit.timestamp).toLocaleString()}</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(audit.route + '?ui-audit=true')}
                      >
                        Continue Audit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {audits.length > 0 && (
          <div className="mt-8 text-center">
            <Button variant="destructive" onClick={clearAllAudits}>
              Clear All Audit Data
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}