// VGS Configuration - Updated to use environment variables
import { env } from "./environment";

export const VGS_VAULT_ID = env.VGS_VAULT_ID;
export const VGS_ENV = env.VGS_ENV || 'sandbox';
export const VGS_COLLECT_PUBLIC_KEY = env.VGS_COLLECT_PUBLIC_KEY;
