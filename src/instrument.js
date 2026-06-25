import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://338474fdfcd2eb03da0b6e6962766eb9@o4511627861426176.ingest.us.sentry.io/4511627902517248",
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 0.2,
  dataCollection: {
    // não coleta senhas nem dados sensíveis do body
    httpBodies: [],
  },
});
