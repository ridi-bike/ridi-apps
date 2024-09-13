import "./globals";
import { AuthPage } from "./pages/auth-page";
import { RootPage } from "./pages/root-page";
import { Route, StackRouter } from "./router";

const App = () => {
	return (
		<StackRouter initialRouteName="RootPage">
			<Route name="RootPage" component={RootPage} />
			<Route name="AuthPage" component={AuthPage} />
		</StackRouter>
	);
};

export { App };
