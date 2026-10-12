import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig({});
// Tắt useWorkerdCondition để esbuild không resolve pg-cloudflare
// bằng export condition "workerd" (gây lỗi build)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(config as any).cloudflare.useWorkerdCondition = false;

export default config;
