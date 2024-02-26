import {default as parse, CellRef, Ast } from './expr-parser.js';

import { Result, okResult, errResult } from 'cs544-js-utils';

//factory method
export default async function makeSpreadsheet(name: string) :
  Promise<Result<Spreadsheet>>
{
  return okResult(new Spreadsheet(name));
}

type Updates = { [cellId: string]: number };

export class Spreadsheet {

  readonly name: string;
  cells: { [cellId: string]: CellInfo };
  
  constructor(name: string) {
    this.name = name;
    this.cells = {};
  }

  async eval(cellId: string, expr: string) : Promise<Result<Updates>> {
    //console.log('CellID: '+cellId);
    //console.log('EXPR: '+expr);

   // const cellInfo = this.cells[cellId];

    let parseRes : Result<Ast> = parse(expr, cellId);
    let ast: Ast;

    //console.log(JSON.stringify(parseRes));

    if(!parseRes.isOk)
    {
      return parseRes;
    } else{
      ast = parseRes.val;
    }

    console.log(JSON.stringify(ast, null, 2));
   
    //const kind = ast.kind;

    var dependents = new Set();

    var splitExpr : string[] = expr.split(" ");

    for (const a of splitExpr)
    {
      if(a === cellId)
      {
	       const msg =`circular ref involving ${cellId}`;
        return errResult(msg, 'CIRCULAR_REF');
      }
      else if (a.match(/[a-zA-Z][0-9]+/))
      {
        dependents.add(a);
      }
    }
    //console.log('dependents:' +dependents);


    var value : number  = this.evaluateAst(ast, cellId);

    var backup : CellInfo = this.cells[cellId];

    this.cells[cellId] = new CellInfo(cellId, expr, ast, value, dependents);

    let updates: Updates = {};

    for (const id in this.cells) {
      if (this.cells.hasOwnProperty(id)) {
        const cellInfo = this.cells[id];
        if(cellInfo.dependents.has(cellId))
        {
	if(this.cells[cellId].dependents.has(id))
         {
		this.cells[cellId] = backup;
		const msg = `circular ref involving ${cellId}`;
            return errResult(msg, 'CIRCULAR_REF');

          }
          const result = await this.eval(id, cellInfo.expr);
       	   if(result.isOk)
          {
            for (const [key, val] of Object.entries(result.val)) {
              updates[key] = Number(val);
            } 
          }
       	}
       // console.log(`Cell ID: ${cellId}`);
       // console.log(`Cell Info:`, cellInfo);
      }
    }  
    updates[cellId] = value;
    return okResult(updates); //initial dummy result
  }
    
  evaluateAst(ast: Ast, baseCellId : string = 'A1')
  {
  if(ast === undefined)
    {
      return 0;
    }
    switch(ast.kind){
      case 'num':
        return ast.value;
      case 'app':
	let result : number = -1;
        if (ast.hasOwnProperty("kids")) {
          if(ast.kids.length == 1)
          {
            result = FNS[ast.fn](0, this.evaluateAst(ast.kids[0], baseCellId));
          }
          else{
            result = FNS[ast.fn](this.evaluateAst(ast.kids[0], baseCellId), this.evaluateAst(ast.kids[1], baseCellId));
          }
        }
        return result;
       case 'ref':
        let cellVal : string;
        let baseCellRefRes : CellRef;
	//console.log('BASECELLID:' +baseCellId);
        const baseCellRef : Result<CellRef> = CellRef.parse(baseCellId);
        //console.log('baseCellRef:' +JSON.stringify(baseCellRef));
	if(!baseCellRef.isOk)
        {
          return -1; 
        }
        else{
          baseCellRefRes = baseCellRef.val;
          //console.log('baseCellRefRes: '+JSON.stringify(baseCellRefRes));
	  cellVal = ast.toText(baseCellRefRes);
          //console.log(cellVal);
	  if(this.cells[cellVal] === undefined)
          {
            return 0;
          }
	  //console.log(JSON.stringify(this.cells[cellVal]));
	}
         return this.cells[cellVal].value;
       default:
	return -1;
    }
  }
}

class CellInfo{
  id: string;
  expr: string;
  ast: Ast;
  value: number;
  dependents = new Set();
  constructor(id: string, expr: string, ast: Ast, value: number, dependents = new Set()) {
    this.id = id;
    this.expr = expr;
    this.ast = ast;
    this.value = value;
    this.dependents = dependents;
  }
}

const FNS = {
  '+': (a:number, b:number) : number => a + b,
  '-': (a:number, b?:number) : number => b === undefined ? -a : a - b,
  '*': (a:number, b:number) : number => a * b,
  '/': (a:number, b:number) : number => a / b,
  min: (a:number, b:number) : number => Math.min(a, b),
  max: (a:number, b:number) : number => Math.max(a, b),
}
