import { RowDataType, NormalizedPath, TableColumn } from 'cdm/FolderModel';
import { Notice, TFile } from 'obsidian';
import { LOGGER } from "services/Logger";
import NoteInfo from 'services/NoteInfo';
import { DatabaseCore, SourceDataTypes } from "helpers/Constants";
import { generateDataviewTableQuery } from 'helpers/QueryHelper';
import { DataviewService } from 'services/DataviewService';
import { Literal } from 'obsidian-dataview/lib/data-model/value';
import { DataArray } from 'obsidian-dataview/lib/api/data-array';
import { LocalSettings } from 'cdm/SettingsModel';
import { NoteInfoPage } from 'cdm/DatabaseModel';
import { tableFilter } from '@features/filters';
import { FilterSettings } from '@features/filters/model/FiltersModel';


const noBreakSpace = /\u00A0/g;

/**
 * Check if content has frontmatter
 * @param data 
 * @returns 
 */
export function hasFrontmatter(data: string): boolean {
  if (!data) return false;

  const frontmatterRegex = /^---[\s\S]+?---/g;
  return frontmatterRegex.test(data);
}

/** Check if file is a database note */
export function isDatabaseNote(data: string | TFile) {
  if (data instanceof TFile) {
    if (!data) return false;

    const cache = app.metadataCache.getFileCache(data);

    return !!cache?.frontmatter && !!cache?.frontmatter[DatabaseCore.FRONTMATTER_KEY];
  } else {
    const match = data.match(/---\s+([\w\W]+?)\s+---/);

    if (!match) {
      return false;
    }

    if (!match[1].contains(DatabaseCore.FRONTMATTER_KEY)) {
      return false;
    }

    return true;
  }
}

