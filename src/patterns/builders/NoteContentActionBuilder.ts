import { NoteContentAction } from "cdm/FolderModel";
import { TFile } from "obsidian";

export default class NoteContentActionBuilder {
    private file: TFile;
    private content: string;
    private regExpList: RegExp[] = [];
    private regExpNewValue: string[] = [];

    constructor(private action = "replace") {
    }

    public setFile(file: TFile): NoteContentActionBuilder {
        this.file = file;
        return this;
    }

    public setAction(action: string): NoteContentActionBuilder {
        this.action = action;
        return this;
    }

    public setContent(content: string): NoteContentActionBuilder {
        this.content = content;
        return this;
    }

    public addRegExp(regExp: RegExp): NoteContentActionBuilder {
        this.regExpList.push(regExp);
        return this;
    }

    public addInlineRegexStandard(columnId: string): NoteContentActionBuilder {
        return this.addRegExp(RegExp(`^(${this.baseInlineRegex(columnId)})(.*$)`, 'gm'));
    }

    public addInlineRegexParenthesis(columnId: string): NoteContentActionBuilder {
        const parenthesisInlineContent = `^(.*)([\\[(]{1})(${this.baseInlineRegex(columnId)})(.*)([)\\]]{1})(.*$)`
        return this.addRegExp(new RegExp(parenthesisInlineContent, 'gm'));
    }

    public addRegExpNewValue(regExpNewValue: string): NoteContentActionBuilder {
        this.regExpNewValue.push(regExpNewValue);
        return this;
    }

    public build(): NoteContentAction {
        this.validate();
        return {
            action: this.action,
            file: this.file,
            content: this.content,
            regexp: this.regExpList,
            newValue: this.regExpNewValue
        };
    }

    public isContentEditable(): boolean {
        return this.regExpList.some((regExp) => {
            return regExp.test(this.content);
        });
    }

    private validate(): void {
        if (this.file === undefined) {
            throw "Error: file is not defined";
        }

        if (this.action === undefined) {
            throw "Error: action is not defined";
        }

        if (this.regExpList.length === 0) {
            throw "Error: regexp is not defined";
        }
    }

    private baseInlineRegex(columnId: string) {
        const wrappererKey = `_\\*~\``;
        const baseInlineContent = `[${wrappererKey}]{0,2}${columnId}[${wrappererKey}]{0,2}[:]{2}`;
        return baseInlineContent;
    }
}