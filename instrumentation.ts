import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({ serviceName: "dermato-xai-app" });
}