export function getNormalizedPath(path: string): NormalizedPath {
  const stripped = path.replaceAll("[", "").replaceAll("]", "").replace(noBreakSpace, ' ').normalize('NFC');

  // split on first occurance of '|'
  // "root#subpath##subsubpath|alias with |# chars"
  //             0            ^        1
  const splitOnAlias = stripped.split(/\|(.*)/);

  // split on first occurance of '#' (in substring)
  // "root#subpath##subsubpath"
  //   0  ^        1
  const splitOnHash = splitOnAlias[0].split(/#(.*)/);

  return {
    root: splitOnHash[0],
    subpath: splitOnHash[1] ? '#' + splitOnHash[1] : '',
    alias: splitOnAlias[1] || '',
  };
}

/**
 * With the use of Dataview and the folder path, we can obtain an array of rows
 * @param folderPath 
 * @returns 
 */
export async function adapterTFilesToRows(dbFile: TFile, columns: TableColumn[], ddbbConfig: LocalSettings, filters: FilterSettings): Promise<Array<RowDataType>> {
  const folderPath = dbFile.parent.path;
  LOGGER.debug(`=> adapterTFilesToRows.  folderPath:${folderPath}`);
  const rows: Array<RowDataType> = [];

  let folderFiles = await sourceDataviewPages(ddbbConfig, folderPath, columns);
  folderFiles = folderFiles.where((p: NoteInfoPage) => p.file.path !== dbFile.path);
  // Config filters asociated with the database
  if (filters.enabled && filters.conditions.length > 0) {
    folderFiles = folderFiles.where(p => tableFilter(filters.conditions, p, ddbbConfig));
  }
  folderFiles.map((page: NoteInfoPage) => {
    const noteInfo = new NoteInfo(page);
    rows.push(noteInfo.getRowDataType(columns));
  });

  LOGGER.debug(`<= adapterTFilesToRows.  number of rows:${rows.length}`);
  return rows;
}

export async function obtainAllPossibleRows(folderPath: string, ddbbConfig: LocalSettings, filters: FilterSettings, columns: TableColumn[]): Promise<Array<RowDataType>> {
  LOGGER.debug(`=> obtainAllPossibleRows.  folderPath:${folderPath}`);
  const rows: Array<RowDataType> = [];
  let folderFiles = await sourceDataviewPages(ddbbConfig, folderPath, columns);
  // Config filters asociated with the database
  if (filters.enabled && filters.conditions.length > 0) {
    folderFiles = folderFiles.where(p => tableFilter(filters.conditions, p, ddbbConfig));
  }
  folderFiles.map((page: NoteInfoPage) => {
    const noteInfo = new NoteInfo(page);
    rows.push(noteInfo.getAllRowDataType());
  });

  LOGGER.debug(`<= obtainAllPossibleRows.  number of rows:${rows.length}`);
  return rows;
}

export async function sourceDataviewPages(ddbbConfig: LocalSettings, folderPath: string, columns?: TableColumn[]): Promise<DataArray<Record<string, Literal>>> {
  let pagesResult: DataArray<Record<string, Literal>>;
  try {
    switch (ddbbConfig.source_data) {
      case SourceDataTypes.TAG:
        pagesResult = obtainPagesResult(`${ddbbConfig.source_form_result.split(',').join(' OR ')}`);
        break;
      case SourceDataTypes.INCOMING_LINK:
        pagesResult = obtainPagesResult(`[[${ddbbConfig.source_form_result}]]`);
        break;
      case SourceDataTypes.OUTGOING_LINK:
        pagesResult = obtainPagesResult(`outgoing([[${ddbbConfig.source_form_result}]])`);
        break;
      case SourceDataTypes.QUERY_JS:
        pagesResult = obtainPagesResult(ddbbConfig.source_form_result);
        break;
      case SourceDataTypes.QUERY:
        pagesResult = await obtainQueryResult(
          generateDataviewTableQuery(
            columns,
            ddbbConfig.source_form_result)
        );
        break;

      case SourceDataTypes.CURRENT_FOLDER_WITHOUT_SUBFOLDERS:
        if (!folderPath || folderPath === '/') {
          pagesResult = DataviewService.getDataviewAPI().pages()
            .where((p: NoteInfoPage) => !p.file.folder);
        } else {
          pagesResult = DataviewService.getDataviewAPI().pages(`"${folderPath}"`)
            .where((p: NoteInfoPage) => p.file.folder === folderPath);
        }
        break;
      default:
        pagesResult = DataviewService.getDataviewAPI().pages(`"${folderPath}"`);
    }
  } catch (error) {
    const msg = `Error obtaining pages result. Current folder loaded instead`;
    LOGGER.error(msg, error);
    new Notice(msg, 4000);
    pagesResult = DataviewService.getDataviewAPI().pages(`"${folderPath}"`);
  }
  return pagesResult;
}

function obtainPagesResult(pageQuery: string): DataArray<Record<string, Literal>> {
  return DataviewService.getDataviewAPI().pages(pageQuery);
}

async function obtainQueryResult(query: string): Promise<DataArray<Record<string, Literal>>> {
  const result = await DataviewService.getDataviewAPI().query(query);
  if (!result.successful || result.value.type !== 'table') {
    throw new Error(`Query ${query} failed`);
  }
  const arrayRecord: Record<string, Literal>[] = [];
  const headers = result.value.headers;
  result.value.values.forEach((row: any) => {
    const recordResult: Record<string, Literal> = {};
    headers.forEach((header: any, index: any) => {
      recordResult[header] = row[index];
    })
    arrayRecord.push(recordResult);
  });
  return DataviewService.getDataviewAPI().array(arrayRecord);
}

export function obtainCellFromFile(path: string, column: TableColumn): Literal {
  const page = DataviewService.getDataviewAPI().page(path) as NoteInfoPage;
  const noteInfo = new NoteInfo(page);
  const uniqueRowValue = noteInfo.getRowDataType([column]);
  return uniqueRowValue[column.id] as Literal;
}
