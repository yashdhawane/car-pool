import { logger } from "../utils/logger";
import { Request, Response, NextFunction } from "express";

 export const errorHandler = (err: { message: string; stack: any; status: any; }, req:Request, res:Response, next:NextFunction) => {
    logger.error(err.message, { stack: err.stack, service: 'identity-service' });

    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
    });
}