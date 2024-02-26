import SpreadsheetWs from './ss-ws.js';

import { Result, okResult,Err, errResult } from 'cs544-js-utils';

import { Errors, makeElement } from './utils.js';

const [N_ROWS, N_COLS] = [10, 10];

export default async function make(ws: SpreadsheetWs, ssName: string) {
  return await Spreadsheet.make(ws, ssName);
}


class Spreadsheet {

  private readonly ws: SpreadsheetWs;
  private readonly ssName: string;
  private readonly errors: Errors;
  private element: HTMLElement;
  private copyelem: string|null;
  //TODO: add more instance variables
  
  constructor(ws: SpreadsheetWs, ssName: string) {
    this.ws = ws; this.ssName = ssName;
    this.errors = new Errors();
    this.makeEmptySS();
    this.addListeners();
    this.element = document.createElement('div');
    this.copyelem = null;
    //TODO: initialize added instance variables
  }

  static async make(ws: SpreadsheetWs, ssName: string) {
    const ss = new Spreadsheet(ws, ssName);
    await ss.load();
    return ss;
  }

  /** add listeners for different events on table elements */
  private addListeners() {
    //TODO: add listeners for #clear and .cell
    const ssForm = document.querySelector('#clear')! as HTMLFormElement;
    const nodeList = document.querySelectorAll(".cell");
    ssForm.addEventListener('click', async ev => {
      ev.preventDefault();
      await this.clearSpreadsheet(ev);
    });
    [...nodeList].forEach(element => {
      // console.log("Element: "+element);
      element.addEventListener('click', async ev => {
        this.blurCell(ev);
        this.focusCell(ev);
      });
    });
    [...nodeList].forEach(element => {
      element.addEventListener('copy', async ev =>{
        this.copyCell(ev);
      });
    });
    [...nodeList].forEach(element => {
      element.addEventListener('paste', async ev =>{
        this.pasteCell(ev);
      });
    });
  }

  /** listener for a click event on #clear button */
  private readonly clearSpreadsheet = async (ev: Event) => {
    //TODO
    try{
      const nodeList = document.querySelectorAll(".cell");
      [...nodeList].forEach(element => {
        // console.log("Element: "+element);
        element.innerHTML = "";
      });
      const res = await this.ws.clear(this.ssName);
      if(res.isOk)
      {
        console.log("spreadsheet data cleared");
      } else {
        throw res;
      }
    } catch(err)
    {
      // console.log(err);
      const msg = err.errors[0].message;
      this.errors.display([new Err(msg, { code: err.errors[0].options.code?err.errors[0].options.code:'BAD_REQ'} )]);
    }
    
  };

  /** listener for a focus event on a spreadsheet data cell */
  private readonly focusCell = (ev: Event) => {
    //TODO
    const elem = ev.target as HTMLElement;
    this.element = elem;
    elem.textContent = elem.dataset.expr? elem.dataset.expr : "";
  };
  
