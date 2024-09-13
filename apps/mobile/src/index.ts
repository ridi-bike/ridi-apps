import "abortcontroller-polyfill/dist/polyfill-patch-fetch";
import { Application } from "@nativescript/core";
// @ts-expect-error missing ts defs
import { render } from "@nativescript-community/solid-js";

import { document } from "dominative";
import { App } from "./app";

document.body.actionBarHidden = true;
render(App, document.body);

const create = () => document;

Application.run({ create });
