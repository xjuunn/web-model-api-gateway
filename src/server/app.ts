import { createGatewayApp } from "../gateway/app";
import { ApiContext } from "./context";

export function createServerApp(context: ApiContext) {
  return createGatewayApp(context);
}
