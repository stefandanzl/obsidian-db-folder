import { CellContext, Table } from "@tanstack/react-table";
import { RowDataType } from "cdm/FolderModel";
import { Literal } from "obsidian-dataview/lib/data-model/value";
import { AtomicFilter } from "cdm/SettingsModel";

export type RowSelectOption = {
    backgroundColor: string,
    label: string,
}

export type CellComponentProps = {
    defaultCell: CellContext<RowDataType, Literal>;
}

export type EditorCellComponentProps = {
    persistChange: (changedValue: string) => void;
    textCell: string;
} & CellComponentProps;

export type DataviewFiltersProps = {
    table: Table<RowDataType>;
};
export type AtomicFilterComponentProps = {
    recursiveIndex: number[];
    level: number;
    atomicFilter: AtomicFilter;
    possibleColumns: string[];
} & DataviewFiltersProps;