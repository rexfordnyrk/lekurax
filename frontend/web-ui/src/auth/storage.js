import { LocalStorageTokenStore } from "@authzkit/client";
import { AUTHZ_TOKEN_PREFIX } from "./config";

export const tokenStore = new LocalStorageTokenStore(AUTHZ_TOKEN_PREFIX);
