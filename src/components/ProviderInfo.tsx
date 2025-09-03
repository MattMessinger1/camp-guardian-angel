import { Alert } from '@/components/ui/alert'

interface ProviderStats {
  successRate: number;
  captchaRate: number;
  totalAttempts: number;
}

interface ProviderInfoProps {
  provider: string;
  stats?: ProviderStats;
}

const ProviderInfo = ({ provider, stats }: ProviderInfoProps) => {
  const info = {
    peloton: {
      icon: '🚴',
      tips: [
        'Classes open 7 days in advance',
        'Popular classes fill in <1 minute',
        'Login required for automation'
      ]
    },
    ticketmaster: {
      icon: '🎫',
      tips: [
        'Queue system likely',
        'CAPTCHA usually required',
        'Have payment ready'
      ]
    },
    eventbrite: {
      icon: '🎟️',
      tips: [
        'Registration usually immediate',
        'Email confirmation required',
        'Payment processed instantly'
      ]
    },
    unknown: {
      icon: '🔍',
      tips: [
        'New provider - we\'re learning',
        'Manual time entry recommended',
        'Help us improve by reporting results'
      ]
    }
  }
  
  const providerInfo = info[provider?.toLowerCase()] || info.unknown
  
  return (
    <Alert className="mb-4 bg-blue-50 border-blue-200">
      <div className="flex gap-3">
        <span className="text-2xl">{providerInfo.icon}</span>
        <div>
          <h3 className="font-semibold capitalize">{provider || 'Unknown Provider'}</h3>
          <ul className="text-sm mt-2 space-y-1">
            {providerInfo.tips.map(tip => (
              <li key={tip} className="flex items-start gap-1">
                <span className="text-blue-600">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          {stats && stats.totalAttempts > 0 && (
            <div className="text-xs text-gray-600 mt-3 p-2 bg-white rounded border">
              <div className="font-medium mb-1">Recent Performance:</div>
              <div className="flex gap-4">
                <span>Success: {stats.successRate}%</span>
                <span>CAPTCHA: {stats.captchaRate}%</span>
                <span>({stats.totalAttempts} attempts)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Alert>
  )
}

export default ProviderInfo