import cors from 'cors';
import Express from 'express';
import bodyparser from 'body-parser';
import assert from 'assert';
import STATUS from 'http-status';

import { Result, okResult, errResult, Err, ErrResult } from 'cs544-js-utils';

import { SpreadsheetServices as SSServices } from 'cs544-prj2-sol';

import { SelfLink, SuccessEnvelope, ErrorEnvelope }
  from './response-envelopes.js';

export type App = Express.Application;


export function makeApp(ssServices: SSServices, base = '/api')
  : App
{
  const app = Express();
  app.locals.ssServices = ssServices;
  app.locals.base = base;
  const routes = ROUTES;
  setupRoutes(app, routes);
  return app;
}

/******************************** Routing ******************************/

const CORS_OPTIONS = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  exposedHeaders: 'Location',
};

function setupRoutes(app: Express.Application, routes: Route[]) {
  const base = app.locals.base;
  app.use(cors(CORS_OPTIONS));  //will be explained towards end of course
  app.use(Express.json());  //all request bodies parsed as JSON.
  //routes for individual cells
  //TODO
  // app.use(`/get`,makeSpreadsheetDataHandler(app))
  // app.use(`${base}/:ssName/:cellId`, makeGetHandler(app));
  // app.use(`${base}/:ssName`, makeSpreadsheetGetDataHandler(app))

  //routes for entire spreadsheets
  //TODO
  for (const route of routes) {
    const { method, relPath, handler, rel } = route;
    const absPath = `${base}/${relPath}`;
    const handlers =
    [ handler(app), ];
    app[method](absPath, ...handlers);
  }

  //generic handlers: must be last
  app.use(make404Handler(app));
  app.use(makeErrorsHandler(app));
}

/* A handler can be created by calling a function typically structured as
   follows:*/
/****************** Handlers for Spreadsheet Cells *********************/

