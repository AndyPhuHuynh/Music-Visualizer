import { Pane } from "tweakpane"
import { BindingApi } from "@tweakpane/core";

type TweakpaneOptions = {
    leftColor: number
    rightColor: number
}

export class Tweakpane {
    settings: TweakpaneOptions;
    leftColorBinding: BindingApi;
    rightColorBinding: BindingApi;

    constructor() {
        this.settings = {
            leftColor: 0x40DE35,
            rightColor: 0x35DED8,
        }

        const pane = new Pane({
            title: "Settings"
        });
        pane.element.style.position = "fixed";
        pane.element.style.top = "10px";
        pane.element.style.right = "10px";
        pane.element.style.width = "350px";

        this.leftColorBinding = pane.addBinding(this.settings, "leftColor", {
            label: "Left gradient color",
            view: "color"
        });
        this.rightColorBinding = pane.addBinding(this.settings, "rightColor", {
            label: "Right gradient color",
            view: "color"
        });
    }
}