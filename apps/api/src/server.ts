import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, env.HOST, () => {
  const publicHost = env.HOST === "0.0.0.0" ? "localhost" : env.HOST;
  console.log(`API running on http://${publicHost}:${env.PORT} (bound to ${env.HOST})`);
});
