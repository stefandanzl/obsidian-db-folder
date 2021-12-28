import { App } from "obsidian";

export interface Handler {
    setNext(handler: Handler): Handler;

    handle(yaml: any, app: App): string[];
}

export abstract class AbstractHandler implements Handler {
    protected nextHandler: Handler;
    protected listOfErrors: string[] = [];

    public setNext(handler: Handler): Handler {
        this.nextHandler = handler;

        return handler;
    }

    public handle(yaml: any, app: App): string[] {
        if (this.nextHandler) {
            return this.nextHandler.handle(yaml,app);
        }

        return this.listOfErrors;
    }
}