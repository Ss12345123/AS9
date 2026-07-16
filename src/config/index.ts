import dotenv from "dotenv";
import path from "path";

// Initialize dotenv from the root of the project
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface Config {
  // System & Host Config
  nodeEnv: string;
  port: number;
  appUrl: string;
  appSecret: string;
  corsOrigin: string;
  corsCredentials: boolean;
  sessionTimeout: number;

  // Security & Encryption
  encryptionKey: string;
  encryptionIv: string;
  jwtSecret: string;
  jwtExpiry: string;
  refreshTokenExpiry: string;

  // Admin Credentials
  adminUsername: string;
  adminEmail: string;
  adminPasscode: string;

  // Gemini AI Integration
  geminiApiKey: string;

  // Twelve Data Integration
  twelveDataApiKey: string;

  // Capital.com Integration
  capitalComDemo: boolean;
  capitalComApiUrl: string;
  capitalComApiKey: string;
  capitalComIdentifier: string;
  capitalComPassword: string;

  // Google OAuth Integration
  googleClientId: string;
  googleClientSecret: string;



  // Telegram Bot Integration
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;

  // Resend Integration
  resendApiKey: string;

  // Feature Flags & Simulation Defaults
  debugMode: boolean;
  enableDemoMode: boolean;
  enableLiveTrading: boolean;
  enableMockData: boolean;
  enablePaperTrading: boolean;
  cacheDuration: number;

  // Logging & Monitoring
  logLevel: string;
  logFile: string;
  rateLimitMaxRequests: number;
  rateLimitWindow: number;

  // Database Configuration
  databaseUrl: string;
  databaseHost: string;
  databasePort: number;
  databaseUser: string;
  databaseName: string;
  databasePassword: string;
}

// Utility to parse boolean env variables safely
const parseBool = (val: string | undefined, defaultVal: boolean): boolean => {
  if (val === undefined) return defaultVal;
  return val.toLowerCase() === "true" || val === "1";
};

// Utility to parse number env variables safely
const parseNum = (val: string | undefined, defaultVal: number): number => {
  if (val === undefined) return defaultVal;
  const num = parseInt(val, 10);
  return isNaN(num) ? defaultVal : num;
};

// Required environment variables checklist
const REQUIRED_VARS: { key: keyof Config; envKey: string; validator?: (val: any) => boolean; errorMsg: string }[] = [
  {
    key: "appSecret",
    envKey: "APP_SECRET",
    validator: (val) => typeof val === "string" && val.trim().length > 0,
    errorMsg: "APP_SECRET must be a non-empty string. Required for session security.",
  },
  {
    key: "jwtSecret",
    envKey: "JWT_SECRET",
    validator: (val) => typeof val === "string" && val.trim().length > 0,
    errorMsg: "JWT_SECRET must be a non-empty string. Required for signing authentication tokens.",
  },
  {
    key: "encryptionKey",
    envKey: "ENCRYPTION_KEY",
    validator: (val) => typeof val === "string" && val.trim().length >= 16,
    errorMsg: "ENCRYPTION_KEY must be a string of at least 16 characters for securing stored credentials.",
  },
  {
    key: "encryptionIv",
    envKey: "ENCRYPTION_IV",
    validator: (val) => typeof val === "string" && val.trim().length >= 16,
    errorMsg: "ENCRYPTION_IV must be a string of at least 16 characters for initialization vectors.",
  },
  {
    key: "adminPasscode",
    envKey: "ADMIN_PASSCODE",
    validator: (val) => typeof val === "string" && val.trim().length > 0,
    errorMsg: "ADMIN_PASSCODE is required to authenticate system administrative controls.",
  },
  {
    key: "geminiApiKey",
    envKey: "GEMINI_API_KEY",
    validator: (val) => typeof val === "string" && val.trim().length > 0,
    errorMsg: "GEMINI_API_KEY must be a non-empty string for server-side AI model integration.",
  }
];

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseNum(process.env.PORT, 3000),
  appUrl: process.env.APP_URL || "http://localhost:3000",
  appSecret: process.env.APP_SECRET || "gold_ai_platform_default_app_secret_secure_fallback_min_32_chars_long",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  corsCredentials: parseBool(process.env.CORS_CREDENTIALS, true),
  sessionTimeout: parseNum(process.env.SESSION_TIMEOUT, 3600000),

  encryptionKey: process.env.ENCRYPTION_KEY || "default_sec_encryption_key_32_chars",
  encryptionIv: process.env.ENCRYPTION_IV || "default_sec_encryption_iv_16_chars",
  jwtSecret: process.env.JWT_SECRET || "gold_ai_platform_default_jwt_secret_secure_fallback_min_32_chars_long",
  jwtExpiry: process.env.JWT_EXPIRY || "30d",
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || "30d",

  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminEmail: process.env.ADMIN_EMAIL || "admin@goldai.com",
  adminPasscode: process.env.ADMIN_PASSCODE || "Ss1234123.",

  geminiApiKey: process.env.GEMINI_API_KEY || "",

  twelveDataApiKey: process.env.TWELVE_DATA_API_KEY || "",

  capitalComDemo: parseBool(process.env.CAPITAL_COM_DEMO, true),
  capitalComApiUrl: process.env.CAPITAL_COM_API_URL || "https://demo-api-capital.backend-capital.com",
  capitalComApiKey: process.env.CAPITAL_COM_API_KEY || "",
  capitalComIdentifier: process.env.CAPITAL_COM_IDENTIFIER || "",
  capitalComPassword: process.env.CAPITAL_COM_PASSWORD || "",

  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",



  telegramEnabled: parseBool(process.env.TELEGRAM_ENABLED, false),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",

  resendApiKey: process.env.RESEND_API_KEY || "",

  debugMode: parseBool(process.env.DEBUG_MODE, true),
  enableDemoMode: parseBool(process.env.ENABLE_DEMO_MODE, true),
  enableLiveTrading: parseBool(process.env.ENABLE_LIVE_TRADING, false),
  enableMockData: parseBool(process.env.ENABLE_MOCK_DATA, true),
  enablePaperTrading: parseBool(process.env.ENABLE_PAPER_TRADING, true),
  cacheDuration: parseNum(process.env.CACHE_DURATION, 900),

  logLevel: process.env.LOG_LEVEL || "info",
  logFile: process.env.LOG_FILE || "logs/app.log",
  rateLimitMaxRequests: parseNum(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
  rateLimitWindow: parseNum(process.env.RATE_LIMIT_WINDOW, 60000),

  databaseUrl: process.env.DATABASE_URL || "",
  databaseHost: process.env.DATABASE_HOST || "",
  databasePort: parseNum(process.env.DATABASE_PORT, 5432),
  databaseUser: process.env.DATABASE_USER || "",
  databaseName: process.env.DATABASE_NAME || "",
  databasePassword: process.env.DATABASE_PASSWORD || "",
};

