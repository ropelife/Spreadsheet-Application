import { Result, okResult, errResult } from 'cs544-js-utils';

import * as mongo from 'mongodb';

/** All that this DAO should do is maintain a persistent map from
 *  [spreadsheetName, cellId] to an expression string.
 *
 *  Most routines return an errResult with code set to 'DB' if
 *  a database error occurs.
 */

interface SpreadSheetCell {
  cellId : string;
  expr: string;
}

type SCell = SpreadSheetCell & { _id?: mongo.ObjectId };

/** return a DAO for spreadsheet ssName at URL mongodbUrl */
export async function
makeSpreadsheetDao(mongodbUrl: string, ssName: string)
  : Promise<Result<SpreadsheetDao>> 
{
  return SpreadsheetDao.make(mongodbUrl, ssName);
}

export class SpreadsheetDao {

  private client: mongo.MongoClient;
  private spreadSheet: mongo.Collection;
  private ssName: string;
  
  constructor(params: { [key: string]: any }) {
    this.client = params.client;
    this.spreadSheet = params.spreadSheet;
    this.ssName = params.ssName;
  }
  
  //factory method
  static async make(dbUrl: string, ssName: string)
    : Promise<Result<SpreadsheetDao>>
  {
    const params: { [key: string]: any } = {};
    try {
      params.client = await (new mongo.MongoClient(dbUrl)).connect();
      const db = params.client.db();
      const spreadSheet = db.collection(ssName);
      params.spreadSheet = spreadSheet;
      params.ssName = ssName;
      await spreadSheet.createIndex('cellId');
      return okResult(new SpreadsheetDao(params));
    }
    catch (error) {
      return errResult(error.message, 'DB');
    }
  }

  /** Release all resources held by persistent spreadsheet.
   *  Specifically, close any database connections.
   */
  async close() : Promise<Result<undefined>> {
    //TODO
    try {
      await this.client.close();
      return okResult(undefined);
    }
    catch (e) {
      return errResult(e.message, 'DB');
    }  
  }

  /** return name of this spreadsheet */
  getSpreadsheetName() : string {
    //TODO
    const name = this.ssName;
    return name;
  }

  /** Set cell with id cellId to string expr. */
  async setCellExpr(cellId: string, expr: string)
    : Promise<Result<undefined>>
  {
    try {
      const queryRes = await this.query(cellId);
      //console.log('queryRes: '+JSON.stringify(queryRes));
      if(queryRes.isOk)
      {
        if(queryRes.val === '')
        {
          const dbObj = { cellId, expr };
          try {
            const collection = this.spreadSheet;
            await collection.insertOne(dbObj);
	    return okResult(undefined);
          }
          catch (e) {
            return errResult(e.message, 'DB');
          }
        }
        return okResult(undefined);
      }
      else{
        return errResult(undefined);
      }
    }
    catch (e){
      return errResult(e.message, 'DB');
    }
  }

  /** Return expr for cell cellId; return '' for an empty/unknown cell.
   */
   async query(cellId: string) : Promise<Result<string>> {
    try {
      const collection = this.spreadSheet;
      //console.log(cellId);
      const filter = {cellId : {$eq:cellId} };
      const cursor = await collection.find(filter);
      // console.log('cursor: '+cursor);
      const dbEntries = await cursor
            .sort({cellId: 1}).toArray();
     // console.log(JSON.stringify(dbEntries));
     if(dbEntries.length>0){
        const entries = dbEntries.map((d : any) => {
          const e = { ...(d as SCell)  };
          delete e._id, cellId;
          return e.expr;
              });
        return okResult(entries[0]); 
      } else {
        return okResult('');
      }
    }
    catch (e) {
      return errResult(e.message, 'DB');
    }
  }

  /** Clear contents of this spreadsheet */

  async clear() : Promise<Result<undefined>> {
    try {
      await this.spreadSheet.deleteMany({});
      return okResult(undefined);
    }
    catch (e) {
      return errResult(e.message, 'DB');
    }
  }

  /** Remove all info for cellId from this spreadsheet. */
  async remove(cellId: string) : Promise<Result<undefined>> {
    try {
      const collection = this.spreadSheet;
      const delResult = await collection.deleteOne({cellId});
      if (!delResult) 
      {
        return errResult(`unexpected falsy DeleteResult`, {code: 'DB'});
      }
      else {
        return okResult(undefined);
      }
    }
    catch (e) {
      return errResult(e.message, 'DB');
    }
  }

  /** Return array of [ cellId, expr ] pairs for all cells in this
   *  spreadsheet
   */
  async getData() : Promise<Result<[string, string][]>> {
    //TODO
    try {
      const collection = this.spreadSheet;
      const documents = await collection.find().toArray();
      if(documents)
      {
	//console.log(documents);
        const dataResult = documents.map((data: any) => [data.cellId, data.expr]);
       // console.log(dataResult);
	const resData: [string, string][] = dataResult.map((inArray : any) => [
          inArray[0],
          inArray[1].replace(/(\S)/g, '$1'),
        ]);

        return okResult(resData);
      }
      else{
        return errResult(`unexpected falsy GetDataResult`, {code: 'DB'}); 
      }
    }
    catch (e) {
      return errResult(e.message, 'DB');
    }
  }
}




