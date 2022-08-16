import { TableColumn } from "cdm/FolderModel";
import { ColumnsState } from "cdm/TableStateInterface";
import { ColumnSettingsManager } from "components/modals/columnSettings/ColumnSettingsModal";
import { AddColumnModalManager } from "components/modals/newColumn/addColumnModal";
import { FilterSettings, LocalSettings } from "cdm/SettingsModel";

/**
 * Base class for all modal responses.
 */
type BaseModalHandlerResponse = {
    containerEl: HTMLElement;
};

/**
 * Response for the ColumnSettingsModal.
 * @extends BaseModalHandlerResponse
 */
export type ColumnSettingsHandlerResponse = {
    column: TableColumn,
    columnSettingsManager: ColumnSettingsManager
} & BaseModalHandlerResponse


export type AddColumnModalProps = {
    columnsState: Partial<ColumnsState>;
    ddbbConfig: LocalSettings,
    filters: FilterSettings
}
/**
 * Response for the AddColumnModal.
 * @extends BaseModalHandlerResponse
 */
export type AddColumnModalHandlerResponse = {
    addColumnModalManager: AddColumnModalManager,
} & BaseModalHandlerResponse