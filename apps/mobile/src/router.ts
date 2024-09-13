import { createStackRouter, type RouteDefinition } from "solid-navigation";

declare module "solid-navigation" {
	export interface Routers {
		Default: {
			RootPage: RouteDefinition;
			AuthPage: RouteDefinition;
		};
	}
}

export const { Route, StackRouter, useParams, useRouter } =
	createStackRouter<"Default">();
