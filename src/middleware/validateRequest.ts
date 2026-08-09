import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

const validateRequest = (schema: ZodType<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const message = result.error.issues[0]?.message || "Validation failed";
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message,
        errorDetails: result.error.issues,
      });
    }
    req.body = result.data;
    next();
  };
};

export default validateRequest;
