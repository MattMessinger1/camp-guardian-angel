import React from 'react';
import { ReadyToSignupTestRunner } from '../components/ReadyToSignupTestRunner';

export function TestEnvironment() {
  return (
    <div className="min-h-screen bg-background">
      <ReadyToSignupTestRunner />
    </div>
  );
}