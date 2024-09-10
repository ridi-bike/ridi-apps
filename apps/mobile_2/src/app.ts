import { Application } from "@nativescript/core";
// @ts-expect-error missing ts defs
import { render } from "@nativescript-community/solid-js";

import { document } from "dominative";
import { MainApp } from "./main-app";

document.body.actionBarHidden = false;
render(MainApp, document.body);

const create = () => document;

Application.run({ create });
