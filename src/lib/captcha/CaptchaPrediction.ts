/**
 * CAPTCHA Prediction System
 * 
 * Provides predictive CAPTCHA detection to enable pre-emptive handling
 * and faster user notifications for improved queue position maintenance.
 */

export interface CaptchaPredictionScore {
  likelihood: number; // 0-1 probability of CAPTCHA appearance
  confidence: number; // 0-1 confidence in prediction
  factors: {
    timeOfDay: number;
    trafficLoad: number;
    providerHistory: number;
    sessionBehavior: number;
  };
  recommendedAction: 'monitor' | 'prepare' | 'pre_notify';
}

export interface ProviderCaptchaPattern {
  provider: string;
  timeBasedTriggers: {
    peakHours: number[]; // Hours when CAPTCHA is more likely
    trafficThresholds: number;
  };
  behaviorTriggers: {
    rapidRequests: boolean;
    botDetectionSensitivity: 'low' | 'medium' | 'high';
  };
  historicalData: {
    captchaFrequency: number; // Per 100 registrations
    averageAppearanceTime: number; // Seconds into registration
  };
}

export class CaptchaPredictor {
  private providerPatterns = new Map<string, ProviderCaptchaPattern>();
  
  /**
   * Analyze likelihood of CAPTCHA appearing for given session
   */
  async predictCaptchaLikelihood(
    provider: string,
    sessionContext: {
      currentTime: Date;
      queuePosition?: number;
      timeInQueue?: number;
      userBehaviorScore?: number;
    }
  ): Promise<CaptchaPredictionScore> {
    const pattern = this.providerPatterns.get(provider);
    if (!pattern) {
      // Default conservative prediction for unknown providers
      return {
        likelihood: 0.3,
        confidence: 0.5,
        factors: {
          timeOfDay: 0.5,
          trafficLoad: 0.5,
          providerHistory: 0.0, // Unknown
          sessionBehavior: 0.5
        },
        recommendedAction: 'monitor'
      };
    }

    const factors = {
      timeOfDay: this.calculateTimeOfDayFactor(sessionContext.currentTime, pattern),
      trafficLoad: this.calculateTrafficLoadFactor(sessionContext.queuePosition),
      providerHistory: pattern.historicalData.captchaFrequency / 100,
      sessionBehavior: this.calculateBehaviorFactor(sessionContext)
    };

    // Weighted likelihood calculation
    const likelihood = (
      factors.timeOfDay * 0.25 +
      factors.trafficLoad * 0.35 +
      factors.providerHistory * 0.30 +
      factors.sessionBehavior * 0.10
    );

    const confidence = Math.min(0.9, 
      (pattern.historicalData.captchaFrequency > 10 ? 0.8 : 0.5) +
      (sessionContext.timeInQueue && sessionContext.timeInQueue > 300 ? 0.2 : 0.1)
    );

    let recommendedAction: 'monitor' | 'prepare' | 'pre_notify' = 'monitor';
    if (likelihood > 0.7 && confidence > 0.7) {
      recommendedAction = 'pre_notify';
    } else if (likelihood > 0.5 && confidence > 0.6) {
      recommendedAction = 'prepare';
    }

    return {
      likelihood,
      confidence,
      factors,
      recommendedAction
    };
  }

  /**
   * Update provider patterns based on observed CAPTCHA events
   */
  async updateProviderPattern(
    provider: string,
    captchaEvent: {
      appeared: boolean;
      timeOfDay: Date;
      queuePosition?: number;
      timeToAppear?: number; // Seconds from registration start
    }
  ): Promise<void> {
    // Machine learning update logic would go here
    // For now, we'll implement a simple statistical update
    
    let pattern = this.providerPatterns.get(provider);
    if (!pattern) {
      pattern = this.createDefaultPattern(provider);
      this.providerPatterns.set(provider, pattern);
    }

    // Update historical frequency
    const currentSample = pattern.historicalData.captchaFrequency;
    const newSample = captchaEvent.appeared ? 1 : 0;
    // Exponential moving average
    pattern.historicalData.captchaFrequency = 
      currentSample * 0.9 + newSample * 0.1;

    if (captchaEvent.appeared && captchaEvent.timeToAppear) {
      pattern.historicalData.averageAppearanceTime = 
        (pattern.historicalData.averageAppearanceTime * 0.8) + 
        (captchaEvent.timeToAppear * 0.2);
    }
  }

  private calculateTimeOfDayFactor(currentTime: Date, pattern: ProviderCaptchaPattern): number {
    const hour = currentTime.getHours();
    const isPeakHour = pattern.timeBasedTriggers.peakHours.includes(hour);
    return isPeakHour ? 0.8 : 0.3;
  }

  private calculateTrafficLoadFactor(queuePosition?: number): number {
    if (!queuePosition) return 0.5;
    
    // Higher queue positions indicate more traffic/load
    if (queuePosition > 100) return 0.9;
    if (queuePosition > 50) return 0.7;
    if (queuePosition > 20) return 0.5;
    return 0.2;
  }

  private calculateBehaviorFactor(sessionContext: any): number {
    // Base factor - could be enhanced with actual behavior analysis
    return sessionContext.userBehaviorScore || 0.5;
  }

  private createDefaultPattern(provider: string): ProviderCaptchaPattern {
    return {
      provider,
      timeBasedTriggers: {
        peakHours: [8, 9, 10, 17, 18, 19], // Common registration hours
        trafficThresholds: 50
      },
      behaviorTriggers: {
        rapidRequests: true,
        botDetectionSensitivity: 'medium'
      },
      historicalData: {
        captchaFrequency: 30, // Assume 30% chance initially
        averageAppearanceTime: 120 // 2 minutes average
      }
    };
  }

  /**
   * Get optimal notification timing based on prediction
   */
  getOptimalNotificationTiming(prediction: CaptchaPredictionScore): {
    preNotifyMinutes: number;
    urgencyLevel: 'low' | 'medium' | 'high';
    preparationSteps: string[];
  } {
    const { likelihood, confidence, recommendedAction } = prediction;

    if (recommendedAction === 'pre_notify') {
      return {
        preNotifyMinutes: 2,
        urgencyLevel: 'high',
        preparationSteps: [
          'Pre-generate secure resume tokens',
          'Verify parent phone availability', 
          'Pre-warm notification channels',
          'Prepare browser state checkpoint'
        ]
      };
    }

    if (recommendedAction === 'prepare') {
      return {
        preNotifyMinutes: 5,
        urgencyLevel: 'medium',
        preparationSteps: [
          'Monitor browser state closely',
          'Verify notification channels',
          'Prepare resume workflow'
        ]
      };
    }

    return {
      preNotifyMinutes: 10,
      urgencyLevel: 'low',
      preparationSteps: [
        'Standard monitoring'
      ]
    };
  }
}

// Singleton instance
export const captchaPredictor = new CaptchaPredictor();