  /** listener for a blur event on a spreadsheet data cell */
  private readonly blurCell = async (ev: Event) => {
    //TODO
    // const nodeList = document.querySelectorAll(".cell");
    // [...nodeList].forEach(element => {
    //   console.log("Element:"+element);
    //   if(element.hasAttribute('data-value'))
    //   {
    //     element.textContent = element.getAttribute('data-value');
    //   }
    //   else {
    //     element.textContent = "";
    //   }
    // })
    try{
      if(this.element.hasAttribute("id"))
      {

        if(this.element.hasAttribute('data-value')&& this.element.hasAttribute('data-expr'))
        {
          // console.log("innerHTML->"+this.element.innerHTML);
          // console.log("elementGetattr-->"+this.element.getAttribute("data-expr"));
          if(this.element.innerHTML !== this.element.getAttribute("data-expr")){
            if(this.element.innerHTML ==""){
              // console.log("Inside blur inner html empty");
              const cellId = this.element.getAttribute("id");
              const expr = this.element.getAttribute("data-expr");
              this.element.setAttribute('data-expr',expr?expr:"") ;
              const res = await this.ws.remove(this.ssName,cellId?cellId:"");
              if(res.isOk){
                for(const [cellId] of Object.entries(res.val)){
                const cellAttr = document.querySelector('#'+cellId);
                if(cellAttr){
                  cellAttr.setAttribute('data-value', res.val[cellId].toString());
                  // cellAttr.setAttribute('data-expr', expr?expr:"");
                  cellAttr.textContent = res.val[cellId].toString();
                }
              }
              }else {
                this.element.textContent = this.element.getAttribute('data-value')?this.element.getAttribute('data-value'):"";
                throw res;
              }
            }else{
              // console.log("inside blur else");
              const cellId = this.element.getAttribute("id");
              const expr = this.element.innerHTML;
              // console.log("innerHtml-> "+expr+" text context-> "+ this.element.textContent);
              
              const res = await this.ws.evaluate(this.ssName,cellId?cellId:"",expr?expr:"");
              if(res.isOk){
          // console.log("RES:"+JSON.stringify(res));	 
            this.element.setAttribute('data-expr',expr?expr:"") ;   
                for(const [cellId] of Object.entries(res.val)){
                const cellAttr = document.querySelector('#'+cellId);
                if(cellAttr){
                  cellAttr.setAttribute('data-value', res.val[cellId].toString());
                  // cellAttr.setAttribute('data-expr', expr?expr:"");
                  cellAttr.textContent = res.val[cellId].toString();
                }
              }
              } else{
                this.element.textContent = this.element.getAttribute('data-value')?this.element.getAttribute('data-value'):"";
                throw res;
              }
            }
          }
          this.element.textContent = this.element.getAttribute('data-value');
        } else if(this.element.innerHTML!=="")
      {
        // console.log("inside elif innner html empty");
        const cellId = this.element.getAttribute("id");
        const expr = this.element.innerHTML;
        
        const res = await this.ws.evaluate(this.ssName,cellId?cellId:"",expr?expr:"");
        if(res.isOk){
          // console.log("RES in elif:"+JSON.stringify(res));	 
          this.element.setAttribute('data-expr',expr?expr:"") ;   
          for(const [cellId] of Object.entries(res.val)){
          const cellAttr = document.querySelector('#'+cellId);
          if(cellAttr){
            cellAttr.setAttribute('data-value', res.val[cellId].toString());
            // cellAttr.setAttribute('data-expr', expr?expr:"");
            cellAttr.textContent = res.val[cellId].toString();
          }
        }
        } else {
          this.element.textContent = this.element.getAttribute('data-value')?this.element.getAttribute('data-value'):"";
          throw res;
        }
      }
      else {
        // console.log("Entered last else");
          this.element.textContent = "";
        }
        this.element = document.createElement('div');
      }
    }catch(err)
    {
      // console.log(err);
      const msg = err.errors[0].message;
      this.errors.display([new Err(msg, { code: err.errors[0].options.code?err.errors[0].options.code:'BAD_REQ'} )]);
    }
    
  };
  
  /** listener for a copy event on a spreadsheet data cell */
  private readonly copyCell = (ev: Event) => {
    //TODO
      const elem = ev.target as HTMLElement;
      // console.log('inside copy:'+ elem);
      this.copyelem = elem.getAttribute('id');
      // window.screen = sourceCellId;
      elem.classList.add("is-copy-source");
  };

