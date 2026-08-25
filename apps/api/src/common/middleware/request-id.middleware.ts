import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

export interface RequestWithId extends Request {
  id?: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    const existingId = req.header(REQUEST_ID_HEADER);
    const requestId = existingId || randomUUID();
    req.id = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
