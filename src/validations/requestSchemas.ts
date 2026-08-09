import { z } from "zod";

const optionalString = z.string().trim().min(1, "Value cannot be empty");

export const registerSchema = z.object({
  name: optionalString.min(2, "Name must be at least 2 characters"),
  email: z.email("Please provide a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  profilePhoto: optionalString.optional(),
});

export const loginSchema = z.object({
  email: z.email("Please provide a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required").optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required").optional(),
});

export const updateProfileSchema = z.object({
  bio: z.string().trim().optional(),
  profilePhoto: z.string().trim().optional(),
});

// Blab schemas
export const createBlabSchema = z.object({
  content: z.string().trim().min(1, "Content cannot be empty").max(500, "Content cannot exceed 500 characters"),
});

export const updateBlabSchema = z.object({
  content: z.string().trim().min(1, "Content cannot be empty").max(500, "Content cannot exceed 500 characters"),
});

// Echo schemas
export const createEchoSchema = z.object({
  blabId: z.string().min(1, "Blab id is required"),
  content: z.string().trim().min(1, "Content cannot be empty").max(500, "Content cannot exceed 500 characters"),
});

export const updateEchoSchema = z.object({
  content: z.string().trim().min(1, "Content cannot be empty").max(500, "Content cannot exceed 500 characters"),
});

// Conversation schemas
export const createConversationSchema = z.object({
  recipientId: z.string().min(1, "Recipient id is required"),
});
