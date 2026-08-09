import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const appUrls = (process.env.APP_URL || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

const corsOrigins = [...appUrls, "https://blabber404.web.app"];

export default {
  port: process.env.PORT || 5000,
  app_url: appUrls[0],
  cors_origins: corsOrigins,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS!,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET!,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET!,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN!,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN!,
};