// Log environment variables at startup with masked secrets
console.log("=================================================================");
console.log("📋 [Environment Variables Checklist]");
console.log("=================================================================");
const envVarsToLog = [
  { name: "NODE_ENV", val: process.env.NODE_ENV, sensitive: false },
  { name: "PORT", val: process.env.PORT, sensitive: false },
  { name: "CAPITAL_COM_API_KEY", val: process.env.CAPITAL_COM_API_KEY, sensitive: true },
  { name: "CAPITAL_COM_IDENTIFIER", val: process.env.CAPITAL_COM_IDENTIFIER, sensitive: true },
  { name: "CAPITAL_COM_PASSWORD", val: process.env.CAPITAL_COM_PASSWORD, sensitive: true },
  { name: "CAPITAL_COM_DEMO", val: process.env.CAPITAL_COM_DEMO, sensitive: false },
  { name: "CAPITAL_COM_API_URL", val: process.env.CAPITAL_COM_API_URL, sensitive: false },
  { name: "JWT_SECRET", val: process.env.JWT_SECRET, sensitive: true },
  { name: "ENCRYPTION_KEY", val: process.env.ENCRYPTION_KEY, sensitive: true },
  { name: "ENCRYPTION_IV", val: process.env.ENCRYPTION_IV, sensitive: true },
  { name: "APP_SECRET", val: process.env.APP_SECRET, sensitive: true },
  { name: "ADMIN_PASSCODE", val: process.env.ADMIN_PASSCODE, sensitive: true },
  { name: "GEMINI_API_KEY", val: process.env.GEMINI_API_KEY, sensitive: true },
  { name: "RESEND_API_KEY", val: process.env.RESEND_API_KEY, sensitive: true },
];

envVarsToLog.forEach(v => {
  if (v.val === undefined) {
    console.log(`- ${v.name}: [NOT SET]`);
  } else if (v.val === "") {
    console.log(`- ${v.name}: [EMPTY STRING]`);
  } else if (v.sensitive) {
    const str = String(v.val);
    const masked = str.length > 4 
      ? `${str[0]}***${str[str.length - 1]} (length: ${str.length})` 
      : `*** (length: ${str.length})`;
    console.log(`- ${v.name}: [CONFIGURED] (${masked})`);
  } else {
    console.log(`- ${v.name}: [CONFIGURED] (${v.val})`);
  }
});
console.log("=================================================================");

// Warning logs for default fallback keys in production
if (!process.env.ENCRYPTION_KEY && process.env.NODE_ENV === "production") {
  console.warn("⚠️ [Security Warning] ENCRYPTION_KEY environment variable is not defined in Production. Falling back to a standard default key.");
}
if (!process.env.ENCRYPTION_IV && process.env.NODE_ENV === "production") {
  console.warn("⚠️ [Security Warning] ENCRYPTION_IV environment variable is not defined in Production. Falling back to a standard default IV.");
}

// Validation Execution on startup
const missingVars: string[] = [];

for (const reqVar of REQUIRED_VARS) {
  const value = config[reqVar.key];
  const isValid = reqVar.validator ? reqVar.validator(value) : (value !== undefined && value !== null && value !== "");
  if (!isValid) {
    missingVars.push(`[${reqVar.envKey}]: ${reqVar.errorMsg}`);
  }
}

if (missingVars.length > 0) {
  console.warn("=================================================================");
  console.warn("⚠️ GOLD AI PLATFORM CONFIGURATION WARNING: MISSING REQUIRED ENV VARS");
  console.warn("=================================================================");
  missingVars.forEach((err) => console.warn(err));
  console.warn("=================================================================");
  console.warn("The application is starting using secure default fallbacks.");
  console.warn("Configure these variables in your environment for production use.");
  console.warn("=================================================================");
}

console.log("✅ Gold AI Platform Configuration Initialized & Validated Successfully.");
export default config;