  /** listener for a paste event on a spreadsheet data cell */
  private readonly pasteCell = async (ev: Event) => {
    //TODO
    const elem = ev.target as HTMLElement;
    const destinationCellId = elem.getAttribute('id');
    // console.log("DestinationId:",destinationCellId);
    // console.log("copyelem:",this.copyelem );
    try{
    if (this.copyelem !== null) {
      const sourcelem = this.copyelem;
      const res = await this.ws.copy(this.ssName, destinationCellId?destinationCellId:"", sourcelem?sourcelem:"");
      
      document.querySelector(".is-copy-source")?.classList.remove("is-copy-source");
      if(res.isOk){
        // console.log("RES in paste:"+JSON.stringify(res));	    
        for(const [cellId] of Object.entries(res.val)){
        const cellAttr = document.querySelector('#'+cellId);
        if(cellAttr){
          cellAttr.setAttribute('data-value', res.val[cellId].toString());
          // cellAttr.setAttribute('data-expr', expr?expr:"");
          // cellAttr.textContent = exprDest.val.expr;
        }
      }
      } else {
        elem.textContent = elem.getAttribute('data-value')?elem.getAttribute('data-value'):"";
        throw res;
      }
      
      const exprDest = await this.ws.query(this.ssName,destinationCellId?destinationCellId:"");
      if(exprDest.isOk){
        // console.log("RES in exprdest:"+JSON.stringify(exprDest));	    
        elem.setAttribute('data-value', exprDest.val.value.toString());
        elem.setAttribute('data-expr', exprDest.val.expr);
        elem.textContent = exprDest.val.expr;
        // console.log('checking destid and expr'+destinationCellId+" "+exprDest.val.expr);
        const res = await this.ws.evaluate(this.ssName,destinationCellId?destinationCellId:"",exprDest.val.expr?exprDest.val.expr:"");
        if(res.isOk){
          // console.log("RES in paste eval:"+JSON.stringify(res));	    
          for(const [cellId] of Object.entries(res.val)){
          const cellAttr = document.querySelector('#'+cellId);
          if(cellAttr){
            cellAttr.setAttribute('data-value', res.val[cellId].toString());
            // cellAttr.setAttribute('data-expr', expr?expr:"");
            //cellAttr.textContent = exprDest.val.expr;
          }
        }
        } else {
          elem.textContent = elem.getAttribute('data-value')?elem.getAttribute('data-value'):"";
          throw res;
        }
      } else {
        elem.textContent = elem.getAttribute('data-value')?elem.getAttribute('data-value'):"";
        throw res;
      }
      // console.log("outside If"+ this.copyelem);
    }
    this.copyelem = null;
    } catch(err)
    {
      // console.log(err);
      const msg = err.errors[0].message;
      this.errors.display([new Err(msg, { code: err.errors[0].options.code?err.errors[0].options.code:'BAD_REQ'} )]);
    }
  };

  /** Replace entire spreadsheet with that from the web services.
   *  Specifically, for each active cell set its data-value and 
   *  data-expr attributes to the corresponding values returned
   *  by the web service and set its text content to the cell value.
   */
  /** load initial spreadsheet data into DOM */
  private async load() {
    //TODO
    try{
      const res_dump = await this.ws.dumpWithValues(this.ssName);
      if(res_dump.isOk){
        // console.log(res_dump);
        for(const [cellId, expr, val] of res_dump.val){
          const cellAttr = document.querySelector('#'+cellId);
          if(cellAttr){
            cellAttr.setAttribute('data-value', val.toString());
            cellAttr.setAttribute('data-expr', expr.toString());
            cellAttr.textContent = val.toString();
          }
        }
      }else{
        throw res_dump;
      }      
    } catch(err){
      // console.log(err);
      const msg = err.errors[0].message;
      this.errors.display([new Err(msg, { code: err.errors[0].options.code?err.errors[0].options.code:'BAD_REQ'} )]);
    }
  }

  
  private makeEmptySS() {
    const ssDiv = document.querySelector('#ss')!;
    ssDiv.innerHTML = '';
    const ssTable = makeElement('table');
    const header = makeElement('tr');
    const clearCell = makeElement('td');
    const clear = makeElement('button', {id: 'clear', type: 'button'}, 'Clear');
    clearCell.append(clear);
    header.append(clearCell);
    const A = 'A'.charCodeAt(0);
    for (let i = 0; i < N_COLS; i++) {
      header.append(makeElement('th', {}, String.fromCharCode(A + i)));
    }
    ssTable.append(header);
    for (let i = 0; i < N_ROWS; i++) {
      const row = makeElement('tr');
      row.append(makeElement('th', {}, (i + 1).toString()));
      const a = 'a'.charCodeAt(0);
      for (let j = 0; j < N_COLS; j++) {
	const colId = String.fromCharCode(a + j);
	const id = colId + (i + 1);
	const cell =
	  makeElement('td', {id, class: 'cell', contentEditable: 'true'});
	row.append(cell);
      }
      ssTable.append(row);
    }
    ssDiv.append(ssTable);
  }

}