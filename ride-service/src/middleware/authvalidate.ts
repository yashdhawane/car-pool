import { NextFunction,Request,Response } from "express";

import { logger } from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
export const authenticateRequest = (req:Request, res:Response, next:NextFunction) => {
  const userId = req.headers["x-user-id"];
  const userRole = req.headers["x-user-role"];
  const userEmail = req.headers["x-user-email"];
  const userName = req.headers["x-user-name"];

  if (!userId) {
    logger.warn(`Access attempted without user ID`);
    return res.status(401).json({
      success: false,
      message: "Authencation required! Please login to continue",
    });
  }
  logger.info(`ride middleware:-User ID: ${userId} | Role: ${userRole} | Email: ${userEmail} | Name: ${userName}`);
  req.user = { userId };
  req.user.role = userRole;
  req.user.email = userEmail;
  req.user.name = userName;
  next();
};

