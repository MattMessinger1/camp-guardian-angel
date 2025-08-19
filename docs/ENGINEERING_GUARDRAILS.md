# Engineering Guardrails

## PHI and HIPAA Compliance

### Zero PHI Collection Policy
- **NO PHI collection**: This system MUST NOT collect, store, or process any Protected Health Information (PHI)
- **HIPAA avoidance**: All design decisions must actively avoid creating HIPAA obligations
- **Metadata logging**: Only log metadata about avoidance decisions, never the actual data
- **Camp registration data**: While we handle camp registrations, we avoid medical forms, health records, or any healthcare-related information

### Examples of Prohibited Data
- Medical conditions, allergies, medications
- Health insurance information
- Medical provider details
- Treatment history or medical records
- Any data that could trigger HIPAA compliance requirements

### Compliance Monitoring
- All data ingestion points must include PHI avoidance checks
- Log decisions about data exclusion for audit purposes
- Regular reviews of data collection practices

## Technical Standards

### TypeScript Configuration
- **Strict mode enabled**: All code must pass TypeScript strict checks
- **Input validation required**: All external inputs must be validated using Zod schemas
- **Robust error handling**: All functions must handle errors gracefully with structured logging
- **Type safety**: No `any` types allowed in production code

### Logging Requirements
- **Structured logging**: Use `src/lib/log.ts` for all logging operations
- **No console.log**: Direct console calls are prohibited in production code
- **Log levels**: Use appropriate levels (info, warn, error) for different scenarios
- **Metadata inclusion**: Include relevant context in all log entries

### Error Handling Standards
- All async operations must have try-catch blocks
- Errors must be logged with structured metadata
- User-facing errors must be sanitized (no internal details exposed)
- Failed operations must be recoverable or fail gracefully

## Feature Development

### Feature Flags
- **Gradual rollouts**: All new features must use feature flags for controlled deployment
- **Default disabled**: New features default to `false` in `src/config/featureFlags.ts`
- **Staged deployment**: Features progress through dev → staging → production
- **Rollback capability**: Features must be immediately reversible via flag toggle

### Feature Flag Lifecycle
1. **Development**: Feature flag created, defaults to `false`
2. **Internal testing**: Flag enabled for development team
3. **Limited rollout**: Flag enabled for subset of users
4. **Full deployment**: Flag enabled for all users
5. **Flag removal**: After stable period, flag and conditional code removed

### Code Quality
- All new code must include unit tests
- Integration tests required for API endpoints
- Code reviews mandatory for all changes
- Documentation updates required for feature changes

## Data Ingestion Standards

### Required Comments
All data ingestion points must include this comment:
```typescript
// Engineering Guardrails: docs/ENGINEERING_GUARDRAILS.md
// PHI Avoidance: This endpoint deliberately avoids collecting any PHI data
```

### Validation Requirements
- Zod schema validation for all inputs
- Sanitization of user inputs
- Rate limiting on public endpoints
- Audit logging for data operations

### Monitoring
- All ingestion points must emit metrics
- Failed validations must be logged
- Performance monitoring for all endpoints
- Alerting for unusual patterns

## Security Requirements

### Authentication
- All sensitive operations require authentication
- Session management follows security best practices
- API endpoints properly validate user permissions

### Data Protection
- No sensitive data in logs
- Encryption for data at rest and in transit
- Secure credential management via Supabase secrets

### Audit Trail
- All user actions logged with metadata
- System changes tracked with attribution
- Regular security reviews and updates

## Compliance Monitoring

### Regular Reviews
- Monthly review of data collection practices
- Quarterly security assessments
- Annual compliance verification

### Incident Response
- Immediate notification for PHI-related incidents
- Documentation of all security events
- Post-incident reviews and improvements

---

**Reference this document in all data ingestion code to ensure compliance.**