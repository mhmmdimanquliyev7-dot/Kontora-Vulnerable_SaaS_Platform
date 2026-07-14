import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(200)
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: passwordSchema,
  name: z.string().trim().min(1, "Name is required").max(200),
  companyName: z.string().trim().min(1, "Company name is required").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const selectCompanySchema = z.object({
  loginToken: z.string().min(1, "loginToken is required"),
  companyId: z.uuid("companyId must be a valid id"),
});

export const switchCompanySchema = z.object({
  companyId: z.uuid("companyId must be a valid id"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "token is required"),
  password: passwordSchema,
});