//TODO
/* Get entire spreadsheet data */
function doGetSpreadSheetDataHandler(app: Express.Application) {
  return async function(req: Express.Request, res: Express.Response) {
    try {
      const { ssName } = req.params;
      const result = await app.locals.ssServices.dump(ssName);
      if (!result.isOk) throw result;
      res.json(selfResult(req, result.val));      
      }
      catch(err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

/* Get-Cell: GET BASE/SS_NAME/CELL_ID */
function doGetCellHandler(app: Express.Application) {
  return async function(req: Express.Request, res: Express.Response) {
    try {
      const { ssName, cellId } = req.params; //if needed
      //  const { QUERY_PARAM1, ... } = req.query;  //if needed
      //  VALIDATE_IF_NECESSARY();
      const result = await app.locals.ssServices.query(ssName, cellId);
      if (!result.isOk) throw result;
      res.json(selfResult(req, result.val));      
      }
      catch(err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

/* Set & Copy Cell: PATCH BASE/SS_NAME/CELL_ID?expr=EXPR */
function doSetAndCopyCellHandler(app: Express.Application) {
  return async function(req: Express.Request, res: Express.Response) {
    try {
      if (Object.keys(req.query).length === 0) {
        const result = {
        status: STATUS.BAD_REQUEST,
        errors: [	{ options: { code: 'BAD_REQ' }, }, ],
        };
        res.status(500).json(result);
      }
      else{
        if(req.query.hasOwnProperty('expr') && req.query.hasOwnProperty('srcCellId'))
        {
          const result = {
          status: STATUS.BAD_REQUEST,
          errors: [	{ options: { code: 'BAD_REQ' }, }, ],
          };
          res.status(500).json(result);
        } else {
          const { ssName, cellId } = req.params;
          if(req.query.expr)
          { 
            const {expr} = req.query;
            const result = await app.locals.ssServices.evaluate(ssName, cellId, expr);
            if (!result.isOk) throw result;
            res.json(selfResult(req, result.val)); 
          }
          else {
            const {srcCellId} = req.query;
            const result = await app.locals.ssServices.copy(ssName, cellId, srcCellId);
            if (!result.isOk) throw result;
            res.json(selfResult(req, result.val)); 
          }
        }
      }
    }
    catch(err) {
    const mapped = mapResultErrors(err);
    res.status(mapped.status).json(mapped);
  }
  };
}

/* Delete-Cell: DELETE BASE/SS_NAME/CELL_ID */
function doDeleteCellHandler(app: Express.Application) {
  return async function(req: Express.Request, res: Express.Response) {
    try {
      const { ssName, cellId } = req.params;
      const result = await app.locals.ssServices.remove(ssName, cellId);
      if (!result.isOk) throw result;
      res.json(selfResult(req, result.val));
      }
      catch(err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  };
}


/**************** Handlers for Complete Spreadsheets *******************/

//TODO
/* Reload Spreadsheet data */
function doReloadSpreadSheetData(app: Express.Application) {
  return async function(req: Express.Request, res: Express.Response) {
    try {
      const { ssName } = req.params;
      const data = req.body;
      const result = await app.locals.ssServices.load(ssName, data);
      if (!result.isOk) throw result;
      res.json(selfResult(req, undefined));
      }
      catch(err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

/* Clear Spreadsheet data */
function doClearSpreadsheet(app: Express.Application) {
  return async function(req: Express.Request, res: Express.Response) {
    try {
      const { ssName } = req.params;
      const result = await app.locals.ssServices.clear(ssName);
      if (!result.isOk) throw result;
      res.json(selfResult(req, undefined));
      }
      catch(err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

/*************************** Generic Handlers **************************/

/** Default handler for when there is no route for a particular method
 *  and path.
  */
function make404Handler(app: Express.Application) {
  return async function(req: Express.Request, res: Express.Response) {
    const message = `${req.method} not supported for ${req.originalUrl}`;
    const result = {
      status: STATUS.NOT_FOUND,
      errors: [	{ options: { code: 'NOT_FOUND' }, message, }, ],
    };
    res.status(404).json(result);
  };
}


/** Ensures a server error results in nice JSON sent back to client
 *  with details logged on console.
 */ 
function makeErrorsHandler(app: Express.Application) {
  return async function(err: Error, req: Express.Request, res: Express.Response,
			next: Express.NextFunction) {
    const message = err.message ?? err.toString();
    const result = {
      status: STATUS.INTERNAL_SERVER_ERROR,
      errors: [ { options: { code: 'INTERNAL' }, message } ],
    };
    res.status(STATUS.INTERNAL_SERVER_ERROR as number).json(result);
    console.error(result.errors);
  };
}


/************************* HATEOAS Utilities ***************************/

/** Return original URL for req */
function requestUrl(req: Express.Request) {
  return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
}

function selfHref(req: Express.Request, id: string = '') {
  const url = new URL(requestUrl(req));
  return url.pathname + (id ? `/${id}` : url.search);
}

function selfResult<T>(req: Express.Request, result: T,
		       status: number = STATUS.OK)
  : SuccessEnvelope<T>
{
  return { isOk: true,
	   status,
	   links: { self: { href: selfHref(req), method: req.method } },
	   result,
	 };
}


 
/*************************** Mapping Errors ****************************/

//map from domain errors to HTTP status codes.  If not mentioned in
//this map, an unknown error will have HTTP status BAD_REQUEST.
const ERROR_MAP: { [code: string]: number } = {
  EXISTS: STATUS.CONFLICT,
  NOT_FOUND: STATUS.NOT_FOUND,
  BAD_REQ: STATUS.BAD_REQUEST,
  AUTH: STATUS.UNAUTHORIZED,
  DB: STATUS.INTERNAL_SERVER_ERROR,
  INTERNAL: STATUS.INTERNAL_SERVER_ERROR,
}

/** Return first status corresponding to first options.code in
 *  errors, but SERVER_ERROR dominates other statuses.  Returns
 *  BAD_REQUEST if no code found.
 */
function getHttpStatus(errors: Err[]) : number {
  let status: number = 0;
  for (const err of errors) {
    if (err instanceof Err) {
      const code = err?.options?.code;
      const errStatus = (code !== undefined) ? ERROR_MAP[code] : -1;
      if (errStatus > 0 && status === 0) status = errStatus;
      if (errStatus === STATUS.INTERNAL_SERVER_ERROR) status = errStatus;
    }
  }
  return status !== 0 ? status : STATUS.BAD_REQUEST;
}

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code.
 */
function mapResultErrors(err: Error|ErrResult) : ErrorEnvelope {
  const errors = (err instanceof Error) 
    ? [ new Err(err.message ?? err.toString(), { code: 'UNKNOWN' }), ]
    : err.errors;
  const status = getHttpStatus(errors);
  if (status === STATUS.SERVER_ERROR)  console.error(errors);
  return { isOk: false, status, errors, };
} 

type Handler = (req: Express.Request, res: Express.Response) => void;
type Route = {
  readonly method: 'get' | 'post' | 'delete' | 'patch' | 'put',
  readonly relPath: string,
  readonly handler: (app: App) => Handler,
  readonly rel: string,
};

const ROUTES: Route[] = [
  { method: 'get', relPath: ':ssName', handler: doGetSpreadSheetDataHandler,
    rel: 'services', },
  { method: 'get', relPath: ':ssName/:cellId', handler: doGetCellHandler,
    rel: 'services', },
  { method: 'patch', relPath: ':ssName/:cellId', handler: doSetAndCopyCellHandler,
    rel: 'update', },
  { method: 'delete', relPath: ':ssName/:cellId', handler: doDeleteCellHandler,
    rel: 'remove', },
  { method: 'put', relPath: ':ssName', handler: doReloadSpreadSheetData,
  rel: 'services', },
  { method: 'delete', relPath: ':ssName', handler: doClearSpreadsheet,
  rel: 'remove', },
];
